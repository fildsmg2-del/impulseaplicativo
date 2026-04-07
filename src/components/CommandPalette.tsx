import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Plus,
  FolderKanban,
  FileText,
  Wrench,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<{
    clients: any[];
    projects: any[];
    serviceOrders: any[];
  }>({
    clients: [],
    projects: [],
    serviceOrders: [],
  });
  const navigate = useNavigate();
  const { logout } = useAuth();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (search.length < 2) {
      setResults({ clients: [], projects: [], serviceOrders: [] });
      return;
    }

    const timer = setTimeout(async () => {
      const [clientsRes, projectsRes, soRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name")
          .ilike("name", `%${search}%`)
          .limit(5),
        supabase
          .from("projects")
          .select("id, client:clients(name)")
          .or(`status.ilike.%${search}%`) // Simplified search for projects
          .limit(5),
        supabase
          .from("service_orders")
          .select("id, service_type, client:clients(name)")
          .ilike("service_type", `%${search}%`)
          .limit(5),
      ]);

      setResults({
        clients: clientsRes.data || [],
        projects: projectsRes.data || [],
        serviceOrders: soRes.data || [],
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="O que você está procurando? (Ctrl+K)" 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        {/* Rapid Navigation */}
        <CommandGroup heading="Navegação Geral">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/projects"))}>
            <FolderKanban className="mr-2 h-4 w-4" />
            <span>Projetos</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/clients"))}>
            <Users className="mr-2 h-4 w-4" />
            <span>Clientes</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/financial"))}>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Financeiro</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Dynamic Search Results */}
        {results.clients.length > 0 && (
          <CommandGroup heading="Clientes">
            {results.clients.map((client) => (
              <CommandItem
                key={client.id}
                onSelect={() => runCommand(() => navigate(`/clients?id=${client.id}`))}
              >
                <User className="mr-2 h-4 w-4" />
                <span>{client.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.projects.length > 0 && (
          <CommandGroup heading="Projetos">
            {results.projects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => runCommand(() => navigate(`/projects?id=${project.id}`))}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>Projeto - {(project.client as any)?.name || 'N/A'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.serviceOrders.length > 0 && (
          <CommandGroup heading="Ordens de Serviço">
            {results.serviceOrders.map((so) => (
              <CommandItem
                key={so.id}
                onSelect={() => runCommand(() => navigate(`/service-orders?id=${so.id}`))}
              >
                <Wrench className="mr-2 h-4 w-4" />
                <span>{so.service_type} - {(so.client as any)?.name || 'N/A'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        
        <CommandGroup heading="Ações Rápidas">
          <CommandItem onSelect={() => runCommand(() => navigate("/clients?new=true"))}>
            <Plus className="mr-2 h-4 w-4 text-success" />
            <span>Novo Cliente</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/quotes?new=true"))}>
            <Plus className="mr-2 h-4 w-4 text-success" />
            <span>Novo Orçamento</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => logout())}>
            <LogOut className="mr-2 h-4 w-4 text-destructive" />
            <span>Sair do Sistema</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
