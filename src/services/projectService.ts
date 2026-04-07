import { supabase } from '@/integrations/supabase/client';
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
  created_by?: string;
  created_at: string;
  updated_at: string;
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
      .select('*')
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
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async update(id: string, project: Partial<CreateProjectData>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      checklist: (data.checklist || {}) as Record<string, boolean>,
    } as Project;
  },

  async updateChecklist(id: string, checklist: Record<string, boolean>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update({ checklist })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
