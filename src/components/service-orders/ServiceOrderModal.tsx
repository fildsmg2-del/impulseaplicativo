import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Send, Paperclip, FileDown, AlertTriangle, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import { ServiceOrder, ServiceOrderAttachmentSummary, ServiceOrderChecklistItem, serviceOrderService } from '@/services/serviceOrderService';
import { ServiceOrderLog, serviceOrderLogService } from '@/services/serviceOrderLogService';
import { clientService, Client } from '@/services/clientService';
import { serviceTypeService, ServiceType } from '@/services/serviceTypeService';
import { r2StorageService } from '@/services/r2StorageService';
import { generateServiceOrderPDF } from '@/utils/serviceOrderPdfGenerator';
import { getCompanySettings, CompanySettings } from '@/services/companySettingsService';
import { getUsers, UserWithRole } from '@/services/userService';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { transactionService } from '@/services/transactionService';

interface ServiceOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder?: ServiceOrder | null;
  onSave: () => void;
  preselectedClientId?: string;
  preselectedTechnicianId?: string;
  prefilledNotes?: string;
}

const STATUS_OPTIONS = [
  { value: 'EM_ABERTO', label: 'Em Aberto' },
  { value: 'EM_TRATAMENTO', label: 'Em Tratamento' },
  { value: 'EM_EXECUCAO', label: 'Em Execução' },
  { value: 'CONCLUIDO', label: 'Concluído' },
];

const ROLE_SECTOR_ACCESS: Record<string, string> = {
  TECNICO: 'TECNICO',
  FINANCEIRO: 'FINANCEIRO',
  ENGENHEIRO: 'ENGENHEIRO',
  COMPRAS: 'COMPRAS',
  POS_VENDA: 'POS_VENDA',
  VENDEDOR: 'VENDAS',
};

// Setor tabs configuration
const SECTOR_TABS = [
  { key: 'INFO', label: 'Info', hasFullContent: true },
  { key: 'ANEXOS', label: 'Anexos', hasFullContent: false },
  { key: 'FINANCEIRO', label: 'Financeiro', hasFullContent: false, roles: ['MASTER', 'DEV', 'FINANCEIRO'] as UserRole[] },
  { key: 'TECNICO', label: 'Técnico', hasFullContent: true },
  { key: 'ENGENHEIRO', label: 'Engenheiro', hasFullContent: false },
  { key: 'COMPRAS', label: 'Compras', hasFullContent: false },
  { key: 'POS_VENDA', label: 'Pós-Venda', hasFullContent: false },
  { key: 'VENDAS', label: 'Vendas', hasFullContent: false },
];

interface SectorAttachment extends ServiceOrderAttachmentSummary {
  path?: string | null;
  type?: string | null;
}

