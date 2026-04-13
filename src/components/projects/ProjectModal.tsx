import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Trash2, Save, MapPin, User, FileText, Send, Calendar, Paperclip, MessageCircle, Upload, X, CheckCircle2 } from 'lucide-react';
import { Project, projectService, ProjectStatus, InstallationType, DocumentFile, StageDates } from '@/services/projectService';
import { clientService } from '@/services/clientService';
import { quoteService } from '@/services/quoteService';
import { getCompanySettings } from '@/services/companySettingsService';
import { projectActivityLogService, ProjectActivityLog } from '@/services/projectActivityLogService';
import { storageService } from '@/services/storageService';
import { transactionService } from '@/services/transactionService';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';
import {
  getStageChecklist,
  getStageProgress,
  calculateProjectProgress,
  syncChecklistWithTemplate,
} from './projectStagesConfig';
import { ProjectStageChecklist } from './ProjectStageChecklist';
import { generateProjectPdf } from '@/utils/projectPdfGenerator';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateEstimatedEndDate, formatDateBR, isHoliday } from '@/utils/businessDays';
import { useProjectStages } from '@/hooks/useProjectStages';
import { getUsers, UserWithRole } from '@/services/userService';

interface ProjectModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  preselectedClientId?: string;
}

// Interface DocumentFile and StageDates are now imported via Project from projectService.ts

// Mapeamento de setores para o role responsável
const STAGE_ROLES: Record<ProjectStatus, string> = {
  'VENDAS': 'VENDEDOR',
  'FINANCEIRO': 'FINANCEIRO',
  'COMPRAS': 'COMPRAS',
  'ENGENHEIRO': 'ENGENHEIRO',
  'TECNICO': 'TECNICO',
  'POS_VENDA': 'POS_VENDA',
};

// Labels amigáveis para os setores
const STAGE_LABELS: Record<ProjectStatus, string> = {
  'VENDAS': 'VENDAS',
  'FINANCEIRO': 'FINANCEIRO',
  'COMPRAS': 'COMPRAS',
  'ENGENHEIRO': 'ENGENHEIRO',
  'TECNICO': 'TECNICO',
  'POS_VENDA': 'PÓS VENDA',
};

const STAGE_TAB_ORDER: { key: ProjectStatus; label: string }[] = [
  { key: 'FINANCEIRO', label: 'FINANCEIRO' },
  { key: 'POS_VENDA', label: 'PÓS VENDA' },
  { key: 'TECNICO', label: 'TECNICO' },
  { key: 'VENDAS', label: 'VENDAS' },
  { key: 'ENGENHEIRO', label: 'ENGENHEIRO' },
  { key: 'COMPRAS', label: 'COMPRAS' },
];

const INSTALLATION_TYPE_OPTIONS: { value: InstallationType; label: string }[] = [
  { value: 'URBANO', label: 'Urbano' },
  { value: 'RURAL', label: 'Rural' },
  { value: 'CNPJ', label: 'CNPJ' },
];

