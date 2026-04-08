import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, CheckCircle2, XCircle, AlertCircle, Key } from "lucide-react";
import { apiHealthService, HealthStatus } from "@/services/apiHealthService";
import { cn } from "@/lib/utils";

export function HealthBoard() {
  const [statuses, setStatuses] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const checkAll = async () => {
    setLoading(true);
    const results = await Promise.all([
      apiHealthService.checkSupabase(),
      apiHealthService.checkGoogleMaps(),
      apiHealthService.checkSolarApi(),
    ]);
    setStatuses(results);
    setLoading(false);
  };

  useEffect(() => {
    checkAll();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Activity className="h-5 w-5 text-impulse-gold" />
          Status das Integrações
        </h3>
        <Button variant="outline" size="sm" onClick={checkAll} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Recarregar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statuses.map((status) => (
          <Card key={status.service} className="border-sidebar-border bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                {status.service}
                <StatusIcon status={status.status} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <Badge 
                  variant={getBadgeVariant(status.status)}
                  className="w-fit"
                >
                  {getStatusLabel(status.status)}
                </Badge>
                {status.latency && (
                  <span className="text-xs text-muted-foreground">
                    Latência: {status.latency}ms
                  </span>
                )}
                {status.message && (
                  <span className="text-xs text-destructive truncate">
                    {status.message}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: HealthStatus['status'] }) {
  switch (status) {
    case 'online': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'offline':
    case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
    case 'key_missing': return <Key className="h-4 w-4 text-amber-500" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getBadgeVariant(status: HealthStatus['status']): any {
  switch (status) {
    case 'online': return "default";
    case 'key_missing': return "outline";
    case 'offline':
    case 'error': return "destructive";
    default: return "secondary";
  }
}

function getStatusLabel(status: HealthStatus['status']) {
  switch (status) {
    case 'online': return "Operacional";
    case 'offline': return "Indisponível";
    case 'error': return "Erro";
    case 'key_missing': return "Chave Ausente";
    default: return "Carregando...";
  }
}
