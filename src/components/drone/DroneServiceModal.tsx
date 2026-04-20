import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Loader2, Save, Trash2, User, MapPin, Plus as PlusIcon,
  Settings2, Activity, MessageCircle, Send, Paperclip, FileDown, Upload, X,
  ArrowUpCircle, ArrowDownCircle, DollarSign, ExternalLink, CheckCircle2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { storageService } from '@/services/storageService';
import { serviceOrderService } from '@/services/serviceOrderService';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { droneLogService } from '@/services/droneLogService';
import { clientService } from '@/services/clientService';
import { transactionService, CreateTransactionData } from '@/services/transactionService';
import { TransactionFormModal } from '@/components/financial/TransactionFormModal';
import { getCompanySettings } from '@/services/companySettingsService';
import { generateDroneServicePDF } from '@/utils/dronePdfGenerator';
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
import { format, isValid } from 'date-fns';
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
  const [newLog, setNewLog] = useState('');
  const [status, setStatus] = useState<DroneServiceStatus>('PENDENTE');
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_phone: '',
    client_document: '',
    client_address_street: '',
    technician_id: '',
    location_link: '',
    area_hectares: '',
    service_description: '',
    negotiated_conditions: '',
    opening_date: '',
    execution_date: '',
    estimated_start_date: '',
    estimated_completion_date: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionModal, setTransactionModal] = useState<{ open: boolean; type: 'RECEITA' | 'DESPESA' }>({ open: false, type: 'RECEITA' });
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedTargetRole, setSelectedTargetRole] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [sendingToRole, setSendingToRole] = useState(false);

  // Cargos disponíveis para envio
  const OS_ROLE_OPTIONS: { role: string; label: string; description: string }[] = [
    { role: 'VENDEDOR',   label: 'Vendedor',        description: 'Setor de Vendas' },
    { role: 'ENGENHEIRO', label: 'Engenheiro',       description: 'Engenharia / Projetos' },
    { role: 'PILOTO',     label: 'Piloto',           description: 'Equipe de Drone (selecione o piloto)' },
    { role: 'FINANCEIRO', label: 'Financeiro',       description: 'Setor Financeiro' },
    { role: 'POS_VENDA',  label: 'Pós-Venda',        description: 'Pós-Venda e Suporte' },
    { role: 'COMPRAS',    label: 'Compras',          description: 'Setor de Compras' },
  ];

  const isTechnicianSelected = selectedTargetRole === 'PILOTO';
  const canConfirmSend = Boolean(selectedTargetRole) && (!isTechnicianSelected || Boolean(selectedAssigneeId));

  const isPilot = user?.role === 'PILOTO';
  const canSeeNegotiated = ['MASTER', 'DEV', 'FINANCEIRO', 'CONSULTOR_TEC_DRONE'].includes(user?.role || '');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Data fetching with React Query for reliability and cache reuse
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getAll,
    enabled: open
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: open
  });

  const pilots = useMemo(() => allUsers.filter(u => u.role === 'PILOTO'), [allUsers]);

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['drone-service-logs', service?.id],
    queryFn: () => droneLogService.getByServiceId(service!.id),
    enabled: open && !!service?.id
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
    enabled: open
  });

  const { data: financialSummary, refetch: refetchFinance } = useQuery({
    queryKey: ['drone-service-finance-summary', service?.id],
    queryFn: () => transactionService.getSummary({ drone_service_id: service!.id }),
    enabled: open && !!service?.id
  });

  const { data: transactions = [], refetch: refetchTransactions } = useQuery({
    queryKey: ['drone-service-transactions', service?.id],
    queryFn: () => transactionService.getAll({ drone_service_id: service!.id }),
    enabled: open && !!service?.id
  });

  // Masks and Utility functions
  const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    return v.replace(/^(\d{2})(\d{4})(\d{4}).*/, "($1) $2-$3");
  };

  const maskDocument = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 11) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
    return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
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
    } catch (e) { return "-"; }
  };

  useEffect(() => {
    if (open) {
      if (service) {
        setStatus(service.status);
        const parseDate = (d: string | null | undefined) => {
          if (!d) return '';
          try {
            const date = new Date(d.includes('T') ? d : d + 'T00:00:00');
            return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
          } catch (e) { return ''; }
        };

        setFormData({
          client_id: service.client_id || '',
          client_name: service.client?.name || service.client_name || '',
          client_phone: service.client_phone || '',
          client_document: service.client_document || '',
          client_address_street: service.client_address_street || '',
          technician_id: service.technician_id || '',
          location_link: service.location_link || '',
          area_hectares: service.area_hectares?.toString() || '',
          service_description: service.service_description || '',
          opening_date: parseDate(service.opening_date) || (service.created_at ? format(new Date(service.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
          execution_date: parseDate(service.execution_date),
          estimated_start_date: parseDate(service.estimated_start_date),
          estimated_completion_date: parseDate(service.estimated_completion_date),
          negotiated_conditions: service.negotiated_conditions || ''
        });
        setIsEditing(false);
      } else {
        setFormData({
          client_id: '',
          client_name: '',
          client_phone: '',
          client_document: '',
          client_address_street: '',
          technician_id: '',
          location_link: '',
          area_hectares: '',
          service_description: '',
          opening_date: format(new Date(), 'yyyy-MM-dd'),
          execution_date: '',
          estimated_start_date: '',
          estimated_completion_date: '',
          negotiated_conditions: ''
        });
        setIsEditing(false);
      }
    }
  }, [service, open]);

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        client_phone: selectedClient.phone || '',
        client_document: selectedClient.document || '',
        client_address_street: selectedClient.address_street || ''
      }));
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleUpdateDetails = async () => {
    if (!service) return;
    try {
      setLoading(true);
      await droneService.update(service.id, {
        area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null,
        location_link: formData.location_link || null,
        service_description: formData.service_description || null,
        opening_date: formData.opening_date || null,
        execution_date: formData.execution_date || null,
        client_id: formData.client_id || null,
        client_name: formData.client_name,
        client_phone: formData.client_phone || null,
        client_document: formData.client_document || null,
        client_address_street: formData.client_address_street || null,
        negotiated_conditions: formData.negotiated_conditions || null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_completion_date: formData.estimated_completion_date || null
      });
      toast.success('Informações atualizadas');
      setIsEditing(false);
      onSave();
    } catch (error: any) {
      console.error('Error updating drone service details:', error);
      toast.error('Erro ao salvar alterações: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePilot = async (newPilotId: string) => {
    if (!service) return;
    try {
      const selectedPilot = pilots.find(p => p.id === newPilotId);
      
      // Question: should I prompt for completion date? 
      // The user wants to "perguntar ele a data prevista pra conclução" when assigning.
      // I'll add a check: if no estimated_completion_date, suggest setting one.
      
      await droneService.update(service.id, { technician_id: newPilotId });
      await droneLogService.create(service.id, `Alterou piloto designado para: ${selectedPilot?.name || 'Novo Piloto'}`, user?.name || 'Sistema');
      toast.success('Piloto atualizado');
      
      if (!formData.estimated_completion_date) {
        setIsEditing(true);
        toast.info('Por favor, informe a data prevista de conclusão.');
      }
      
      onSave();
      refetchLogs();
    } catch (error) {
      toast.error('Erro ao atualizar piloto');
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    if (!confirm('Tem certeza que deseja excluir permanentemente esta OS Drone?')) return;
    try {
      setLoading(true);
      await droneService.delete(service.id);
      toast.success('OS Drone excluída');
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao excluir OS Drone');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToRole = async () => {
    if (!service || !selectedTargetRole) return;
    try {
      setSendingToRole(true);
      const targetRole = OS_ROLE_OPTIONS.find(r => r.role === selectedTargetRole);

      const updatePayload: Partial<DroneService> = {
        status: (selectedTargetRole === 'PILOTO' ? 'TECNICO' : 'PENDENTE') as DroneServiceStatus
      };

      if (isTechnicianSelected && selectedAssigneeId) {
        updatePayload.technician_id = selectedAssigneeId;
      }

      await droneService.update(service.id, updatePayload);

      // Log automático
      const assigneeName = isTechnicianSelected
        ? allUsers.find(u => u.id === selectedAssigneeId)?.name || 'Piloto'
        : targetRole?.label || selectedTargetRole;

      await droneLogService.create(
        service.id, 
        `OS Drone enviada para o cargo "${targetRole?.label || selectedTargetRole}"${isTechnicianSelected ? ` — Piloto: ${assigneeName}` : ''}.`,
        user?.name || 'Sistema'
      );

      toast.success(`OS Drone encaminhada para ${targetRole?.label}.`);
      setShowRoleSelector(false);
      setSelectedTargetRole(null);
      setSelectedAssigneeId('');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível enviar a OS Drone.');
    } finally {
      setSendingToRole(false);
    }
  };

  const handleStatusChange = async (newStatus: DroneServiceStatus) => {
    if (!service) return;
    try {
      await droneService.updateStatus(service.id, newStatus);
      setStatus(newStatus);
      await droneLogService.create(service.id, `Alterou status para: ${newStatus}`, user?.name || 'Sistema');
      refetchLogs();
      toast.success('Status atualizado');
      onSave();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleAddLog = async () => {
    if (!service || !newLog.trim()) return;
    try {
      await droneLogService.create(service.id, newLog.trim(), user?.name || 'Usuário');
      setNewLog('');
      refetchLogs();
      toast.success('Comentário registrado');
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    }
  };

  const handleCreateService = async () => {
    if (!formData.client_name.trim()) { toast.error('Informe o nome do cliente'); return; }

    try {
      setLoading(true);
      const newService = await droneService.create({
        client_id: formData.client_id || undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone || undefined,
        client_document: formData.client_document || undefined,
        client_address_street: formData.client_address_street || undefined,
        technician_id: formData.technician_id || undefined,
        location_link: formData.location_link || undefined,
        area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : undefined,
        service_description: formData.service_description || 'Serviço de Drone',
        status: 'PENDENTE',
        opening_date: formData.opening_date || format(new Date(), 'yyyy-MM-dd'),
        execution_date: formData.execution_date || null,
        estimated_start_date: formData.estimated_start_date || null,
        estimated_completion_date: formData.estimated_completion_date || null,
        negotiated_conditions: formData.negotiated_conditions || null,
        created_by: user?.id || null
      });

      await droneLogService.create(
        newService.id, 
        `OS Drone criada - Descrição: ${formData.service_description || 'Sem descrição'}`, 
        user?.name || 'Sistema'
      );
      
      // Note: We can't easily use hooks inside async functions, so we rely on the onSave refetch passed as prop
      
      toast.success('OS Drone criada com sucesso');
      onSave(); // This is the refetch function from parent
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating drone service:', error);
      toast.error('Erro ao criar OS Drone: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "bg-background border-border overflow-hidden p-0 rounded-3xl flex flex-col",
        service ? "max-w-4xl h-[95vh] md:h-[85vh]" : "max-w-2xl h-[90vh] md:h-[85vh]"
      )}>
        {service ? (
          <Tabs defaultValue="info" className="w-full h-full flex flex-col">
            <div className="p-6 border-b border-border/50 bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <DialogTitle className="text-xl font-bold">OS Drone {service.display_code || `#${service.id.slice(0, 8)}`}</DialogTitle>
                      <Select 
                        value={status} 
                        onValueChange={(val) => handleStatusChange(val as DroneServiceStatus)}
                      >
                        <SelectTrigger className="h-7 w-fit px-3 text-[10px] font-black uppercase tracking-widest rounded-lg border-primary/20 bg-primary/5 text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border shadow-2xl">
                          <SelectItem value="PENDENTE" className="text-[10px] font-bold uppercase">Pendente</SelectItem>
                          <SelectItem value="TECNICO" className="text-[10px] font-bold uppercase">Técnico</SelectItem>
                          <SelectItem value="REVISAO" className="text-[10px] font-bold uppercase">Revisão</SelectItem>
                          <SelectItem value="FINALIZADO" className="text-[10px] font-bold uppercase">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {service.client?.name || service.client_name || 'Cliente não identificado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TabsList className="bg-muted/50 p-1 h-10 rounded-xl">
                    <TabsTrigger value="info" className="rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider">Geral</TabsTrigger>
                    {canSeeNegotiated && (
                      <TabsTrigger value="financial" className="rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider">Financeiro</TabsTrigger>
                    )}
                    <TabsTrigger value="history" className="rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider">Histórico</TabsTrigger>
                    <TabsTrigger value="attachments" className="rounded-lg px-4 h-8 text-xs font-bold uppercase tracking-wider flex gap-2"><Paperclip className="h-3 w-3" /> Anexos</TabsTrigger>
                  </TabsList>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => generateDroneServicePDF(service, companySettings, user?.role, financialSummary)} 
                    className="rounded-xl h-10 w-10 hover:bg-muted/50 text-primary"
                    title="Baixar PDF"
                  >
                    <FileDown className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl h-10 w-10 hover:bg-muted/50"><X className="h-5 w-5" /></Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="info" className="m-0 h-full overflow-y-auto">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 space-y-6">
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
                          <p className="text-xs text-foreground leading-relaxed italic">{service.location_link || 'Localização não informada'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Piloto Operador</p>
                            <Select 
                              value={service.technician_id || ''} 
                              onValueChange={handleUpdatePilot}
                              disabled={isPilot}
                            >
                              <SelectTrigger className={cn(
                                "h-7 p-0 border-none bg-transparent shadow-none hover:bg-transparent focus:ring-0 text-sm font-bold text-foreground",
                                isPilot && "opacity-50 cursor-not-allowed"
                              )}>
                                <SelectValue placeholder="Não atribuído" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-2xl border-border">
                                {pilots.map(p => (
                                  <SelectItem key={p.id} value={p.id} className="rounded-xl">{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
                            <Settings2 className="h-4 w-4" />
                            <span>Detalhes Técnicos</span>
                          </div>
                          {(!isEditing && !isPilot) && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 px-2 text-[10px] font-bold text-primary hover:bg-primary/10">EDITAR</Button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1 col-span-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Área (ha)</Label>
                                <Input type="number" value={formData.area_hectares} onChange={(e) => setFormData({...formData, area_hectares: e.target.value})} className="h-8 text-xs rounded-xl" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data Abertura</Label>
                                <Input type="date" value={formData.opening_date} onChange={(e) => setFormData({...formData, opening_date: e.target.value})} className="h-8 text-xs rounded-xl" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Data Execução</Label>
                                <Input type="date" value={formData.execution_date} onChange={(e) => setFormData({...formData, execution_date: e.target.value})} className="h-8 text-xs rounded-xl" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">GPS / Localização</Label>
                              <Input value={formData.location_link} onChange={(e) => setFormData({...formData, location_link: e.target.value})} className="h-8 text-xs rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Previsão Início</Label>
                                <Input type="date" value={formData.estimated_start_date} onChange={(e) => setFormData({...formData, estimated_start_date: e.target.value})} className="h-8 text-xs rounded-xl" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Previsão Conclusão</Label>
                                <Input type="date" value={formData.estimated_completion_date} onChange={(e) => setFormData({...formData, estimated_completion_date: e.target.value})} className="h-8 text-xs rounded-xl" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</Label>
                              <Textarea value={formData.service_description} onChange={(e) => setFormData({...formData, service_description: e.target.value})} className="min-h-[80px] text-xs rounded-xl p-2" />
                            </div>
                            {canSeeNegotiated && (
                              <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-primary">Condições Negociadas</Label>
                                <Textarea value={formData.negotiated_conditions} onChange={(e) => setFormData({...formData, negotiated_conditions: e.target.value})} className="min-h-[80px] text-xs rounded-xl p-2 border-primary/20" />
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button onClick={handleUpdateDetails} disabled={loading} className="flex-1 h-8 text-xs font-bold rounded-xl">{loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'SALVAR'}</Button>
                              <Button variant="outline" onClick={() => setIsEditing(false)} className="h-8 text-xs font-bold rounded-xl">CANCELAR</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Área:</span>
                              <span className="font-bold text-foreground">{service.area_hectares || 'N/A'} ha</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Abertura:</span>
                              <span className="font-bold text-foreground">{safeFormatDate(service.opening_date, "dd/MM/yyyy")}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Execução:</span>
                              <span className="font-bold text-foreground">{service.execution_date ? safeFormatDate(service.execution_date, "dd/MM/yyyy") : "Pendente"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Prev. Início:</span>
                              <span className="font-bold text-foreground">{service.estimated_start_date ? safeFormatDate(service.estimated_start_date, "dd/MM/yyyy") : "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">Prev. Conclusão:</span>
                              <span className="font-bold text-foreground">{service.estimated_completion_date ? safeFormatDate(service.estimated_completion_date, "dd/MM/yyyy") : "N/A"}</span>
                            </div>
                            <div className="h-px bg-border/50" />
                            <div className="space-y-2">
                              <span className="text-xs text-muted-foreground font-medium">Descrição:</span>
                              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{service.service_description || 'Sem descrição.'}</p>
                            </div>
                            {canSeeNegotiated && service.negotiated_conditions && (
                              <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Condições Negociadas:</span>
                                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{service.negotiated_conditions}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {!isPilot && (
                        <div className="pt-4 mt-auto border-t border-border">
                          <Button variant="ghost" onClick={handleDelete} disabled={loading} className="w-full rounded-2xl text-destructive hover:bg-destructive/10 h-10 text-xs font-bold">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir OS Drone
                          </Button>
                        </div>
                      )}

                      {service && ['MASTER', 'DEV', 'ENGENHEIRO'].includes(user?.role || '') && (
                        <div className="pt-2">
                          <AlertDialog
                            open={showRoleSelector}
                            onOpenChange={(next) => {
                              setShowRoleSelector(next);
                              if (!next) { setSelectedTargetRole(null); setSelectedAssigneeId(''); }
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="secondary"
                                disabled={sendingToRole}
                                className="w-full h-10 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-xs"
                              >
                                {sendingToRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                ENVIAR PARA CARGO
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md z-[200]">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Enviar OS Drone para qual cargo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Selecione o cargo de destino para esta ordem de serviço.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <div className="py-4 space-y-2">
                                {OS_ROLE_OPTIONS.map(({ role, label, description }) => (
                                  <button
                                    key={role}
                                    onClick={() => { setSelectedTargetRole(role); setSelectedAssigneeId(''); }}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                                      selectedTargetRole === role
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-700'
                                        : 'border-border hover:bg-muted'
                                    }`}
                                  >
                                    <div>
                                      <p className="font-medium">{label}</p>
                                      <p className="text-xs text-muted-foreground">{description}</p>
                                    </div>
                                    {selectedTargetRole === role && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                                  </button>
                                ))}

                                {isTechnicianSelected && (
                                  <div className="mt-3 space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                      <User className="h-3 w-3 inline mr-1" />Piloto responsável
                                    </Label>
                                    <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                                      <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="Selecione um piloto" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[210]">
                                        {pilots.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">Obrigatório para envio ao piloto.</p>
                                  </div>
                                )}
                              </div>

                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => { setSelectedTargetRole(null); setSelectedAssigneeId(''); }}>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleSendToRole}
                                  disabled={!canConfirmSend || sendingToRole}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {sendingToRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                  Confirmar Envio
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-6">
                       <div className="bg-muted/30 rounded-3xl border border-border/50 overflow-hidden flex flex-col h-[500px]">
                          <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4 text-primary" />
                              <span className="text-xs font-black uppercase tracking-widest">Chat da OS</span>
                            </div>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">{logs.length}</Badge>
                          </div>
                          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                            <div className="space-y-4">
                              {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-20 gap-3">
                                  <Activity className="h-10 w-10 opacity-20" />
                                  <p className="text-xs font-bold uppercase tracking-tighter">Nenhuma atividade</p>
                                </div>
                              ) : (
                                logs.map((log) => (
                                  <div key={log.id} className={cn("flex flex-col gap-1 max-w-[85%]", log.created_by === user?.id ? "ml-auto items-end" : "items-start")}>
                                    <div className="flex items-center gap-2 px-1">
                                      <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{log.created_by_name}</span>
                                      <span className="text-[8px] text-muted-foreground/40">{safeFormatDate(log.created_at, "HH:mm")}</span>
                                    </div>
                                    <div className={cn("p-3 rounded-2xl text-xs shadow-sm shadow-black/5", log.created_by === user?.id ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none text-foreground")}>{log.message || (log as any).description}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                          <div className="p-4 border-t border-border bg-muted/20">
                            <div className="flex items-center gap-2 bg-background rounded-2xl p-1.5 border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-inner">
                              <Input placeholder="Escreva uma mensagem..." value={newLog} onChange={(e) => setNewLog(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLog()} className="flex-1 border-none focus-visible:ring-0 bg-transparent text-xs h-9" />
                              <Button onClick={handleAddLog} disabled={!newLog.trim()} size="sm" className="rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"><Send className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="m-0 h-full overflow-hidden flex flex-col">
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Total Recebido</span>
                         <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                       </div>
                       <p className="text-2xl font-black text-emerald-600">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((financialSummary?.totalReceitas || 0) + (financialSummary?.receitasPendentes || 0))}
                       </p>
                       <div className="flex items-center gap-1.5 pt-1">
                          <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter px-1 h-3.5 border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary?.totalReceitas || 0)} Pagos
                          </Badge>
                          {(financialSummary?.receitasPendentes || 0) > 0 && (
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter px-1 h-3.5 border-amber-500/20 text-amber-600 bg-amber-500/5">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.receitasPendentes)} Pendentes
                            </Badge>
                          )}
                       </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-rose-600/60">Total Gasto</span>
                         <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                       </div>
                       <p className="text-2xl font-black text-rose-600">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((financialSummary?.totalDespesas || 0) + (financialSummary?.despesasPendentes || 0))}
                       </p>
                       <div className="flex items-center gap-1.5 pt-1">
                          <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter px-1 h-3.5 border-rose-500/20 text-rose-600 bg-rose-500/5">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary?.totalDespesas || 0)} Pagos
                          </Badge>
                          {(financialSummary?.despesasPendentes || 0) > 0 && (
                            <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter px-1 h-3.5 border-amber-500/20 text-amber-600 bg-amber-500/5">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.despesasPendentes)} Pendentes
                            </Badge>
                          )}
                       </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-2">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Lucro Projetado</span>
                         <DollarSign className="h-4 w-4 text-primary" />
                       </div>
                       <p className="text-2xl font-black text-primary">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                           ((financialSummary?.totalReceitas || 0) + (financialSummary?.receitasPendentes || 0)) - 
                           ((financialSummary?.totalDespesas || 0) + (financialSummary?.despesasPendentes || 0))
                         )}
                       </p>
                       <p className="text-[9px] font-bold text-muted-foreground/60 italic">Cálculo baseado no total provisionado</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <h4 className="text-sm font-black uppercase tracking-tighter flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Lançamentos Vinculados
                    </h4>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/5"
                        onClick={() => {
                          setSelectedTransaction(null);
                          setTransactionModal({ open: true, type: 'RECEITA' });
                        }}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" /> Receita
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest border-rose-500/20 text-rose-600 hover:bg-rose-500/5"
                        onClick={() => {
                          setSelectedTransaction(null);
                          setTransactionModal({ open: true, type: 'DESPESA' });
                        }}
                      >
                        <PlusIcon className="h-3 w-3 mr-1" /> Despesa
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {transactions.length === 0 ? (
                      <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-muted/20">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhuma transação vinculada</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Registre receitas ou gastos para esta OS Drone.</p>
                      </div>
                    ) : (
                      transactions.map((tx) => (
                        <div key={tx.id} className="p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all group flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                              tx.type === 'RECEITA' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                            )}>
                              {tx.type === 'RECEITA' ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase">{tx.category}</span>
                                <span className="text-[10px] text-muted-foreground/40">•</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase">{safeFormatDate(tx.due_date, "dd/MM/yyyy")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <p className={cn(
                                "text-sm font-black",
                                tx.type === 'RECEITA' ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {tx.type === 'RECEITA' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                              </p>
                              <Badge variant="secondary" className={cn(
                                "text-[10px] font-bold uppercase tracking-tighter px-1.5 h-4 border-none",
                                tx.status === 'PAGO' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                              )}>
                                {tx.status === 'PAGO' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setTransactionModal({ open: true, type: tx.type });
                              }}
                              title="Editar Lançamento"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {transactionModal.open && (
                  <TransactionFormModal
                    open={transactionModal.open}
                    onOpenChange={(open) => {
                      setTransactionModal({ ...transactionModal, open });
                      if (!open) setSelectedTransaction(null);
                    }}
                    type={transactionModal.type}
                    transaction={selectedTransaction}
                    onSubmit={async (data, installments) => {
                      try {
                        const loadingToast = toast.loading(selectedTransaction ? 'Atualizando lançamento...' : 'Registrando lançamento...');
                        
                        if (selectedTransaction) {
                          await transactionService.update(selectedTransaction.id, data);
                        } else {
                          if (installments > 1) {
                            await transactionService.createBatch({ ...data, drone_service_id: service?.id, client_id: service?.client_id }, installments);
                          } else {
                            await transactionService.create({ ...data, drone_service_id: service?.id, client_id: service?.client_id });
                          }
                        }
                        
                        toast.dismiss(loadingToast);
                        toast.success(selectedTransaction ? 'Lançamento atualizado!' : 'Lançamento registrado!');
                        setTransactionModal({ ...transactionModal, open: false });
                        setSelectedTransaction(null);
                        refetchFinance();
                        refetchTransactions();
                      } catch (err) {
                        toast.error('Erro ao processar lançamento');
                      }
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="history" className="m-0 h-full">
                 <div className="p-6 h-full flex flex-col">
                    <div className="flex-1 bg-muted/20 rounded-[32px] border border-border/50 p-6 mb-4 flex flex-col min-h-0">
                      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                        <div className="space-y-6">
                          {logs.map((log) => (
                            <div key={log.id} className={cn("flex flex-col gap-2", log.created_by === user?.id ? "items-end" : "items-start")}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{log.created_by_name?.charAt(0)}</div>
                                <span className="text-[10px] font-bold text-muted-foreground">{log.created_by_name} • {safeFormatDate(log.created_at, "dd/MM HH:mm")}</span>
                              </div>
                              <div className={cn("max-w-[80%] p-4 rounded-3xl text-sm shadow-sm", log.created_by === user?.id ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border rounded-tl-none")}>
                                {log.message || (log as any).description}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex gap-2">
                      <Input value={newLog} onChange={(e) => setNewLog(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLog()} placeholder="Envie uma atualização..." className="h-12 rounded-2xl bg-muted/30 border-border" />
                      <Button onClick={handleAddLog} className="h-12 w-12 rounded-2xl p-0"><Send className="h-5 w-5" /></Button>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="attachments" className="m-0 h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Arquivos e Fotos</h3>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 font-black text-[10px] border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95" onClick={() => document.getElementById('file-upload-drone')?.click()}>
                    <Upload className="h-3 w-3" /> FAZER UPLOAD
                  </Button>
                  <input
                    id="file-upload-drone"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0 || !service) return;
                      
                      try {
                        setLoading(true);
                        const newAttachments = [];
                        for (const file of Array.from(files)) {
                          const folder = `drone-services/${service.id}`;
                          const result = await storageService.upload(file, folder);
                          newAttachments.push({
                            name: file.name,
                            url: result.url,
                            path: result.path,
                            type: file.type,
                            sector: 'TECNICO',
                            drone_service_id: service.id,
                            uploadedAt: new Date().toISOString()
                          });
                        }
                        await serviceOrderService.addAttachments('', newAttachments);
                        toast.success(`${newAttachments.length} anexo(s) enviado(s).`);
                        onSave();
                      } catch (err) {
                        toast.error("Falha ao enviar anexos.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </div>

                <ScrollArea className="flex-1 rounded-2xl border border-border/50 bg-muted/10 p-4">
                  {!service.attachments || service.attachments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground/30 gap-4">
                      <Paperclip className="h-12 w-12 opacity-10" />
                      <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-widest">Nenhum anexo encontrado</p>
                        <p className="text-[10px] font-medium mt-1">Envie fotos de campo ou relatórios em PDF.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {service.attachments.map((attachment) => (
                        <div key={attachment.id || attachment.url} className="group relative aspect-square rounded-2xl border border-border overflow-hidden bg-card hover:border-primary/50 transition-all shadow-sm">
                          {attachment.type?.startsWith('image/') ? (
                            <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-2">
                              {attachment.type?.includes('pdf') ? <FileDown className="h-8 w-8 text-primary/40" /> : <Paperclip className="h-8 w-8 text-muted-foreground/40" />}
                              <span className="text-[9px] text-center line-clamp-2 font-bold uppercase tracking-tighter px-2">{attachment.name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-8 w-8 rounded-full"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="destructive" 
                              className="h-8 w-8 rounded-full"
                              onClick={async () => {
                                if (!attachment.id) return;
                                try {
                                  if (attachment.path) await storageService.delete(attachment.path);
                                  await serviceOrderService.deleteAttachment(attachment.id);
                                  toast.success("Anexo removido.");
                                  onSave();
                                } catch (err) {
                                  toast.error("Erro ao remover.");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-8 border-b border-border/50 bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[22px] bg-primary/10 flex items-center justify-center text-primary shadow-inner"><PlusIcon className="h-7 w-7" /></div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight">Nova OS Drone</DialogTitle>
                  <p className="text-sm text-muted-foreground font-medium">Preencha os dados básicos para iniciar o serviço</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-6 md:pb-0">
                  <div className="col-span-2 space-y-4 p-5 bg-muted/30 rounded-[32px] border border-border/50">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground/80">Identificação do Cliente</Label>
                    </div>

                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nome do Cliente (Obrigatório)</Label>
                          <Input placeholder="Nome completo do cliente..." value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value, client_id: '' })} className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Telefone</Label>
                          <Input placeholder="(00) 00000-0000" value={formData.client_phone} onChange={(e) => setFormData({ ...formData, client_phone: maskPhone(e.target.value) })} className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">CPF/CNPJ</Label>
                          <Input placeholder="000.000.000-00" value={formData.client_document} onChange={(e) => setFormData({ ...formData, client_document: maskDocument(e.target.value) })} className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Endereço</Label>
                        <Input placeholder="Rua, Número, Bairro..." value={formData.client_address_street} onChange={(e) => setFormData({ ...formData, client_address_street: e.target.value })} className="h-12 rounded-2xl bg-background border-border focus:ring-primary/20" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Data de Abertura</Label>
                      <Input type="date" value={formData.opening_date} onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })} className="h-12 rounded-2xl bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Área (ha)</Label>
                      <div className="relative group">
                        <Settings2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input type="number" step="0.01" placeholder="Ex: 50.5" value={formData.area_hectares} onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })} className="h-12 pl-12 rounded-2xl border-border bg-card" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Piloto Responsável</Label>
                    <Select value={formData.technician_id} onValueChange={(val) => setFormData({ ...formData, technician_id: val })}>
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

                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">Localização</Label>
                      <Button variant="ghost" size="sm" onClick={handleGetLocation} className="h-7 px-2 text-[10px] font-bold text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><MapPin className="h-3 w-3 mr-1" />CAPTURAR GPS</Button>
                    </div>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-4 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input placeholder="Endereço ou coordenadas..." value={formData.location_link} onChange={(e) => setFormData({ ...formData, location_link: e.target.value })} className="h-12 pl-12 rounded-2xl border-border bg-card" />
                    </div>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Descrição do Serviço</Label>
                    <Textarea placeholder="Instruções para o piloto ou detalhes do serviço..." value={formData.service_description} onChange={(e) => setFormData({ ...formData, service_description: e.target.value })} className="min-h-[100px] rounded-3xl border-border bg-card resize-none p-4" />
                  </div>

                  {canSeeNegotiated && (
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Condições Negociadas</Label>
                      <Textarea placeholder="Detalhes financeiros ou condições especiais..." value={formData.negotiated_conditions} onChange={(e) => setFormData({ ...formData, negotiated_conditions: e.target.value })} className="min-h-[100px] rounded-3xl border-primary/20 bg-card resize-none p-4" />
                    </div>
                  )}

                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Previsão de Início</Label>
                      <Input type="date" value={formData.estimated_start_date} onChange={(e) => setFormData({ ...formData, estimated_start_date: e.target.value })} className="h-12 rounded-2xl bg-background border-border" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">Previsão de Conclusão</Label>
                      <Input type="date" value={formData.estimated_completion_date} onChange={(e) => setFormData({ ...formData, estimated_completion_date: e.target.value })} className="h-12 rounded-2xl bg-background border-border" />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-8 border-t border-border/50 bg-muted/30">
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-2xl font-bold border-border hover:bg-muted" disabled={loading}>Cancelar</Button>
                <Button onClick={handleCreateService} className="flex-[2] h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" disabled={loading}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5 mr-2" />Criar OS Drone</>}</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
