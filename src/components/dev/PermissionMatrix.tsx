import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { permissionService, AppPermission } from "@/services/permissionService";
import { UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Info } from "lucide-react";

const ROLES: UserRole[] = ['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'TECNICO', 'POS_VENDA', 'COMPRAS', 'CONSULTOR_TEC_DRONE', 'PILOTO'];

export function PermissionMatrix() {
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<Record<UserRole, string[]>>({} as any);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPerms, ...rolePerms] = await Promise.all([
        permissionService.getAllPermissions(),
        ...ROLES.map(role => permissionService.getRolePermissions(role))
      ]);

      setPermissions(allPerms);
      
      const matrix: any = {};
      ROLES.forEach((role, idx) => {
        matrix[role] = rolePerms[idx];
      });
      setRoleMatrix(matrix);
    } catch (error) {
      console.error("Error loading permission matrix:", error);
      toast({ title: "Erro ao carregar permissões", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (role: UserRole, permissionId: string) => {
    const isEnabled = roleMatrix[role].includes(permissionId);
    try {
      await permissionService.updateRolePermission(role, permissionId, !isEnabled);
      
      setRoleMatrix(prev => ({
        ...prev,
        [role]: !isEnabled 
          ? [...prev[role], permissionId]
          : prev[role].filter(id => id !== permissionId)
      }));
      
      toast({ title: "Permissão atualizada" });
    } catch (error) {
      console.error("Error toggling permission:", error);
      toast({ title: "Erro ao salvar alteração", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
      </div>
    );
  }

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map(p => p.category)));

  return (
    <Card className="border-impulse-gold/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-impulse-gold" />
          Matriz de Permissões por Cargo
        </CardTitle>
        <CardDescription>
          Defina as permissões padrão para cada nível de cargo. 
          <span className="flex items-center gap-1 mt-1 text-amber-500/80">
            <Info className="h-3 w-3" />
            Cargo DEV tem acesso total automático.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-white/10 overflow-hidden">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow>
                <TableHead className="w-[300px]">Permissão</TableHead>
                {ROLES.map(role => (
                  <TableHead key={role} className="text-center text-[10px] sm:text-xs">
                    {role}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(category => (
                <>
                  <TableRow key={category} className="bg-white/5 border-b border-white/5">
                    <TableCell colSpan={ROLES.length + 1} className="py-2 text-[10px] font-black uppercase tracking-widest text-impulse-gold/50">
                      {category}
                    </TableCell>
                  </TableRow>
                  {permissions
                    .filter(p => p.category === category)
                    .map(perm => (
                      <TableRow key={perm.id} className="hover:bg-white/5 border-white/5">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{perm.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{perm.id}</span>
                          </div>
                        </TableCell>
                        {ROLES.map(role => (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={roleMatrix[role]?.includes(perm.id)}
                              onCheckedChange={() => handleToggle(role, perm.id)}
                              className="border-white/20 data-[state=checked]:bg-impulse-gold data-[state=checked]:text-black"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
