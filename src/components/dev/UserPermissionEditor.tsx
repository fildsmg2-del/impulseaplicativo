import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Search, ShieldAlert, X, Check, Minus, Info } from "lucide-react";
import { getUsers, UserWithRole } from "@/services/userService";
import { permissionService, AppPermission } from "@/services/permissionService";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function UserPermissionEditor() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [allUsers, allPerms] = await Promise.all([
        getUsers(),
        permissionService.getAllPermissions()
      ]);
      setUsers(allUsers);
      setPermissions(allPerms);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadUserOverrides(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUserOverrides = async (userId: string) => {
    try {
      const userOverrides = await permissionService.getUserOverrides(userId);
      const overrideMap: Record<string, boolean | null> = {};
      // Initialize all to null (follow role default)
      permissions.forEach(p => overrideMap[p.id] = null);
      // Fill with actual overrides
      userOverrides.forEach(o => overrideMap[o.permission_id] = o.enabled);
      setOverrides(overrideMap);
    } catch (error) {
      console.error("Error loading overrides:", error);
    }
  };

  const handleOverrideToggle = async (permissionId: string, value: boolean | null) => {
    if (!selectedUser) return;
    try {
      await permissionService.updateUserOverride(selectedUser.id, permissionId, value);
      setOverrides(prev => ({ ...prev, [permissionId]: value }));
      toast({ title: "Exceção salva com sucesso" });
    } catch (error) {
      console.error("Error updating override:", error);
      toast({ title: "Erro ao salvar exceção", variant: "destructive" });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-impulse-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-impulse-gold" />
            Exceções por Usuário
          </CardTitle>
          <CardDescription>
            Defina permissões específicas que ignoram o cargo padrão para um usuário selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário para editar exceções..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ScrollArea className="h-[400px] border border-white/10 rounded-md">
                <div className="p-2 space-y-1">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg text-sm transition-all flex items-center justify-between",
                        selectedUser?.id === u.id 
                          ? "bg-impulse-gold text-black font-bold" 
                          : "hover:bg-white/5 text-muted-foreground"
                      )}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate">{u.name}</p>
                        <p className="text-[10px] opacity-70">{u.role}</p>
                      </div>
                      {selectedUser?.id === u.id && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="md:col-span-2">
              {!selectedUser ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-white/5 rounded-md border border-dashed border-white/10 p-8">
                  <User className="h-12 w-12 mb-3 opacity-20" />
                  <p>Selecione um usuário para gerenciar exceções</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div>
                      <h4 className="font-bold text-impulse-gold">{selectedUser.name}</h4>
                      <p className="text-xs text-muted-foreground">{selectedUser.email} • {selectedUser.role}</p>
                    </div>
                    {selectedUser.role === 'DEV' && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/20">Acesso Total (DEV)</Badge>
                    )}
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 text-xs text-amber-500">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-widest text-[10px] mb-1">Como funciona as exceções:</p>
                      <p>Overrides substituem o acesso padrão do cargo. Se um vendedor for bloqueado aqui, ele não verá a área mesmo que o cargo dele permita.</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {permissions.map((perm) => (
                        <div key={perm.id} className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/5">
                          <div className="flex flex-col">
                            <span className="text-sm">{perm.name}</span>
                            <span className="text-[10px] text-muted-foreground">{perm.category}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-md border border-white/10">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-7 w-7 p-0",
                                overrides[perm.id] === false ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-red-500/20"
                              )}
                              onClick={() => handleOverrideToggle(perm.id, false)}
                              title="Bloquear Explicitamente"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-7 w-7 p-0",
                                overrides[perm.id] === null ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5"
                              )}
                              onClick={() => handleOverrideToggle(perm.id, null)}
                              title="Seguir Cargo"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-7 w-7 p-0",
                                overrides[perm.id] === true ? "bg-green-500 text-white" : "text-muted-foreground hover:bg-green-500/20"
                              )}
                              onClick={() => handleOverrideToggle(perm.id, true)}
                              title="Permitir Explicitamente"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
