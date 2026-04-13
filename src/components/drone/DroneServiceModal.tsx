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
  Loader2, Save, Send, Trash2, User, MapPin, Plus as PlusIcon,
  Settings2, Activity, MessageCircle, Clock, CheckCircle2
} from 'lucide-react';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { droneLogService, DroneServiceLog } from '@/services/droneLogService';
import { clientService, Client } from '@/services/clientService';
import { getUsers, UserWithRole } from '@/services/userService';
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
import { Switch } from '@/components/ui/switch';
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
  const [clients, setClients] = useState<Client[]>([]);
  const [pilots, setPilots] = useState<UserWithRole[]>([]);
  const [isManualClient, setIsManualClient] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_phone: '',
    client_document: '',
    client_address_street: '',
    technician_id: '',
    location_link: '',
    area_hectares: '',
    service_description: ''
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Masks
  const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else {
      return v.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
    }
  };

  const maskDocument = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 11) {
      return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    } else {
      return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo navegador');
      return;
    }
    
    toast.info('Obtendo localização atual...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({ ...prev, location_link: `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}` }));
        toast.success('Localização capturada com sucesso');
      },
      (err) => {
        console.error(err);
        toast.error('Erro ao capturar localização. Verifique as permissões.');
      }
    );
  };

  const safeFormatDate = (dateStr: string | null | undefined, fmt: string = "dd/MM/yy") => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return format(date, fmt, { locale: ptBR });
    } catch (e) {
      return "-";
    }
  };

  useEffect(() => {
    if (open) {
      loadInitialData();
      if (service) {
        setStatus(service.status);
        loadLogs();
      } else {
        setStatus('PENDENTE');
        setFormData({
          client_id: '',
          client_name: '',
          client_phone: '',
          client_document: '',
          client_address_street: '',
          technician_id: '',
          location_link: '',
          area_hectares: '',
          service_description: ''
        });
        setIsManualClient(false);
      }
    }
  }, [service, open]);

  const loadInitialData = async () => {
    try {
      const [allClients, allUsers] = await Promise.all([
        clientService.getAll(),
        getUsers()
      ]);
      setClients(allClients);
      // REQUISITO: Apenas cargo PILOTO
      setPilots(allUsers.filter(u => u.role === 'PILOTO'));
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

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

  const handleCreateService = async () => {
    if (isManualClient && !formData.client_name.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }
    if (!isManualClient && !formData.client_id) {
      toast.error('Selecione um cliente');
      return;
    }

    try {
      setLoading(true);
      const newService = await droneService.create({
        client_id: isManualClient ? undefined : formData.client_id,
        client_name: isManualClient ? formData.client_name : undefined,
        client_phone: isManualClient ? formData.client_phone : undefined,
        client_document: isManualClient ? formData.client_document : undefined,
        client_address_street: isManualClient ? formData.client_address_street : undefined,
        technician_id: formData.technician_id || undefined,
        location_link: formData.location_link,
        area_hectares: parseFloat(formData.area_hectares) || undefined,
        service_description: formData.service_description || 'Serviço de Drone', // Campo obrigatório
        status: 'PENDENTE'
      });

      // Add initial log
      await droneLogService.create(
        newService.id, 
        'OS Drone criada no sistema', 
        user?.name || 'Sistema'
      );

      toast.success('OS Drone criada com sucesso');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating drone service:', error);
      toast.error('Erro ao criar OS Drone');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "flex flex-col overflow-hidden p-0 gap-0 rounded-3xl transition-all duration-500",
        service ? "max-w-4xl h-[85vh]" : "max-w-2xl h-auto max-h-[90vh]"
      )}>
        {service ? (
          <>
            <div className="p-6 bg-muted/30 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">OS Drone {service.display_code || (service.id ? `#${service.id.slice(0, 8)}` : '---')}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-background/50 font-medium">
                      {service.client?.name || service.client_name || 'Cliente não vinculado'}
                    </Badge>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {safeFormatDate(service.created_at, "d 'de' MMMM")}
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
                  <SelectItem value="TECNICO">Em Campo (Técnico)</SelectItem>
                  <SelectItem value="REVISAO">Revisão</SelectItem>
                  <SelectItem value="FINALIZADO">Finalizado</SelectItem>
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
                    <p className="text-sm font-bold text-foreground">{service.client?.name || service.client_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {service.client?.name ? 'Cliente vinculado ao sistema' : 'Cliente inserido manualmente'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                    <MapPin className="h-4 w-4" />
                    <span>Localização</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-xs text-foreground leading-relaxed italic">
                      {service.location_link || 'Localização não informada'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Clock className="h-4 w-4" />
                    <span>Responsável</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-sm font-bold text-foreground">
                      {service.technician?.name || 'Não atribuído'}
                    </p>
                    <p className="text-xs text-muted-foreground">Piloto Operador</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                    <Settings2 className="h-4 w-4" />
                    <span>Detalhes Técnicos</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Área:</span>
                      <span className="font-bold text-foreground">{service.area_hectares || 'N/A'} ha</span>
                    </div>
                    <div className="h-px bg-border/50" />
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-medium">Descrição:</span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {service.service_description || 'Sem descrição.'}
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
          </>
        ) : (
          <div className="flex flex-col p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-[22px] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <PlusIcon className="h-7 w-7" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Nova OS Drone</DialogTitle>
                <p className="text-sm text-muted-foreground font-medium">Preencha os dados básicos para iniciar o serviço</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-4 p-5 bg-muted/30 rounded-[32px] border border-border/50">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground/80">Identificação do Cliente</Label>
                  <div className="flex items-center gap-3 bg-background/50 px-3 py-1.5 rounded-full border border-border shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Manual</span>
                    <Switch 
                      checked={isManualClient}
                      onCheckedChange={setIsManualClient}
                      className="scale-90 data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                {isManualClient ? (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <Input 
                      placeholder="Nome completo do cliente..."
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        placeholder="Telefone (WhatsApp)"
                        value={formData.client_phone}
                        onChange={(e) => setFormData({ ...formData, client_phone: maskPhone(e.target.value) })}
                        className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20"
                      />
                      <Input 
                        placeholder="CPF ou CNPJ"
                        value={formData.client_document}
                        onChange={(e) => setFormData({ ...formData, client_document: maskDocument(e.target.value) })}
                        className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20"
                      />
                    </div>
                    <Input 
                      placeholder="Endereço completo"
                      value={formData.client_address_street}
                      onChange={(e) => setFormData({ ...formData, client_address_street: e.target.value })}
                      className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20"
                    />
                  </div>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Select 
                      value={formData.client_id}
                      onValueChange={(val) => setFormData({ ...formData, client_id: val })}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-background border-border">
                        <SelectValue placeholder="Selecione um cliente do sistema" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id} className="rounded-xl">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Piloto Responsável</Label>
                <Select 
                  value={formData.technician_id}
                  onValueChange={(val) => setFormData({ ...formData, technician_id: val })}
                >
                  <SelectTrigger className="h-12 rounded-2xl border-border bg-card">
                    <SelectValue placeholder="Selecionar Piloto" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {pilots.map(p => (
                      <SelectItem key={p.id} value={p.id} className="rounded-xl">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Área (ha)</Label>
                <div className="relative group">
                  <Settings2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="Ex: 50.5"
                    value={formData.area_hectares}
                    onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                    className="h-12 pl-12 rounded-2xl border-border bg-card"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Localização</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGetLocation}
                    className="h-7 px-2 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    CAPTURAR GPS
                  </Button>
                </div>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Endereço ou coordenadas..."
                    value={formData.location_link}
                    onChange={(e) => setFormData({ ...formData, location_link: e.target.value })}
                    className="h-12 pl-12 rounded-2xl border-border bg-card"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Descrição do Serviço</Label>
                <Textarea 
                  placeholder="Instruções para o piloto ou detalhes do serviço..."
                  value={formData.service_description}
                  onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                  className="min-h-[100px] rounded-3xl border-border bg-card resize-none p-4"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-2xl font-bold border-border hover:bg-muted"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateService}
                className="flex-[2] h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Criar OS Drone
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
