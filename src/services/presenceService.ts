import { supabase } from "@/integrations/supabase/client";

export interface UserPresence {
  userId: string;
  name: string;
  role: string;
  currentPage: string;
  currentPageLabel: string;
  joinedAt: string;
  onlineAt: string;
  avatar_url?: string;
}

const PRESENCE_CHANNEL = "user-presence";

// Maps route paths to human-readable labels
export const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "📊 Dashboard",
  "/my-area": "💼 Minha Área",
  "/agenda": "📅 Agenda",
  "/calculator": "🔢 Calculadora",
  "/funnel": "🎯 Funil de Vendas",
  "/clients": "👥 Clientes",
  "/quotes": "📄 Orçamentos",
  "/projects": "📁 Projetos",
  "/service-orders": "🔧 Ordens de Serviço",
  "/suppliers": "🏢 Fornecedores",
  "/inventory": "📦 Estoque",
  "/financial": "💰 Financeiro",
  "/financial/receivables": "💰 Contas a Receber",
  "/financial/payables": "💸 Contas a Pagar",
  "/sales": "🛒 Vendas",
  "/drone": "✈️ Drone",
  "/my-profile": "👤 Meu Perfil",
  "/employees": "👷 Funcionários",
  "/settings": "⚙️ Configurações",
  "/dev": "💻 Área DEV",
};

export function getPageLabel(path: string): string {
  // Exact match first
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  // Partial match (for nested routes)
  const match = Object.keys(PAGE_LABELS).find(
    (key) => path.startsWith(key) && key !== "/"
  );
  return match ? PAGE_LABELS[match] : `🌐 ${path}`;
}

let activeChannel: ReturnType<typeof supabase.channel> | null = null;

export const presenceService = {
  /**
   * Join the presence channel and announce the current user's state.
   */
  async join(presence: Omit<UserPresence, "joinedAt" | "onlineAt">) {
    if (activeChannel) {
      await supabase.removeChannel(activeChannel);
    }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: presence.userId } },
    });

    activeChannel = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        // Triggers re-render via subscription callback
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            ...presence,
            joinedAt: new Date().toISOString(),
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return channel;
  },

  /**
   * Update the current page for the active session.
   */
  async updatePage(currentPage: string, currentPageLabel: string) {
    if (!activeChannel) return;
    const state = activeChannel.presenceState();
    const keys = Object.keys(state);
    if (keys.length === 0) return;

    // Preserve current presence data and update page
    const current = (state[keys[0]] as any[])[0] as UserPresence;
    await activeChannel.track({
      ...current,
      currentPage,
      currentPageLabel,
      onlineAt: new Date().toISOString(),
    });
  },

  subscribeToPresence(onChange: (users: UserPresence[]) => void) {
    const channel = supabase.channel(PRESENCE_CHANNEL);

    const handlePresenceChange = () => {
      const state = channel.presenceState<UserPresence>();
      
      // Para cada chave (usuário), pode haver múltiplas abas (array de presenças).
      // Pegamos apenas a atividade (aba) mais recente daquele usuário.
      const uniqueUsers = Object.values(state).map((presences) => {
        return presences.sort(
          (a, b) => new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime()
        )[0];
      });

      // Ordena o quadro de usuários para os que tiveram interação mais recente ficarem no topo
      uniqueUsers.sort(
        (a, b) => new Date(b.onlineAt).getTime() - new Date(a.onlineAt).getTime()
      );

      onChange(uniqueUsers);
    };

    channel
      .on("presence", { event: "sync" }, handlePresenceChange)
      .on("presence", { event: "join" }, handlePresenceChange)
      .on("presence", { event: "leave" }, handlePresenceChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async leave() {
    if (activeChannel) {
      await supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  },
};
