import { supabase } from '@/integrations/supabase/client';
import { auditLogService } from '@/services/auditLogService';

export type DroneServiceStatus = 'PENDENTE' | 'TECNICO' | 'REVISAO' | 'FINALIZADO';

export interface DroneService {
  id: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  client_document?: string;
  client_address_street?: string;
  technician_id?: string;
  status: DroneServiceStatus;
  area_hectares?: number;
  service_description?: string;
  location_link?: string;
  opening_date?: string;
  execution_date?: string;
  estimated_start_date?: string;
  estimated_completion_date?: string;
  negotiated_conditions?: string;
  created_at: string;
  updated_at: string;
  display_code?: string;
  client?: {
    name: string;
  };
  technician?: {
    name: string;
  };
  attachments?: any[];
  created_by?: string;
}

export const droneService = {
  async getAll(): Promise<DroneService[]> {
    try {
      const { data, error } = await (supabase
        .from('drone_services' as any) as any)
        .select('*, attachments:service_order_attachments(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching drone services:', error);
        throw error;
      }
      return (data || []) as DroneService[];
    } catch (error) {
      console.error('DroneService.getAll failed:', error);
      return [];
    }
  },

  async updateStatus(id: string, status: DroneServiceStatus): Promise<void> {
    const { error } = await (supabase
      .from('drone_services' as any) as any)
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    await auditLogService.log('UPDATE', 'DRONE_SERVICE', id, 'OS Drone', { status });
  },

  async create(service: Partial<DroneService>): Promise<DroneService> {
    const { data, error } = await (supabase
      .from('drone_services' as any) as any)
      .insert(service)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('CREATE', 'DRONE_SERVICE', data.id, data.display_code || 'OS Drone');
    return data as DroneService;
  },

  async update(id: string, service: Partial<DroneService>): Promise<DroneService> {
    const { data, error } = await (supabase
      .from('drone_services' as any) as any)
      .update(service)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('UPDATE', 'DRONE_SERVICE', data.id, data.display_code || 'OS Drone', { detalhe: 'Edição de OS' });
    return data as DroneService;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase
      .from('drone_services' as any) as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await auditLogService.log('DELETE', 'DRONE_SERVICE', id, 'OS Drone (Excluída)');
  }
};
