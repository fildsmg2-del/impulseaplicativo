import { useEffect, useState } from "react";
import { presenceService, UserPresence } from "@/services/presenceService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, RefreshCw, Send, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { directMessageService } from "@/services/directMessageService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ROLE_COLORS: Record<string, string> = {
  MASTER: "bg-red-500/20 text-red-400 border-red-500/40",
  DEV: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  FINANCEIRO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  ENGENHEIRO: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  VENDEDOR: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  TECNICO: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  COMPRAS: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  POS_VENDA: "bg-pink-500/20 text-pink-400 border-pink-500/40",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(userId: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-cyan-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-700",
  ];
  const idx = userId.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function UserPresenceBoard() {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user: myUser } = useAuth();
  
  // Direct Message states
  const [selectedUser, setSelectedUser] = useState<UserPresence | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsubscribe = presenceService.subscribeToPresence((activeUsers) => {
      setUsers(activeUsers);
      setLastUpdated(new Date());
    });
    return () => unsubscribe();
  }, [refreshKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSendMessage = async () => {
    if (!myUser || !selectedUser || !messageText.trim()) return;
    
    setIsSending(true);
    try {
      await directMessageService.sendMessage({
        fromUserId: myUser.id,
        fromUserName: myUser.name,
        toUserId: selectedUser.userId,
        message: messageText.trim(),
        timestamp: new Date().toISOString()
      });
      toast.success(`Mensagem enviada para ${selectedUser.name}!`);
      setSelectedUser(null);
      setMessageText("");
    } catch (err) {
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-sm text-muted-foreground">
            Atualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: ptBR })}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 text-muted-foreground hover:text-primary transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-1.5">
          <Users className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500">
            {users.length} {users.length === 1 ? "usuário online" : "usuários online"}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {users.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Nenhum usuário online no momento</p>
          <p className="text-sm mt-1 opacity-70">
            Os usuários aparecerão aqui quando estiverem com o sistema aberto.
          </p>
        </div>
      )}

      {/* User cards grid */}
      {users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.userId}
              className="relative bg-card border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 hover:shadow-md group overflow-hidden"
            >
              {/* Online indicator stripe */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColor(
                    user.userId
                  )} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg overflow-hidden border border-white/10`}
                >
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name + role */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-2 py-0 h-5 ${
                        ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </Badge>
                  </div>

                  {/* Current page */}
                  <div className="mt-1.5 flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-medium text-foreground/80 truncate">
                      {user.currentPageLabel}
                    </span>
                  </div>

                  {/* Online duration */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Online{" "}
                        {formatDistanceToNow(new Date(user.joinedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {myUser?.id !== user.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 hover:bg-impulse-gold/10 hover:text-impulse-gold"
                        onClick={() => setSelectedUser(user)}
                      >
                        <MessageSquare className="h-3.5 w-3.5 mr-1" />
                        Avisar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground/50">
        Os dados são atualizados em tempo real via Supabase Realtime Presence.
        Nenhuma informação é armazenada no banco de dados.
      </p>

      {/* DM Modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md glassmorphism border-white/10">
          <DialogHeader>
            <DialogTitle>Enviar mensagem para {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Mensagem em tempo-real. Funciona como um aviso direto e não é salvo no banco de dados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Digite seu aviso..."
              className="min-h-[100px] resize-none bg-white/5 border-white/10 focus:border-impulse-gold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedUser(null)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button 
              onClick={handleSendMessage} 
              disabled={!messageText.trim() || isSending}
              className="gradient-gold text-impulse-dark"
            >
              {isSending ? "Enviando..." : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
