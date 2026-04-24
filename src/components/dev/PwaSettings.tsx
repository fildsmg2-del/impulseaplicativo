import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Download, Globe, WifiOff, ShieldCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { apiSettingsService, ApiSetting } from "@/services/apiSettingsService";
import { featureFlagService } from "@/services/featureFlagService";
import { useToast } from "@/hooks/use-toast";

export function PwaSettings() {
  const [flag, setFlag] = useState<ApiSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFlag = async () => {
    try {
      setLoading(true);
      const flags = await featureFlagService.getAllFlags();
      const pwaFlag = flags.find(f => f.key === "MODULE_PWA_ENABLED");
      setFlag(pwaFlag || null);
    } catch (error) {
      console.error("Error loading PWA flag:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlag();
  }, []);

  const handleToggle = async (isEnabled: boolean) => {
    if (!flag) return;
    try {
      await featureFlagService.toggleFlag(flag.id, isEnabled);
      setFlag({ ...flag, value: isEnabled ? "false" : "true" });
      toast({ 
        title: isEnabled ? "PWA Desativado" : "PWA Ativado",
        description: isEnabled ? "A instalação foi removida." : "A instalação foi habilitada para todos os usuários.",
      });
    } catch (error) {
      toast({ title: "Erro ao atualizar PWA", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* status Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Modo Mobile</p>
                <p className="text-lg font-bold">Instalável</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Persistência</p>
                <p className="text-lg font-bold">Offline Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Segurança</p>
                <p className="text-lg font-bold">Standalone</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                Controle Mestre do PWA
                {flag?.value === 'true' ? (
                  <Badge variant="default" className="bg-emerald-600 animate-pulse">ATIVO</Badge>
                ) : (
                  <Badge variant="secondary">INATIVO</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Ative para permitir que usuários instalem o Impulse no Android, iOS ou Desktop e utilizem offline.
              </CardDescription>
            </div>
            <Switch 
              checked={flag?.value === 'true'}
              onCheckedChange={() => handleToggle(flag?.value === 'true')}
              disabled={loading || !flag}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="pt-4 border-t space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> Configurações de Identidade
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Nome de Exibição</span>
                  <span className="font-medium">Impulse Energia</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">URL Inicial</span>
                  <code className="text-[10px] bg-muted p-1 rounded">/dashboard</code>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block">Ícone do Aplicativo</span>
                  <div className="w-20 h-20 rounded-2xl bg-sidebar-accent border flex items-center justify-center p-2">
                    <img src="/pwa-icon.png" alt="Icon" className="w-full h-full object-contain rounded-lg shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
              <RefreshCw className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-500">Nota sobre Sincronização</p>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                  Quando você ativa o PWA, os navegadores dos usuários detectarão o manifesto automaticamente. 
                  Para forçar uma atualização técnica (recarga compulsória) para todos, você pode usar o módulo de 
                  <strong> Comunicados</strong> para disparar uma notificação de "Nova Versão Disponível".
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-[10px] text-center text-muted-foreground tracking-widest uppercase">
        Infraestrutura baseada em Vite PWA & Capacitor Core
      </p>
    </div>
  );
}
