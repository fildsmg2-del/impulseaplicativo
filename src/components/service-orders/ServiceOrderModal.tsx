import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, isPast, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Send, Paperclip, FileDown, AlertTriangle, MessageSquare, Loader2, User, Calendar, Clock, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { ServiceOrder, serviceOrderService } from '@/services/serviceOrderService';
import { serviceOrderLogService } from '@/services/serviceOrderLogService';
import { clientService } from '@/services/clientService';
import { getUsers } from '@/services/userService';
import { storageService } from '@/services/storageService';
import { serviceTypeService } from '@/services/serviceTypeService';

interface ServiceOrderModalProps {
  serviceOrder: ServiceOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  preselectedClientId?: string;
  preselectedTechnicianId?: string;
  prefilledNotes?: string;
}

export function ServiceOrderModal({ 
  serviceOrder, 
  open, 
  onOpenChange, 
  onSave,
  preselectedClientId,
  preselectedTechnicianId,
  prefilledNotes
}: ServiceOrderModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [selectedTargetRole, setSelectedTargetRole] = useState<string | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [sendingToRole, setSendingToRole] = useState(false);

  // Cargos disponíveis para envio na OS
  const OS_ROLE_OPTIONS: { role: string; label: string; description: string }[] = [
    { role: 'VENDEDOR',   label: 'Vendedor',        description: 'Setor de Vendas' },
    { role: 'ENGENHEIRO', label: 'Engenheiro',       description: 'Engenharia / Projetos' },
    { role: 'TECNICO',    label: 'Técnico',          description: 'Equipe Técnica (selecione o técnico)' },
    { role: 'FINANCEIRO', label: 'Financeiro',       description: 'Setor Financeiro' },
    { role: 'POS_VENDA',  label: 'Pós-Venda',        description: 'Pós-Venda e Suporte' },
    { role: 'COMPRAS',    label: 'Compras',          description: 'Setor de Compras' },
  ];

  const isTechnicianSelected = selectedTargetRole === 'TECNICO';
  const canConfirmSend = Boolean(selectedTargetRole) && (!isTechnicianSelected || Boolean(selectedAssigneeId));
  const [loading, setLoading] = useState(false);
  const [newLog, setNewLog] = useState('');
  
  // Data for selects using React Query for better caching and reliability
  const { data: clients = [] } = useQuery({ 
    queryKey: ['clients'], 
    queryFn: clientService.getAll,
    enabled: open 
  });
  
  const { data: serviceTypes = [] } = useQuery({ 
    queryKey: ['service-types-active'], 
    queryFn: serviceTypeService.getActive,
    enabled: open 
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: open
  });

  const technicians = useMemo(() => 
    allUsers.filter(u => u.role === 'TECNICO'), 
    [allUsers]
  );

  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    client_id: '',
    service_type_id: '',
    opening_date: '',
    deadline_date: '',
    execution_date: '',
    status: 'EM_ABERTO',
    notes: '',
    assigned_to: '',
    checklist_state: []
  });

  const safeFormatDate = (dateStr: string | null | undefined, fmt: string = "dd/MM/yyyy") => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
      if (!isValid(date)) return "";
      return format(date, fmt, { locale: ptBR });
    } catch (e) { return ""; }
  };

  useEffect(() => {
    if (serviceOrder) {
      const parseDate = (d: string | null | undefined) => {
        if (!d) return '';
        try {
          const date = new Date(d.includes('T') ? d : d + 'T00:00:00');
          return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
        } catch (e) { return ''; }
      };

      setFormData({
        ...serviceOrder,
        opening_date: parseDate(serviceOrder.opening_date),
        deadline_date: parseDate(serviceOrder.deadline_date),
        execution_date: parseDate(serviceOrder.execution_date)
      });
      setActiveTab('details');
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      setFormData({
        client_id: preselectedClientId || '',
        service_type_id: '',
        opening_date: today,
        deadline_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        execution_date: '',
        status: 'EM_ABERTO',
        notes: prefilledNotes || '',
        assigned_to: preselectedTechnicianId || '',
        checklist_state: []
      });
      setActiveTab('details');
    }
  }, [serviceOrder, open, preselectedClientId, preselectedTechnicianId, prefilledNotes]);

  const handleSendToRole = async () => {
    if (!serviceOrder || !selectedTargetRole) return;
    try {
      setSendingToRole(true);
      const targetRole = OS_ROLE_OPTIONS.find(r => r.role === selectedTargetRole);

      // Se TECNICO, atualiza o assigned_to; senão mantém
      const updatePayload: Record<string, unknown> = {
        status: 'EM_TRATAMENTO',
      };
      if (isTechnicianSelected && selectedAssigneeId) {
        updatePayload.assigned_to = selectedAssigneeId;
      }

      await serviceOrderService.update({ id: serviceOrder.id, ...updatePayload } as any);

      // Log automático
      const assigneeName = isTechnicianSelected
        ? allUsers.find(u => u.id === selectedAssigneeId)?.name || 'Técnico'
        : targetRole?.label || selectedTargetRole;

      await serviceOrderLogService.create({
        service_order_id: serviceOrder.id,
        description: `OS enviada para o cargo "${targetRole?.label || selectedTargetRole}"${isTechnicianSelected ? ` — Técnico: ${assigneeName}` : ''}.`,
        sector: selectedTargetRole,
        created_by_name: user?.name || 'Sistema',
        created_by_role: user?.role || 'VENDEDOR',
      });

      toast({ title: 'Enviado!', description: `OS encaminhada para ${targetRole?.label}.` });
      setShowRoleSelector(false);
      setSelectedTargetRole(null);
      setSelectedAssigneeId('');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível enviar a OS.', variant: 'destructive' });
    } finally {
      setSendingToRole(false);
    }
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.service_type_id) {
      toast({
        title: "Erro",
        description: "Por favor, selecione o cliente e o tipo de serviço.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const selectedType = serviceTypes.find(t => t.id === formData.service_type_id);
      
      const payload = {
        ...formData,
        service_type: selectedType?.name || '',
        execution_date: formData.execution_date || null,
        deadline_date: formData.deadline_date || null,
        assigned_to: formData.assigned_to || null,
      };

      if (serviceOrder) {
        await serviceOrderService.update({
          ...payload,
          id: serviceOrder.id
        } as any);
        toast({ title: "Sucesso", description: "Ordem de serviço atualizada." });
      } else {
        const created = await serviceOrderService.create(payload as any);
        
        // Log inicial com a descrição da OS
        await serviceOrderLogService.create({
          service_order_id: created.id,
          description: `OS Criada - Descrição: ${formData.notes || 'Sem observações'}`,
          sector: 'GERAL',
          created_by_name: user?.name || 'Sistema',
          created_by_role: user?.role || 'VENDEDOR'
        });

        toast({ title: "Sucesso", description: "Ordem de serviço criada." });
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ordem de serviço.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!serviceOrder || !newLog.trim()) return;

    try {
      await serviceOrderLogService.create({
        service_order_id: serviceOrder.id,
        description: newLog,
        sector: user?.role || 'GERAL',
        created_by_name: user?.name || 'Sistema',
        created_by_role: user?.role || 'VENDEDOR'
      });
      setNewLog('');
      refetchLogs();
      toast({
        title: "Sucesso",
        description: "Comentário adicionado.",
      });
    } catch (error: any) {
      console.error('Erro ao adicionar log:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o comentário.",
        variant: "destructive"
      });
    }
  };

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['service-order-logs', serviceOrder?.id],
    queryFn: () => serviceOrderLogService.getByServiceOrderId(serviceOrder!.id),
    enabled: open && !!serviceOrder?.id
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-background rounded-3xl">
        <DialogHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {serviceOrder ? `OS ${serviceOrder.display_code || 'Editar'}` : 'Nova Ordem de Serviço'}
              </DialogTitle>
              {serviceOrder && (
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Criada em {format(new Date(serviceOrder.created_at), "d 'de' MMMM", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-2 bg-muted/10 border-b">
            <TabsList className="bg-transparent gap-4 p-0 h-auto">
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-2 py-2 font-bold text-xs uppercase tracking-wider"
              >
                Informações Gerais
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                disabled={!serviceOrder}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-2 py-2 font-bold text-xs uppercase tracking-wider"
              >
                Histórico e Notas
              </TabsTrigger>
              <TabsTrigger 
                value="attachments" 
                disabled={!serviceOrder}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-2 py-2 font-bold text-xs uppercase tracking-wider"
              >
                Anexos e Fotos
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="details" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" /> Cliente Responsável
                    </Label>
                    <Select 
                      value={formData.client_id || ''} 
                      onValueChange={(val) => setFormData({ ...formData, client_id: val })}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-border bg-card">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id} className="rounded-xl">{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      Tipo de Serviço
                    </Label>
                    <Select 
                      value={formData.service_type_id || ''} 
                      onValueChange={(val) => {
                        const selected = serviceTypes.find(t => t.id === val);
                        const updates: Partial<ServiceOrder> = { service_type_id: val };
                        if (selected?.deadline_days && !serviceOrder) {
                          updates.deadline_date = format(addDays(new Date(), selected.deadline_days), 'yyyy-MM-dd');
                        }
                        setFormData({ ...formData, ...updates });
                      }}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-border bg-card">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {serviceTypes.map(type => (
                          <SelectItem key={type.id} value={type.id} className="rounded-xl">{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      Técnico Designado
                    </Label>
                    <Select 
                      value={formData.assigned_to || ''} 
                      onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-border bg-card">
                        <SelectValue placeholder="Selecionar técnico" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.id} className="rounded-xl">{tech.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data Abertura</Label>
                      <Input 
                        type="date" 
                        value={formData.opening_date || ''} 
                        onChange={(e) => setFormData({ ...formData, opening_date: e.target.value })}
                        className="h-12 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prazo Final</Label>
                      <Input 
                        type="date" 
                        value={formData.deadline_date || ''} 
                        onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                        className="h-12 rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Status do Processo
                    </Label>
                    <Select 
                      value={formData.status || 'EM_ABERTO'} 
                      onValueChange={(val) => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-border bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="EM_ABERTO" className="rounded-xl">Em Aberto</SelectItem>
                        <SelectItem value="EM_TRATAMENTO" className="rounded-xl">Em Tratamento</SelectItem>
                        <SelectItem value="EM_EXECUCAO" className="rounded-xl">Em Execução</SelectItem>
                        <SelectItem value="CONCLUIDO" className="rounded-xl">Concluído</SelectItem>
                        <SelectItem value="CANCELADO" className="rounded-xl text-destructive">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data de Execução</Label>
                    <Input 
                      type="date" 
                      value={formData.execution_date || ''} 
                      onChange={(e) => setFormData({ ...formData, execution_date: e.target.value })}
                      className="h-12 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descrição / Notas do Serviço</Label>
                <Textarea 
                  value={formData.notes || ''} 
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Descreva detalhes importantes sobre o serviço ou especificações do cliente..."
                  className="min-h-[120px] rounded-3xl p-4 border-border resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-8">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-2xl font-bold border-border" disabled={loading}>
                  Cancelar
                </Button>

                {/* Botão Enviar para Cargo — só para DEV/MASTER/ENGENHEIRO editando OS existente */}
                {serviceOrder && ['MASTER', 'DEV', 'ENGENHEIRO'].includes(user?.role || '') && (
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
                        className="flex-1 h-12 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                      >
                        {sendingToRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Enviar para Cargo
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md z-[200]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Enviar OS para qual cargo?</AlertDialogTitle>
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

                        {/* Seleção de técnico específico */}
                        {isTechnicianSelected && (
                          <div className="mt-3 space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              <User className="h-3 w-3 inline mr-1" />Técnico responsável
                            </Label>
                            <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                              <SelectTrigger className="h-10 rounded-xl">
                                <SelectValue placeholder="Selecione um técnico" />
                              </SelectTrigger>
                              <SelectContent className="z-[210]">
                                {technicians.map(tech => (
                                  <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Obrigatório para envio ao técnico.</p>
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
                )}

                <Button onClick={handleSave} disabled={loading} className="flex-[2] h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-0 h-full flex flex-col gap-4">
              <div className="flex gap-2 p-2 bg-muted/20 rounded-2xl border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Input 
                  value={newLog} 
                  onChange={(e) => setNewLog(e.target.value)}
                  placeholder="Adicionar um comentário ou nota..."
                  className="border-none focus-visible:ring-0 bg-transparent flex-1 h-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLog()}
                />
                <Button onClick={handleAddLog} className="rounded-xl h-10 px-4 bg-primary shadow-sm active:scale-95 transition-all">
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 h-[400px]">
                <div className="space-y-4 py-4">
                  {formData.notes && (
                    <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">DESCRIÇÃO / NOTAS DO SERVIÇO</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{formData.notes}</p>
                    </div>
                  )}

                  {logs.length === 0 && !formData.notes ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 gap-3 opacity-50">
                      <MessageSquare className="h-12 w-12" />
                      <p className="text-sm font-medium">Nenhum comentário registrado</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="bg-muted/50 p-4 rounded-3xl border border-border/50 space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{log.created_by_name || 'Sistema'}</span>
                          <span className="text-[10px] text-muted-foreground/50 font-medium">
                            {safeFormatDate(log.created_at, 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{log.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 h-full">
              <div className="space-y-4 h-[450px] flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Arquivos Anexados</h3>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 font-black text-[10px] border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95" onClick={() => document.getElementById('file-upload-os')?.click()}>
                    <Upload className="h-3 w-3" /> FAZER UPLOAD
                  </Button>
                  <input
                    id="file-upload-os"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0 || !serviceOrder) return;
                      
                      try {
                        setLoading(true);
                        const newAttachments = [];
                        for (const file of Array.from(files)) {
                          const folder = `service-orders/${serviceOrder.id}`;
                          const result = await storageService.upload(file, folder);
                          newAttachments.push({
                            name: file.name,
                            url: result.url,
                            path: result.path,
                            type: file.type,
                            sector: 'POS_VENDA',
                            uploadedAt: new Date().toISOString()
                          });
                        }
                        await serviceOrderService.addAttachments(serviceOrder.id, newAttachments);
                        toast({ title: "Sucesso", description: `${newAttachments.length} anexo(s) enviado(s).` });
                        onSave(); // Refresh to get new attachments
                      } catch (err) {
                        toast({ title: "Erro", description: "Falha ao enviar anexos.", variant: "destructive" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                </div>

                <ScrollArea className="flex-1 rounded-2xl border border-border/50 bg-muted/10 p-4">
                  {!serviceOrder?.attachments || serviceOrder.attachments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50 gap-3">
                      <Paperclip className="h-10 w-10" />
                      <p className="text-sm font-medium">Nenhum anexo encontrado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {serviceOrder.attachments.map((attachment) => (
                        <div key={attachment.id || attachment.url} className="group relative aspect-square rounded-2xl border border-border overflow-hidden bg-card hover:border-primary/50 transition-all shadow-sm">
                          {attachment.type?.startsWith('image/') ? (
                            <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 gap-2">
                              <Paperclip className="h-8 w-8 text-muted-foreground" />
                              <span className="text-[10px] text-center line-clamp-2 font-medium">{attachment.name}</span>
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
                                  toast({ title: "Removido", description: "Anexo excluído com sucesso." });
                                  onSave();
                                } catch (err) {
                                  toast({ title: "Erro", description: "Falha ao remover anexo.", variant: "destructive" });
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
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
