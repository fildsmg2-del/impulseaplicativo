import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, Save, Send, Trash2, User, MapPin, 
  Settings2, Activity, MessageCircle, Clock, CheckCircle2
} from 'lucide-react';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { droneLogService, DroneServiceLog } from '@/services/droneLogService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DroneServiceModalProps {
  service: DroneService | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function DroneServiceModal({ service, open, onOpenChange, onSave }: DroneServiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DroneServiceLog[]>([]);
  const [newLog, setNewLog] = useState('');
  const [status, setStatus] = useState<DroneServiceStatus>('PENDENTE');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (service && open) {
      setStatus(service.status);
      loadLogs();
    }
  }, [service, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const loadLogs = async () => {
    if (!service) return;
    try {
      const data = await droneLogService.getByServiceId(service.id);
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const handleStatusChange = async (newStatus: DroneServiceStatus) => {
    if (!service) return;
    try {
      await droneService.updateStatus(service.id, newStatus);
      setStatus(newStatus);
      
      // Auto-log status change
      await droneLogService.create(
        service.id, 
        `Alterou status para: ${newStatus}`, 
        user?.name || 'Sistema'
      );
      
      loadLogs();
      toast.success('Status atualizado');
      onSave();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAddLog = async () => {
    if (!service || !newLog.trim()) return;
    try {
      await droneLogService.create(service.id, newLog.trim(), user?.name || 'Usuário');
      setNewLog('');
      loadLogs();
      toast.success('Comentário registrado');
    } catch (error) {
      console.error('Error adding log:', error);
      toast.error('Erro ao adicionar comentário');
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden p-0 gap-0 rounded-3xl">
        <div className="p-6 bg-muted/30 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">OS Drone #{service.id.slice(0, 8)}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="bg-background/50 font-medium">
                  {service.client?.name || 'Cliente não vinculado'}
                </Badge>
                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                <span className="text-xs text-muted-foreground font-medium">
                  {format(new Date(service.created_at), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
          
          <Select 
            value={status} 
            onValueChange={(val) => handleStatusChange(val as DroneServiceStatus)}
          >
            <SelectTrigger className={cn(
              "w-[180px] h-10 font-bold border-2 transition-all",
              status === 'PENDENTE' && "border-amber-500/30 text-amber-600 bg-amber-50",
              status === 'EM_ANALISE' && "border-blue-500/30 text-blue-600 bg-blue-50",
              status === 'CONCLUIDA' && "border-green-500/30 text-green-600 bg-green-50",
              status === 'CANCELADA' && "border-red-500/30 text-red-600 bg-red-50"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
              <SelectItem value="CONCLUIDA">Concluída</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left: Info */}
          <div className="w-1/3 border-r border-border p-6 space-y-6 overflow-y-auto bg-muted/5">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                <User className="h-4 w-4" />
                <span>Dados do Cliente</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{service.client?.name || 'N/A'}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Cliente vinculado à OS</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                <MapPin className="h-4 w-4" />
                <span>Localização</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                <p className="text-xs text-foreground leading-relaxed italic">
                  {service.location || 'Localização não informada'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                <Settings2 className="h-4 w-4" />
                <span>Detalhes Técnicos</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Potência:</span>
                  <span className="font-bold text-foreground">{service.power_kwp || 'N/A'} kWp</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-medium">Anotações:</span>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {service.notes || 'Sem anotações adicionais.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Logs/Activities (Chat Style) */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Histórico de Atividades</span>
              <Badge variant="secondary" className="ml-auto bg-muted text-muted-foreground font-bold">
                {logs.length}
              </Badge>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
            >
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-50">
                  <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
                    <Clock className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">Inicie o histórico de atividades</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id}
                    className={cn(
                      "flex flex-col gap-1 max-w-[80%]",
                      log.created_by === user?.id ? "ml-auto items-end" : "items-start"
                    )}
                  >
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        {log.created_by_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 italic">
                        {format(new Date(log.created_at), "HH:mm")}
                      </span>
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      log.created_by === user?.id 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted border border-border rounded-tl-none font-medium text-foreground"
                    )}>
                      {log.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-muted/20">
              <div className="flex items-center gap-2 bg-background rounded-2xl p-2 border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Input 
                  placeholder="Digitar nova atualização..."
                  value={newLog}
                  onChange={(e) => setNewLog(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                  className="flex-1 border-none focus-visible:ring-0 bg-transparent text-sm h-10"
                />
                <Button 
                  onClick={handleAddLog}
                  disabled={!newLog.trim()}
                  className="rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all shrink-0"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
