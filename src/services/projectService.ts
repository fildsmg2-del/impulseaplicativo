import { supabase } from '@/integrations/supabase/client';
import { auditLogService } from '@/services/auditLogService';
import { buildInitialChecklist } from '@/components/projects/projectStagesConfig';
import { calculateEstimatedEndDate } from '@/utils/businessDays';
import { format } from 'date-fns';

export type ProjectStatus = 'VENDAS' | 'FINANCEIRO' | 'COMPRAS' | 'ENGENHEIRO' | 'TECNICO' | 'POS_VENDA';
export type InstallationType = 'URBANO' | 'RURAL' | 'CNPJ';

export interface Project {
  id: string;
  client_id?: string;
  quote_id?: string;
  status: ProjectStatus;
  installation_type?: InstallationType | null;
  power_kwp?: number;
  checklist: Record<string, boolean>;
  notes?: string;
  start_date?: string;
  estimated_end_date?: string;
  actual_end_date?: string;
  assigned_to?: string;
  assigned_role?: string;
  created_by?: string;
  stage_documents?: {
    stages?: Record<string, DocumentFile[]>;
    stageDates?: Record<string, StageDates>;
  };
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
  };
}

export interface DocumentFile {
  name: string;
  url: string;
  path: string;
  type: string;
  uploaded_at: string;
}

export interface StageDates {
  start_date: string;
  estimated_end_date: string;
}

export interface CreateProjectData {
  client_id?: string;
  quote_id?: string;
  status?: ProjectStatus;
  installation_type?: InstallationType;
  power_kwp?: number;
  checklist?: Record<string, boolean>;
  notes?: string;
  start_date?: string;
  estimated_end_date?: string;
  assigned_to?: string;
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, client:clients(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      checklist: (p.checklist || {}) as Record<string, boolean>,
    })) as Project[];
  },

  async getById(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async create(project: CreateProjectData): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    const initialChecklist =
      project.checklist && Object.keys(project.checklist).length > 0
        ? project.checklist
        : buildInitialChecklist(project.installation_type);
    
    // Calculate automatic dates: start_date = today, estimated_end_date = +3 business days
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const { endDate } = calculateEstimatedEndDate(today, 3);
    const estimatedEndDateStr = format(endDate, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('projects')
      .insert({ 
        ...project, 
        created_by: user?.id,
        checklist: initialChecklist,
        start_date: project.start_date || todayStr,
        estimated_end_date: project.estimated_end_date || estimatedEndDateStr,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('CREATE', 'PROJECT', data.id, 'Execução de Projeto Solar');
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async update(id: string, project: Partial<CreateProjectData>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(project as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('UPDATE', 'PROJECT', data.id, 'Atualização de Projeto', { tipo: 'Dados Gerais' });
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async updateChecklist(id: string, checklist: Record<string, boolean>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ checklist } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('UPDATE', 'PROJECT', data.id, 'Atualização de Checklist', { alteracao: 'Checklist Modificado' });
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
    const updateData: Partial<Project> = { status };
    
    if (status === 'POS_VENDA') {
      updateData.actual_end_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('projects')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('UPDATE', 'PROJECT', data.id, 'Alteração de Status', { novo_status: status });
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await auditLogService.log('DELETE', 'PROJECT', id, 'Projeto Excluído');
  },

  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      checklist: (p.checklist || {}) as Record<string, boolean>,
    })) as Project[];
  },
};