export function ProjectModal({ project, open, onOpenChange, onSave, preselectedClientId }: ProjectModalProps) {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const isMaster = can('dev.view'); // DEV has full access anyway, but for logic clarity
  
  const { data: financialSummary, refetch: refetchFinance } = useQuery({
    queryKey: ['project-financial-summary', project?.id],
    queryFn: () => transactionService.getSummary({ project_id: project?.id }),
    enabled: !!project?.id && open && can('financial.view'),
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { stages, template } = useProjectStages();
  
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingToNext, setSendingToNext] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('info');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [financeiroDescription, setFinanceiroDescription] = useState('');
  const [showStageSelector, setShowStageSelector] = useState(false);
  const [selectedTargetStage, setSelectedTargetStage] = useState<ProjectStatus | null>(null);
  const [technicians, setTechnicians] = useState<UserWithRole[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');

  // Role-based sector access configuration
  // 1. Vendas - VENDEDOR
  // 2. Financeiro - FINANCEIRO
  // 3. Compras - COMPRAS
  // 4. Engenharia - ENGENHEIRO
  // 5. Técnico - TECNICO
  // 6. PÓS VENDA - POS_VENDA
  // Verifica se o usuário pode editar o projeto baseado no status atual
  const canEditProject = (): boolean => {
    if (user?.role === 'DEV') return true;
    if (!project) return false;
    
    // Check if user has overall project management permission
    if (can('project.manage')) return true;
    
    // Still support role-specific editing for the current stage if no global permission
    const currentStatus = project.status;
    const isVendedor = user?.role === 'VENDEDOR';
    const isEngenheiro = user?.role === 'ENGENHEIRO';
    const isFinanceiro = user?.role === 'FINANCEIRO';
    const isTecnico = user?.role === 'TECNICO';
    const isCompras = user?.role === 'COMPRAS';
    const isPosVenda = user?.role === 'POS_VENDA';

    if (currentStatus === 'POS_VENDA' && isPosVenda) return true;
    if (currentStatus === 'VENDAS' && isVendedor) return true;
    if (currentStatus === 'FINANCEIRO' && isFinanceiro) return true;
    if (currentStatus === 'COMPRAS' && isCompras) return true;
    if (currentStatus === 'ENGENHEIRO' && isEngenheiro) return true;
    if (currentStatus === 'TECNICO' && isTecnico) return true;
    
    return false;
  };

  const canEditStage = (stageKey: string): boolean => {
    if (user?.role === 'DEV') return true;
    if (can('project.manage')) return true;

    const isVendedor = user?.role === 'VENDEDOR';
    const isEngenheiro = user?.role === 'ENGENHEIRO';
    const isFinanceiro = user?.role === 'FINANCEIRO';
    const isTecnico = user?.role === 'TECNICO';
    const isCompras = user?.role === 'COMPRAS';
    const isPosVenda = user?.role === 'POS_VENDA';
    
    if (stageKey === 'POS_VENDA' && isPosVenda) return true;
    if (stageKey === 'VENDAS' && isVendedor) return true;
    if (stageKey === 'FINANCEIRO' && isFinanceiro) return true;
    if (stageKey === 'COMPRAS' && isCompras) return true;
    if (stageKey === 'ENGENHEIRO' && isEngenheiro) return true;
    if (stageKey === 'TECNICO' && isTecnico) return true;
    
    return false;
  };

  const canViewStage = (stageKey: string): boolean => {
    // Todos podem visualizar todas as abas
    return true;
  };
  const [stageDocuments, setStageDocuments] = useState<Record<string, DocumentFile[]>>({});
  const [status, setStatus] = useState<ProjectStatus>('VENDAS');
  const [startDate, setStartDate] = useState('');
  const [estimatedEndDate, setEstimatedEndDate] = useState('');
  const [holidayWarnings, setHolidayWarnings] = useState<Date[]>([]);
  const [installationType, setInstallationType] = useState<InstallationType>('URBANO');
  
  // Stage-specific dates and descriptions
  const [stageDates, setStageDates] = useState<Record<string, StageDates>>({});
  const [stageDescriptions, setStageDescriptions] = useState<Record<string, string>>({});
  const [activityLogs, setActivityLogs] = useState<ProjectActivityLog[]>([]);
  
  const [clientInfo, setClientInfo] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [locationInfo, setLocationInfo] = useState<string>('');

  useEffect(() => {
    if (project) {
      const cleanedChecklist = syncChecklistWithTemplate(
        project.checklist || {},
        project.installation_type,
        template,
      );
      setChecklist(cleanedChecklist);
      const stageDocs = project.stage_documents || {};
      setStageDocuments(stageDocs.stages || {});
      setStageDates(stageDocs.stageDates || {});
      setStatus(project.status);
      setInstallationType(project.installation_type ?? 'URBANO');
      
      // Se não tem data de início, usa a data de hoje
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      if (!project.start_date) {
        setStartDate(todayStr);
        
        // Calcula data de conclusão prevista (+3 dias úteis)
        const { endDate, skippedHolidays } = calculateEstimatedEndDate(today, 3);
        setEstimatedEndDate(format(endDate, 'yyyy-MM-dd'));
        setHolidayWarnings(skippedHolidays);
      } else {
        setStartDate(project.start_date);
        setEstimatedEndDate(project.estimated_end_date || '');
        setHolidayWarnings([]);
      }
      
      // Reset stage descriptions
      const emptyDescriptions: Record<string, string> = {};
      stages.forEach(s => { emptyDescriptions[s.key] = ''; });
      setStageDescriptions(emptyDescriptions);
      
      // Fetch client info
      if (project.client_id) {
        clientService.getById(project.client_id).then((client) => {
          if (client) {
            setClientInfo({ name: client.name, phone: client.phone, email: client.email });
            setLocationInfo(`${client.street || ''}, ${client.number || ''} - ${client.neighborhood || ''}, ${client.city || ''} - ${client.state || ''}`);
          }
        });
      }
      
      // Fetch quote info for location if no client
      if (!project.client_id && project.quote_id) {
        quoteService.getById(project.quote_id).then((quote) => {
          if (quote) {
            setLocationInfo(`${quote.address_street || ''}, ${quote.address_number || ''} - ${quote.address_neighborhood || ''}, ${quote.address_city || ''} - ${quote.address_state || ''}`);
          }
        });
      }

      // Fetch activity logs
      projectActivityLogService.getByProjectId(project.id).then((logs) => {
        setActivityLogs(logs);
      }).catch(console.error);
    } else {
      setInstallationType('URBANO');
    }
  }, [project, stages, template]);

  useEffect(() => {
    if (!project) return;

    setChecklist((prev) => syncChecklistWithTemplate(prev, installationType));
  }, [installationType, project]);

  useEffect(() => {
    if (!showStageSelector || selectedTargetStage !== 'TECNICO') {
      setSelectedTechnicianId('');
      return;
    }

    const loadTechnicians = async () => {
      setLoadingTechnicians(true);
      try {
        const data = await getUsers();
        setTechnicians(data.filter(userItem => userItem.role === 'TECNICO'));
      } catch (error) {
        console.error('Error loading technicians:', error);
        toast.error('Erro ao carregar técnicos');
      } finally {
        setLoadingTechnicians(false);
      }
    };

    if (technicians.length === 0) {
      loadTechnicians();
    }
  }, [selectedTargetStage, showStageSelector, technicians.length]);

  const handleCheckChange = async (key: string, checked: boolean) => {
    const newChecklist = { ...checklist, [key]: checked };
    setChecklist(newChecklist);
  };

  const handleStageDateChange = (stageKey: string, field: 'start_date' | 'estimated_end_date', value: string) => {
    setStageDates(prev => ({
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        [field]: value,
      },
    }));
  };

  const handleStageDescriptionChange = (stageKey: string, value: string) => {
    setStageDescriptions(prev => ({
      ...prev,
      [stageKey]: value,
    }));
  };

  const handleFileUpload = async (stageKey: string, files: FileList | null) => {
    if (!files || files.length === 0 || !project) return;

    setUploadingFiles(prev => ({ ...prev, [stageKey]: true }));
    
    try {
      const newDocs: DocumentFile[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt || '')) {
          toast.error(`Arquivo ${file.name} não suportado. Use JPG, PNG ou PDF.`);
          continue;
        }

        const folder = `projects/${project.id}/${stageKey}`;
        const result = await storageService.upload(file, folder);
        
        newDocs.push({
          name: file.name,
          url: result.url,
          path: result.path,
          type: fileExt || 'unknown',
          uploaded_at: new Date().toISOString(),
        });
      }

      if (newDocs.length > 0) {
        setStageDocuments(prev => ({
          ...prev,
          [stageKey]: [...(prev[stageKey] || []), ...newDocs],
        }));
        toast.success(`${newDocs.length} arquivo(s) enviado(s)!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo(s)');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [stageKey]: false }));
      // Reset file input
      if (fileInputRefs.current[stageKey]) {
        fileInputRefs.current[stageKey]!.value = '';
      }
    }
  };

  const handleDeleteDocument = async (stageKey: string, docIndex: number) => {
    const docs = stageDocuments[stageKey] || [];
    const doc = docs[docIndex];
    
    if (!doc) return;

    try {
      await storageService.delete(doc.path);
      setStageDocuments(prev => ({
        ...prev,
        [stageKey]: prev[stageKey]?.filter((_, i) => i !== docIndex) || [],
      }));
      toast.success('Arquivo removido!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  const handleSaveStageActivity = async (stageKey: string) => {
    const description = stageDescriptions[stageKey]?.trim();
    if (!project || !description) {
      toast.error('Digite uma descrição da atividade');
      return;
    }

    try {
      await projectActivityLogService.create({
        project_id: project.id,
        stage: stageKey,
        description,
        created_by_name: user?.name || 'Usuário',
        created_by_role: user?.role || 'VENDEDOR',
      });
      
      // Refresh logs
      const logs = await projectActivityLogService.getByProjectId(project.id);
      setActivityLogs(logs);
      setStageDescriptions(prev => ({ ...prev, [stageKey]: '' }));
      toast.success('Atividade registrada!');
    } catch (error) {
      console.error('Error saving activity log:', error);
      toast.error('Erro ao registrar atividade');
    }
  };

  const handleSave = async () => {
    if (!project) return;

    setLoading(true);
    try {
      await projectService.update(project.id, {
        checklist,
        status,
        installation_type: installationType,
        start_date: startDate || undefined,
        estimated_end_date: estimatedEndDate || undefined,
      });

      // Update stage documents and dates
      const combinedDocs = { stages: stageDocuments, stageDates };
      const { error } = await (await import('@/integrations/supabase/client')).supabase
        .from('projects')
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        .update({ stage_documents: combinedDocs as any })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Projeto atualizado com sucesso!');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar projeto');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToStage = async () => {
    if (!project || !selectedTargetStage) return;
    if (selectedTargetStage === 'TECNICO' && !selectedTechnicianId) {
      toast.error('Selecione um técnico responsável para continuar');
      return;
    }

    const targetRole = STAGE_ROLES[selectedTargetStage];
    
    // Calcula novas datas: usa data atual como início do próximo setor e adiciona +3 dias úteis
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const { endDate: newEstimatedEnd, skippedHolidays } = calculateEstimatedEndDate(today, 3);
    const newEstimatedEndStr = format(newEstimatedEnd, 'yyyy-MM-dd');
    
    setSendingToNext(true);
    try {
      // Cria a mensagem de log com informações sobre as datas
      let logDescription = `Setor enviado para ${STAGE_LABELS[selectedTargetStage]} (${targetRole}). Nova previsão: ${formatDateBR(newEstimatedEnd)}`;
      if (skippedHolidays.length > 0) {
        logDescription += ` - Feriados considerados: ${skippedHolidays.map(d => formatDateBR(d)).join(', ')}`;
      }

      // Log the transition
      await projectActivityLogService.create({
        project_id: project.id,
        stage: status,
        description: logDescription,
        created_by_name: user?.name || 'Usuário',
        created_by_role: user?.role || 'VENDEDOR',
      });

      // Atualiza as datas do setor no stageDates
      const updatedStageDates = {
        ...stageDates,
        [selectedTargetStage]: {
          start_date: todayStr,
          estimated_end_date: newEstimatedEndStr,
        },
      };

      // Update project using RPC function (bypasses RLS for stage transitions)
      const combinedDocs = { stages: stageDocuments, stageDates: updatedStageDates };
      const assignedTo =
        selectedTargetStage === 'TECNICO' ? selectedTechnicianId : null;
      
      // Também atualiza as datas principais do projeto
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Primeiro atualiza via RPC
      const { error } = await supabase
        .rpc('advance_project_stage', {
          _project_id: project.id,
          _new_status: selectedTargetStage,
          _new_assigned_role: targetRole,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _checklist: checklist as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _stage_documents: combinedDocs as any,
          _assigned_to: assignedTo,
        });

      if (error) throw error;
      
      // Depois atualiza as datas do projeto
      await supabase
        .from('projects')
        .update({
          start_date: todayStr,
          estimated_end_date: newEstimatedEndStr,
        })
        .eq('id', project.id);

      // Monta mensagem de sucesso
      let successMsg = `Projeto enviado para ${STAGE_LABELS[selectedTargetStage]}!`;
      if (skippedHolidays.length > 0) {
        successMsg += ` Previsão ajustada por feriados.`;
      }
      
      toast.success(successMsg);
      setHolidayWarnings(skippedHolidays);
      setShowStageSelector(false);
      setSelectedTargetStage(null);
      setSelectedTechnicianId('');
      onSave();
      onOpenChange(false);

      if (selectedTargetStage === 'TECNICO') {
        const params = new URLSearchParams();
        params.set('new', 'true');
        if (project.client_id) {
          params.set('client_id', project.client_id);
        }
        if (selectedTechnicianId) {
          params.set('assigned_to', selectedTechnicianId);
        }
        if (!project.client_id && locationInfo) {
          params.set('notes', locationInfo);
        }
        navigate(`/service-orders?${params.toString()}`);
      }
    } catch (error) {
      console.error('Send to stage error:', error);
      toast.error('Erro ao enviar projeto');
    } finally {
      setSendingToNext(false);
    }
  };

  // Função auxiliar para obter setores disponíveis (excluindo o atual)
  const getAvailableStages = (): ProjectStatus[] => {
    return stages.map(stage => stage.key as ProjectStatus).filter(stage => stage !== status);
  };

  // Verifica se a aba atual é o setor ativo do projeto
  const isCurrentStage = (stageKey: string): boolean => {
    return status === stageKey;
  };

  // Verifica se o setor já foi concluído (checklist 100%)
  const isCompletedStage = (stageKey: string): boolean => {
    const stageProgress = getStageProgress(
      stageKey,
      checklist,
      installationType,
      stages,
      template,
    );
    return stageProgress === 100 && stageKey !== status;
  };

  const handleGeneratePdf = async () => {
    if (!project) return;

    setGeneratingPdf(true);
    try {
      const companySettings = await getCompanySettings();
      
      await generateProjectPdf({
        project,
        clientInfo,
        locationInfo,
        activityLogs,
        stageDocuments,
        checklist,
        companySettings: companySettings || undefined,
      });

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setLoading(true);
    try {
      await projectService.delete(project.id);
      toast.success('Projeto excluído com sucesso!');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao excluir projeto');
    } finally {
      setLoading(false);
    }
  };

  const progress = calculateProjectProgress(
    checklist,
    installationType,
    stages,
    template,
  );
  const isTechnicianStageSelected = selectedTargetStage === 'TECNICO';
  const canConfirmSend = Boolean(selectedTargetStage) && (!isTechnicianStageSelected || Boolean(selectedTechnicianId));

  // Get current stage label for display
  const currentStageLabel = STAGE_LABELS[status] || status;

  // Group activity logs by user to show like chat
  const getLogsByStage = (stageKey: string) => {
    return activityLogs.filter(log => log.stage === stageKey);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Gerenciar Projeto</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <span className="text-muted-foreground">Progresso:</span>
              <span className="text-impulse-gold font-semibold">{progress}%</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full bg-muted rounded-full h-2 mb-4 flex-shrink-0">
          <div
            className="bg-impulse-gold h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 flex-shrink-0">
            <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
            <TabsTrigger value="anexos" className="text-xs">
              <Paperclip className="h-3 w-3 mr-1" />
              Anexos
            </TabsTrigger>
            {STAGE_TAB_ORDER.map((stage) => {
              const isCurrent = isCurrentStage(stage.key);
              const isCompleted = isCompletedStage(stage.key);
              
              // NEW: Restrict Financeiro tab to MASTER, DEV, FINANCEIRO
              // NEW: Restrict Financeiro tab to permissions
              if (stage.key === 'FINANCEIRO' && !can('financial.view')) {
                return null;
              }
              
              return (
                <TabsTrigger 
                  key={stage.key}
                  value={stage.key}
                  className={`text-xs relative ${
                    isCurrent 
                      ? 'ring-2 ring-impulse-gold ring-offset-1 bg-impulse-gold/20' 
                      : isCompleted 
                        ? 'bg-green-500/20 text-green-700' 
                        : ''
                  }`}
                >
                  {isCompleted && <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />}
                  {isCurrent && <span className="absolute -top-1 -right-1 h-2 w-2 bg-impulse-gold rounded-full animate-pulse" />}
                  {stage.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* Info Tab - WhatsApp style history */}
            <TabsContent value="info" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientInfo && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-impulse-gold" />
                      <h3 className="font-semibold text-foreground">Cliente</h3>
                    </div>
                    <p className="text-sm text-foreground">{clientInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{clientInfo.phone}</p>
                    <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
                  </div>
                )}

                {locationInfo && (
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-impulse-gold" />
                      <h3 className="font-semibold text-foreground">Local de Instalação</h3>
                    </div>
                    <p className="text-sm text-foreground">{locationInfo}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor Atual</Label>
                  <div className="p-3 rounded-lg border border-impulse-gold/30 bg-impulse-gold/10">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-5 w-5 text-impulse-gold" />
                      <span className="font-semibold text-foreground">{currentStageLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(isMaster || canEditStage(status))
                        ? 'Use o botão "Enviar para Setor" para mudar o setor'
                        : 'Somente MASTER ou o responsável pelo setor pode alterar o status'
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Potência (kWp)</Label>
                  <Input value={project?.power_kwp?.toString() || ''} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Data de Início do Projeto</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    *Data preenchida automaticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Previsão de Conclusão do Projeto</Label>
                  <Input
                    type="date"
                    value={estimatedEndDate}
                    onChange={(e) => setEstimatedEndDate(e.target.value)}
                    disabled={!isMaster && user?.role !== 'MASTER'}
                  />
                  <p className="text-xs text-muted-foreground">
                    *+3 dias úteis após início (feriados/domingos considerados)
                  </p>
                </div>
              </div>

              {/* Holiday Warning */}
              {holidayWarnings.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    *Feriado(s) considerado(s): {holidayWarnings.map(d => formatDateBR(d)).join(', ')}
                  </p>
                </div>
              )}

              {/* WhatsApp-style Activity History */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-impulse-gold" />
                  <h3 className="font-semibold text-foreground">Histórico de Atividades</h3>
                  <Badge variant="outline">{activityLogs.length}</Badge>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma atividade registrada ainda.</p>
                    </div>
                  ) : (
                    [...activityLogs].reverse().map((log) => {
                      const isCurrentUser = log.created_by_name === user?.name;
                      const stageLabel = STAGE_LABELS[log.stage as ProjectStatus] || log.stage;
                      
                      return (
                        <div
                          key={log.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              isCurrentUser
                                ? 'bg-impulse-gold/20 border border-impulse-gold/30'
                                : 'bg-background border border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">
                                {log.created_by_name || 'Usuário'}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {log.created_by_role}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {stageLabel}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">{log.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 text-right">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Anexos Tab - All Attachments */}
            <TabsContent value="anexos" className="mt-0 space-y-6">
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2">Todos os Anexos</h3>
                <p className="text-sm text-muted-foreground">
                  Documentos e fotos organizados por setor do projeto.
                </p>
              </div>

              {stages.map((stage) => {
                const docs = stageDocuments[stage.key] || [];

                if (docs.length === 0) return null;

                return (
                  <div key={stage.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{stage.label}</h4>
                      <Badge variant="outline">{docs.length} arquivo(s)</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {docs.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-impulse-gold shrink-0" />
                            <span className="text-xs text-foreground truncate">{doc.name}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {doc.type.toUpperCase()}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}

              {Object.values(stageDocuments).every(docs => !docs || docs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum anexo encontrado.</p>
                </div>
              )}
            </TabsContent>


            {/* Stage Tabs */}
            {stages.map((stage) => {
              const stageLogs = getLogsByStage(stage.key);
              const dates = stageDates[stage.key] || { start_date: '', estimated_end_date: '' };
              const docs = stageDocuments[stage.key] || [];
              const stageChecklistItems = getStageChecklist(
                stage.key,
                installationType,
                stages,
                template,
              );
              const stageProgress = getStageProgress(
                stage.key,
                checklist,
                installationType,
                stages,
                template,
              );
              
              const stageEditable = canEditStage(stage.key);
              const isCurrent = isCurrentStage(stage.key);
              const isCompleted = isCompletedStage(stage.key);
              
              return (
                <TabsContent key={stage.key} value={stage.key} className="mt-0 space-y-6">
                  {/* Stage Header */}
                  <div className={`p-4 rounded-lg border ${
                    isCurrent 
                      ? 'border-impulse-gold bg-impulse-gold/10' 
                      : isCompleted 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-border bg-muted/30'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                        {stage.label}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <Badge className="bg-impulse-gold text-impulse-dark">
                            Setor Atual
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            Concluída
                          </Badge>
                        )}
                        {!isCurrent && !isCompleted && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{stage.objective}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Progresso do setor:</span>
                        <span className="text-xs font-semibold text-impulse-gold">
                          {stageProgress}%
                        </span>
                      </div>
                      {!isMaster && !stageEditable && (
                        <span className="text-xs text-orange-500">
                          Somente visualização - edição restrita ao responsável
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Summary - Only for Financeiro stage */}
                  {stage.key === 'FINANCEIRO' && financialSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Total Cobrado (Receitas)</p>
                        <p className="text-2xl font-bold text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.totalReceitas)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/5">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Total Gasto (Despesas)</p>
                        <p className="text-2xl font-bold text-rose-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.totalDespesas)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border border-impulse-gold/20 bg-impulse-gold/5">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Saldo Atual</p>
                        <p className={`text-2xl font-bold ${financialSummary.saldo >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financialSummary.saldo)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stage Dates - Always locked, auto-filled when sent to stage */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-impulse-gold/30 bg-impulse-gold/5">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-impulse-gold" />
                        Data de Início do Setor
                      </Label>
                      <Input
                        type="date"
                        value={dates.start_date || ''}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        *Preenchida automaticamente ao enviar para este setor
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-impulse-gold" />
                        Previsão de Conclusão
                      </Label>
                      <Input
                        type="date"
                        value={dates.estimated_end_date || ''}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        *+3 dias úteis após início (feriados/domingos considerados)
                      </p>
                    </div>
                  </div>

                  {stage.key === 'VENDAS' && (
                    <div className="p-4 rounded-lg border border-border bg-background">
                      <Label htmlFor="installation-type" className="text-base font-semibold">
                        Tipo de Instalação
                      </Label>
                      <Select
                        value={installationType}
                        onValueChange={(value) => setInstallationType(value as InstallationType)}
                        disabled={!stageEditable}
                      >
                        <SelectTrigger id="installation-type" className="mt-2">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {INSTALLATION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Activity Description for this Stage */}
                  <div className="space-y-3 p-4 rounded-lg border border-border bg-background">
                    <Label className="text-base font-semibold">Descrição da Atividade</Label>
                    <Textarea
                      value={stageDescriptions[stage.key] || ''}
                      onChange={(e) => handleStageDescriptionChange(stage.key, e.target.value)}
                      placeholder={`Descreva o que foi realizado em ${stage.label}...`}
                      rows={3}
                      disabled={!stageEditable}
                    />
                    {stageEditable && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSaveStageActivity(stage.key)}
                        disabled={!stageDescriptions[stage.key]?.trim()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Registrar Atividade
                      </Button>
                    )}

                    {/* Stage Activity History (mini chat style) */}
                    {stageLogs.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Atividades deste setor:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {stageLogs.map((log) => (
                            <div key={log.id} className="bg-muted/50 rounded-lg p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-foreground">
                                  {log.created_by_name}
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  {log.created_by_role}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground">{log.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  <div className="p-4 rounded-lg border border-border bg-background">
                    <h4 className="font-medium text-foreground mb-4">Checklist</h4>

                    <ProjectStageChecklist
                      items={stageChecklistItems}
                      checklist={checklist}
                      onCheckChange={handleCheckChange}
                      disabled={!stageEditable}
                    />
                  </div>

                  {/* Stage Documents - Single Upload Button */}
                  <div className="p-4 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-foreground">Anexos do Setor</h4>
                      <Badge variant="outline">{docs.length} arquivo(s)</Badge>
                    </div>

                    {/* Upload Button - only for users who can edit */}
                    {stageEditable && (
                      <div className="mb-4">
                        <input
                          ref={(el) => fileInputRefs.current[stage.key] = el}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(stage.key, e.target.files)}
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRefs.current[stage.key]?.click()}
                          disabled={uploadingFiles[stage.key]}
                          className="w-full"
                        >
                          {uploadingFiles[stage.key] ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploadingFiles[stage.key] ? 'Enviando...' : 'Selecionar Arquivos (JPG, PNG, PDF)'}
                        </Button>
                      </div>
                    )}

                    {/* Documents List */}
                    {docs.length > 0 && (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {docs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                          >
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              <FileText className="h-4 w-4 text-impulse-gold shrink-0" />
                              <span className="text-xs text-foreground truncate">{doc.name}</span>
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                {doc.type.toUpperCase()}
                              </Badge>
                            </a>
                            {isMaster && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDocument(stage.key, idx)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </div>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {isMaster && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O projeto e todos os seus documentos serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            
            {/* Botão único para enviar para outro setor */}
            {(isMaster || canEditStage(status)) && (
              <AlertDialog
                open={showStageSelector}
                onOpenChange={(nextOpen) => {
                  setShowStageSelector(nextOpen);
                  if (!nextOpen) {
                    setSelectedTargetStage(null);
                    setSelectedTechnicianId('');
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="secondary" 
                    disabled={sendingToNext}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {sendingToNext ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar para Setor
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Enviar projeto para qual setor?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Selecione o setor de destino para este projeto.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="py-4">
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                      {getAvailableStages().map((stage) => (
                        <button
                          key={stage}
                          onClick={() => setSelectedTargetStage(stage)}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                            selectedTargetStage === stage
                              ? 'border-secondary bg-secondary/10 text-secondary'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{STAGE_LABELS[stage]}</p>
                            <p className="text-xs text-muted-foreground">
                              Responsável: {STAGE_ROLES[stage]}
                            </p>
                          </div>
                          {selectedTargetStage === stage && (
                            <CheckCircle2 className="h-5 w-5 text-secondary" />
                          )}
                        </button>
                      ))}
                    </div>
                    {isTechnicianStageSelected && (
                      <div className="mt-4 space-y-2">
                        <Label>Técnico responsável</Label>
                        <Select
                          value={selectedTechnicianId}
                          onValueChange={setSelectedTechnicianId}
                          disabled={loadingTechnicians}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingTechnicians ? 'Carregando...' : 'Selecione um técnico'} />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians.map((technician) => (
                              <SelectItem key={technician.id} value={technician.id}>
                                {technician.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Seleção obrigatória para envio ao setor técnico.
                        </p>
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        setSelectedTargetStage(null);
                        setSelectedTechnicianId('');
                      }}
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleSendToStage}
                      disabled={!canConfirmSend || sendingToNext}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {sendingToNext ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Confirmar Envio
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canEditProject() ? (
              <Button onClick={handleSave} disabled={loading} className="gradient-gold text-impulse-dark">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Somente visualização
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