export function ServiceOrderModal({
  open,
  onOpenChange,
  serviceOrder,
  onSave,
  preselectedClientId,
  preselectedTechnicianId,
  prefilledNotes,
}: ServiceOrderModalProps) {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  
  const { data: financialSummary } = useQuery({
    queryKey: ['service-order-financial-summary', serviceOrder?.id],
    queryFn: () => transactionService.getSummary({ service_order_id: serviceOrder?.id }),
    enabled: !!serviceOrder?.id && open && hasRole(['MASTER', 'DEV', 'FINANCEIRO']),
  });
  const [loading, setLoading] = useState(false);
  const [newLogText, setNewLogText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState('INFO');
  const [currentSectorComment, setCurrentSectorComment] = useState('');
  const [checklistItems, setChecklistItems] = useState<ServiceOrderChecklistItem[]>([]);

  // ── Queries (Refactored for Cache/Offline) ────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getAll,
    staleTime: 5 * 60 * 1000, 
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types-active'],
    queryFn: serviceTypeService.getActive,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 5 * 60 * 1000,
  });

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettings,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const technicians = useMemo(() => {
    return allUsers.filter(u => u.role === 'TECNICO');
  }, [allUsers]);

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['service-order-logs', serviceOrder?.id],
    queryFn: () => serviceOrderLogService.getByServiceOrderId(serviceOrder!.id),
    enabled: !!serviceOrder?.id && open,
  });

  const [formData, setFormData] = useState({
    client_id: '',
    service_type: '',
    service_type_id: '',
    opening_date: new Date().toISOString().split('T')[0],
    deadline_date: '',
    status: 'EM_ABERTO',
    attachments: [] as SectorAttachment[],
    notes: '',
    assigned_to: '',
  });

  const { data: clientDetails } = useQuery({
    queryKey: ['client-details', formData.client_id],
    queryFn: () => clientService.getById(formData.client_id),
    enabled: !!formData.client_id,
  });

  useEffect(() => {
    if (open) {
      if (serviceOrder) {
        setFormData({
          client_id: serviceOrder.client_id || '',
          service_type: serviceOrder.service_type || '',
          service_type_id: serviceOrder.service_type_id || '',
          opening_date: serviceOrder.opening_date || new Date().toISOString().split('T')[0],
          deadline_date: serviceOrder.deadline_date || '',
          status: serviceOrder.status || 'EM_ABERTO',
          attachments: (serviceOrder.attachments || []).map((att: SectorAttachment) => ({
            ...att,
            sector: att.sector || 'TECNICO',
          })),
          notes: serviceOrder.notes || '',
          assigned_to: serviceOrder.assigned_to || '',
        });
        setChecklistItems(serviceOrder.checklist_state || []);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          client_id: preselectedClientId || '',
          service_type: '',
          service_type_id: '',
          opening_date: today,
          deadline_date: '',
          status: 'EM_ABERTO',
          attachments: [],
          notes: prefilledNotes || '',
          assigned_to: preselectedTechnicianId || '',
        });
        setChecklistItems([]);
      }
      setActiveTab('INFO');
      setCurrentSectorComment('');
    }
  }, [open, serviceOrder, preselectedClientId, preselectedTechnicianId, prefilledNotes]);

  const loadLogs = () => {
    refetchLogs();
  };

  const canEditSector = (sectorKey: string) => {
    if (!user?.role) return false;
    if (user.role === 'MASTER' || user.role === 'DEV') return true;
    return ROLE_SECTOR_ACCESS[user.role] === sectorKey;
  };

  const getClientAddress = (client: Client | null) => {
    if (!client) return 'Endereço não informado';
    const parts = [
      client.street,
      client.number,
      client.complement,
      client.neighborhood,
      client.city,
      client.state,
      client.zip_code,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Endereço não informado';
  };

  const assignedTechnician = technicians.find(technician => technician.id === formData.assigned_to);

  const handleServiceTypeChange = async (serviceTypeId: string) => {
    const selectedType = serviceTypes.find(t => t.id === serviceTypeId);
    if (!selectedType) return;

    const openingDate = formData.opening_date || new Date().toISOString().split('T')[0];
    const deadlineDate = format(addDays(new Date(openingDate), selectedType.deadline_days), 'yyyy-MM-dd');

    setFormData({
      ...formData,
      service_type_id: serviceTypeId,
      service_type: selectedType.name,
      deadline_date: deadlineDate,
    });

    try {
      const fullType = await serviceTypeService.getById(serviceTypeId);
      const templateItems = fullType?.checklist_template ?? [];
      const existingMap = new Map(checklistItems.map((item) => [item.id, item.checked]));
      const nextChecklist = templateItems.map((item) => ({
        id: item.id,
        label: item.label,
        checked: existingMap.get(item.id) ?? false,
      }));
      setChecklistItems(nextChecklist);
    } catch (error) {
      console.error('Error loading service type checklist:', error);
      setChecklistItems([]);
    }
  };

  const handleChecklistToggle = (itemId: string, checked: boolean) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, checked } : item)),
    );
  };

  const handleOpeningDateChange = (date: string) => {
    const selectedType = serviceTypes.find(t => t.id === formData.service_type_id);
    let deadlineDate = formData.deadline_date;
    
    if (selectedType && date) {
      deadlineDate = format(addDays(new Date(date), selectedType.deadline_days), 'yyyy-MM-dd');
    }
    
    setFormData({
      ...formData,
      opening_date: date,
      deadline_date: deadlineDate,
    });
  };

  const handleSubmit = async () => {
    if (!formData.service_type) {
      toast({
        title: 'Erro',
        description: 'Tipo de serviço é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (serviceOrder) {
        await serviceOrderService.update({
          id: serviceOrder.id,
          ...formData,
          client_id: formData.client_id || null,
          service_type_id: formData.service_type_id || null,
          checklist_state: checklistItems,
        });
        toast({ title: 'OS atualizada com sucesso' });
      } else {
        await serviceOrderService.create({
          ...formData,
          client_id: formData.client_id || null,
          service_type_id: formData.service_type_id || null,
          checklist_state: checklistItems,
        });
        toast({ title: 'OS criada com sucesso' });
      }
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving service order:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar OS',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSectorComment = async (sector: string) => {
    if (!currentSectorComment.trim() || !serviceOrder) return;

    try {
      const sectorLabel = SECTOR_TABS.find(s => s.key === sector)?.label || sector;
      const newLog = await serviceOrderLogService.create({
        service_order_id: serviceOrder.id,
        description: `[${sectorLabel}] ${currentSectorComment}`,
        sector,
        created_by_name: user?.name || 'Usuário',
        created_by_role: user?.role || '',
      });
      setLogs([newLog, ...logs]);
      setCurrentSectorComment('');
      toast({ title: 'Comentário adicionado' });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar comentário',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, sector: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      const newAttachments = [...formData.attachments];
      
      for (const file of Array.from(files)) {
        const result = await r2StorageService.upload(file, 'service-orders');
        const attachment: SectorAttachment = {
          name: file.name,
          url: result.url,
          path: result.path,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          sector: sector,
        };

        if (serviceOrder) {
          const [inserted] = await serviceOrderService.addAttachments(serviceOrder.id, [attachment]);
          newAttachments.push({
            ...attachment,
            id: inserted?.id,
            uploadedAt: inserted?.uploadedAt || attachment.uploadedAt,
          });
        } else {
          newAttachments.push(attachment);
        }
      }

      setFormData({ ...formData, attachments: newAttachments });
      toast({ title: 'Arquivo(s) anexado(s)' });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload do arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = async (index: number) => {
    const attachment = formData.attachments[index];
    try {
      if (attachment.path) {
        await r2StorageService.delete(attachment.path);
      }
      if (attachment.id) {
        await serviceOrderService.deleteAttachment(attachment.id);
      }
      const newAttachments = formData.attachments.filter((_, i) => i !== index);
      setFormData({ ...formData, attachments: newAttachments });
      toast({ title: 'Anexo removido' });
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!serviceOrder) return;
    try {
      await generateServiceOrderPDF(serviceOrder, logs, companySettings);
      toast({ title: 'PDF gerado com sucesso' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF',
        variant: 'destructive',
      });
    }
  };

  // Filter logs and attachments by sector
  const getLogsForSector = (sector: string) => {
    const sectorLabel = SECTOR_TABS.find(s => s.key === sector)?.label || sector;
    return logs.filter(log => log.description.startsWith(`[${sectorLabel}]`));
  };

  const getAttachmentsForSector = (sector: string) => {
    return formData.attachments.filter(att => att.sector === sector);
  };

  // Calculate if OS is overdue
  const isOverdue = formData.deadline_date && 
    formData.status !== 'CONCLUIDO' && 
    isPast(new Date(formData.deadline_date));
  
  const daysUntilDeadline = formData.deadline_date 
    ? differenceInDays(new Date(formData.deadline_date), new Date())
    : null;

  // Render sector chat and attachment section
  const renderSectorChatSection = (sector: string) => {
    const sectorLogs = getLogsForSector(sector);
    const sectorAttachments = getAttachmentsForSector(sector);
    const fileInputId = `file-upload-${sector}`;
    const sectorLabel = SECTOR_TABS.find(s => s.key === sector)?.label || sector;
    const isEditable = canEditSector(sector);

    return (
      <div className="space-y-4">
        {!isEditable && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Somente o setor {sectorLabel} pode registrar comentários ou anexos aqui.
          </div>
        )}
        {/* Attachments section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Anexos do setor
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => handleFileUpload(e, sector)}
              disabled={uploadingFile || !isEditable}
              className="hidden"
              id={fileInputId}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(fileInputId)?.click()}
              disabled={uploadingFile || !isEditable}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              {uploadingFile ? 'Enviando...' : 'Anexar Arquivo'}
            </Button>
          </div>
          {sectorAttachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {sectorAttachments.map((attachment, idx) => {
                const globalIndex = formData.attachments.findIndex(a =>
                  attachment.id ? a.id === attachment.id : a.path === attachment.path,
                );
                return (
                  <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1"
                    >
                      {attachment.name}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(globalIndex)}
                      disabled={!canEditSector(attachment.sector)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {sectorAttachments.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum anexo neste setor</p>
          )}
        </div>

        {/* Chat/Comments section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentários do setor
          </Label>
          
          {serviceOrder && (
            <div className="flex gap-2">
              <Textarea
                value={currentSectorComment}
                onChange={(e) => setCurrentSectorComment(e.target.value)}
                placeholder="Adicionar comentário..."
                rows={2}
                className="flex-1"
                disabled={!isEditable}
              />
              <Button
                onClick={() => handleAddSectorComment(sector)}
                disabled={!isEditable || !currentSectorComment.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          <ScrollArea className="h-48 border rounded-lg p-3">
            {sectorLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comentário neste setor
              </p>
            ) : (
              <div className="space-y-3">
                {sectorLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-muted/50 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {log.created_by_name || 'Usuário'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {log.created_by_role && (
                      <Badge variant="secondary" className="text-xs">
                        {log.created_by_role}
                      </Badge>
                    )}
                    <p className="text-sm mt-1">
                      {log.description.replace(/^\[[^\]]+\]\s*/, '')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] md:h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            {serviceOrder ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Vencida
              </span>
            )}
            {!isOverdue && daysUntilDeadline !== null && daysUntilDeadline <= 2 && daysUntilDeadline >= 0 && formData.status !== 'CONCLUIDO' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-500 text-white rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Vence em {daysUntilDeadline} dia(s)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-4 md:p-6 pb-24 md:pb-6">
          {!serviceOrder ? (
            <div className="space-y-6 max-w-2xl mx-auto py-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger className="h-12 bg-white border-slate-200">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">Tipo de Serviço</Label>
                <Select
                  value={formData.service_type_id}
                  onValueChange={handleServiceTypeChange}
                >
                  <SelectTrigger className="h-12 bg-white border-slate-200">
                    <SelectValue placeholder="Selecione o tipo de serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">Descrição da solicitação</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Descreva detalhadamente o que precisa ser feito..."
                  rows={6}
                  className="bg-white border-slate-200 resize-none px-4 py-3"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">Enviar para (Setor ou responsável)</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                >
                  <SelectTrigger className="h-12 bg-white border-slate-200">
                    <SelectValue placeholder="Selecione o técnico responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
              <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-muted/20 scrollbar-none border-b rounded-none shrink-0 gap-1">
                {SECTOR_TABS.map((tab) => {
                  if (tab.roles && !hasRole(tab.roles)) return null;
                  return (
                    <TabsTrigger 
                      key={tab.key} 
                      value={tab.key} 
                      className="px-4 py-2 text-[10px] sm:text-xs font-bold whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all flex-shrink-0"
                    >
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="INFO" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código da OS</Label>
                    <Input value={serviceOrder.display_code || `OS-${serviceOrder.id.slice(0, 4)}`} disabled className="bg-slate-50 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Badge variant={isOverdue ? "destructive" : "outline"} className="mt-8">
                      {formData.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex flex-col gap-1 rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">Endereço completo</span>
                    <span className="font-medium">{getClientAddress(clientDetails)}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-lg border p-3">
                    <span className="text-xs text-muted-foreground">Técnico responsável</span>
                    <span className="font-medium">
                      {assignedTechnician?.name || 'Não definido'}
                    </span>
                  </div>
                </div>

                {serviceOrder && (
                  <div className="space-y-4 border-t pt-4">
                    <Label className="text-lg font-semibold">Histórico Completo</Label>
                    <ScrollArea className="h-64 border rounded-lg p-3">
                      {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum registro ainda
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {logs.map((log) => {
                            const sectorMatch = log.description.match(/^\[([^\]]+)\]/);
                            const sectorName = sectorMatch ? sectorMatch[1] : 'Geral';
                            const message = log.description.replace(/^\[[^\]]+\]\s*/, '');
                            
                            return (
                              <div
                                key={log.id}
                                className="bg-muted/50 rounded-lg p-3 space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {log.created_by_name || 'Usuário'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {sectorName}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">{message}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ANEXOS" className="space-y-4">
                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-lg font-semibold">Todos os Anexos</Label>
                    <div className="space-y-1">
                      {formData.attachments.map((attachment, index) => {
                        const sectorLabel = SECTOR_TABS.find(s => s.key === attachment.sector)?.label || attachment.sector;
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Badge variant="outline" className="text-xs shrink-0">
                                {sectorLabel}
                              </Badge>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline truncate"
                              >
                                {attachment.name}
                              </a>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAttachment(index)}
                              disabled={!canEditSector(attachment.sector)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="FINANCEIRO" className="space-y-4">
                {financialSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Receitas</p>
                      <p className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.totalReceitas)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Despesas</p>
                      <p className="text-xl font-bold text-rose-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.totalDespesas)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Saldo</p>
                      <p className={`text-xl font-bold ${financialSummary.saldo >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.saldo)}
                      </p>
                    </div>
                  </div>
                )}
                {renderSectorChatSection('FINANCEIRO')}
              </TabsContent>

            {/* TECNICO Tab - Full content */}
            <TabsContent value="TECNICO" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Técnico responsável</Label>
                  <Select
                    value={formData.assigned_to}
                    onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Abertura</Label>
                  <Input
                    type="date"
                    value={formData.opening_date}
                    onChange={(e) => handleOpeningDateChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Limite</Label>
                  <Input
                    type="date"
                    value={formData.deadline_date}
                    onChange={(e) => setFormData({ ...formData, deadline_date: e.target.value })}
                    className={isOverdue ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Calculada automaticamente com base no tipo de serviço
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Serviço *</Label>
                <Select
                  value={formData.service_type_id}
                  onValueChange={handleServiceTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name} ({type.deadline_days} dias)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.service_type_id && formData.service_type && (
                  <p className="text-xs text-muted-foreground">
                    Tipo atual: {formData.service_type}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Checklist do serviço</Label>
                  {checklistItems.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {checklistItems.filter((item) => item.checked).length}/{checklistItems.length} concluído
                    </span>
                  )}
                </div>
                {checklistItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum checklist disponível para o tipo selecionado.
                  </p>
                ) : (
                  <div className="space-y-2 rounded-lg border p-3">
                    {checklistItems.map((item) => (
                      <label key={item.id} className="flex items-center gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(value) => handleChecklistToggle(item.id, Boolean(value))}
                        />
                        <span className={item.checked ? 'text-muted-foreground line-through' : ''}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={2}
                />
              </div>

              {/* Sector chat for TECNICO */}
              {renderSectorChatSection('TECNICO')}
            </TabsContent>

            {/* ENGENHEIRO Tab - Chat and attachments only */}
            <TabsContent value="ENGENHEIRO" className="space-y-4">
              <div className="text-center py-4 text-muted-foreground border rounded-lg mb-4">
                <p className="text-sm">Setor Engenharia - Registros e anexos</p>
              </div>
              {renderSectorChatSection('ENGENHEIRO')}
            </TabsContent>

            {/* COMPRAS Tab - Chat and attachments only */}
            <TabsContent value="COMPRAS" className="space-y-4">
              <div className="text-center py-4 text-muted-foreground border rounded-lg mb-4">
                <p className="text-sm">Setor Compras - Registros e anexos</p>
              </div>
              {renderSectorChatSection('COMPRAS')}
            </TabsContent>

            {/* POS_VENDA Tab - Chat and attachments only */}
            <TabsContent value="POS_VENDA" className="space-y-4">
              <div className="text-center py-4 text-muted-foreground border rounded-lg mb-4">
                <p className="text-sm">Setor Pós-Venda - Registros e anexos</p>
              </div>
              {renderSectorChatSection('POS_VENDA')}
            </TabsContent>

            {/* VENDAS Tab - Chat and attachments only */}
            <TabsContent value="VENDAS" className="space-y-4">
              <div className="text-center py-4 text-muted-foreground border rounded-lg mb-4">
                <p className="text-sm">Setor Vendas - Registros e anexos</p>
              </div>
              {renderSectorChatSection('VENDAS')}
            </TabsContent>
          </Tabs>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div>
            {serviceOrder && (
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
