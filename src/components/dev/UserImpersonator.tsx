import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Target, LogOut, User as UserIcon } from "lucide-react";
import { getUsers, UserWithRole } from "@/services/userService";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function UserImpersonator() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { user, realUser, impersonate, stopImpersonating } = useAuth();
  const { toast } = useToast();

  const isImpersonating = user?.id !== realUser?.id;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleImpersonate = async (target: UserWithRole) => {
    await impersonate({
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      avatar_url: target.avatar_url || undefined,
      created_at: target.created_at,
      permissions: [], // Base permissions, will be updated by impersonate fetch
    });
    toast({ title: `Simulando agora como ${target.name}` });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(u => u.id !== realUser?.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Target className="h-5 w-5 text-impulse-gold" />
          Simulador de Perfis
        </h3>
        {isImpersonating && (
          <Button variant="destructive" size="sm" onClick={stopImpersonating}>
            <LogOut className="h-4 w-4 mr-2" />
            Parar Simulação
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status Atual</CardTitle>
          <CardDescription>
            {isImpersonating ? (
              <span className="flex items-center gap-2 text-amber-500 font-medium animate-pulse">
                <Target className="h-4 w-4" />
                Simulando: {user?.name} ({user?.role})
              </span>
            ) : (
              "Usando seu perfil real de Desenvolvedor"
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário para simular..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[300px] border rounded-md">
        <div className="p-4 space-y-2">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-4">Carregando usuários...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Nenhum usuário encontrado.</p>
          ) : (
            filteredUsers.map((u) => (
              <div 
                key={u.id}
                className="flex items-center justify-between p-3 bg-card hover:bg-accent/50 rounded-lg border transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleImpersonate(u)}
                  >
                    Simular
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
