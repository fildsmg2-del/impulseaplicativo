import { supabase } from '@/integrations/supabase/client';

export interface ProjectActivityLog {
  id: string;
  project_id: string;
  stage: string;
  description: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: string;
}

export interface CreateActivityLogData {
  project_id: string;
  stage: string;
  description: string;
  created_by_name?: string;
  created_by_role?: string;
}

export const projectActivityLogService = {
  async getByProjectId(projectId: string): Promise<ProjectActivityLog[]> {
    const { data, error } = await supabase
      .from('project_activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ProjectActivityLog[];
  },

  async create(log: CreateActivityLogData): Promise<ProjectActivityLog> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('project_activity_logs')
      .insert({
        ...log,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProjectActivityLog;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_activity_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
