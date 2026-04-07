import { supabase } from '@/integrations/supabase/client';

export interface ServiceOrderLog {
  id: string;
  service_order_id: string;
  description: string;
  sector: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: string;
}

export interface CreateServiceOrderLogData {
  service_order_id: string;
  description: string;
  sector: string;
  created_by_name?: string;
  created_by_role?: string;
}

export const serviceOrderLogService = {
  async getByServiceOrderId(serviceOrderId: string): Promise<ServiceOrderLog[]> {
    const { data, error } = await supabase
      .from('service_order_logs')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ServiceOrderLog[];
  },

  async create(log: CreateServiceOrderLogData): Promise<ServiceOrderLog> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('service_order_logs')
      .insert({
        ...log,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ServiceOrderLog;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('service_order_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
