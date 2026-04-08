import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ToggleLeft, Plus } from "lucide-react";
import { featureFlagService } from "@/services/featureFlagService";
import { ApiSetting, apiSettingsService } from "@/services/apiSettingsService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";

export function FeatureFlagManager() {
  const [flags, setFlags] = useState<ApiSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFlags = async () => {
    try {
      setLoading(true);
      const data = await featureFlagService.getAllFlags();
      setFlags(data);
    } catch (error) {
      console.error("Error loading flags:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (id: string, isEnabled: boolean) => {
    try {
      await featureFlagService.toggleFlag(id, isEnabled);
      setFlags(prev => prev.map(f => f.id === id ? { ...f, value: isEnabled ? "false" : "true" } : f));
      toast({ title: "Flag atualizada" });
    } catch (error) {
      toast({ title: "Erro ao atualizar flag", variant: "destructive" });
    }
  };

  const createInitialFlags = async () => {
    try {
      // Create a default flag for Demo
      await apiSettingsService.create({
        key: "MODULE_DRONE_ENABLED",
        value: "true",
        description: "Habilita/Desabilita o módulo de drones no menu",
        category: "feature_flag"
      });
      loadFlags();
    } catch (error) {
      toast({ title: "Erro ao criar flag inicial", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <ToggleLeft className="h-5 w-5 text-impulse-gold" />
          Feature Flags
        </h3>
        {flags.length === 0 && (
          <Button size="sm" onClick={createInitialFlags}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Flags Iniciais
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {flags.length === 0 ? (
          <Card className="border-dashed border-sidebar-border bg-transparent">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma flag de funcionalidade cadastrada.
            </CardContent>
          </Card>
        ) : (
          flags.map((flag) => (
            <Card key={flag.id} className="border-sidebar-border bg-card/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold">{flag.key}</code>
                    {flag.value === "true" ? (
                      <Badge variant="default" className="bg-green-600 text-[10px] h-4">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-4">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{flag.description}</p>
                </div>
                <Switch 
                  checked={flag.value === "true"}
                  onCheckedChange={() => handleToggle(flag.id, flag.value === "true")}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
