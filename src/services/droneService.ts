import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
  display_code?: string;
  client?: {
    name: string;
  };
  technician?: {
    name: string;
  };
}

export const droneService = {
  async getAll(): Promise<DroneService[]> {
    try {
      const { data, error } = await (supabase
        .from('drone_services' as any) as any)
        .select(`
          *,
          technician:profiles(name)
        `)
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
  },

  async create(service: Partial<DroneService>): Promise<DroneService> {
    const { data, error } = await (supabase
      .from('drone_services' as any) as any)
      .insert(service)
      .select()
      .single();

    if (error) throw error;
    return data as DroneService;
  }
};
