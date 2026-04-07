import { supabase } from '@/integrations/supabase/client';

export type DroneServiceStatus = 'PENDENTE' | 'TECNICO' | 'REVISAO' | 'FINALIZADO';

export interface DroneService {
  id: string;
  client_name: string;
  client_document?: string;
  client_phone?: string;
  client_cep?: string;
  client_address_street?: string;
  client_address_number?: string;
  client_address_neighborhood?: string;
  client_address_complement?: string;
  client_address_city?: string;
  client_address_state?: string;
  service_description: string;
  area_hectares?: number;
  product_used?: string;
  location_link?: string;
  status: DroneServiceStatus;
  technician_id?: string;
  office_notes?: string;
  technician_notes?: string;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateDroneServiceData {
  client_name: string;
  client_document?: string;
  client_phone?: string;
  client_cep?: string;
  client_address_street?: string;
  client_address_number?: string;
  client_address_neighborhood?: string;
  client_address_complement?: string;
  client_address_city?: string;
  client_address_state?: string;
  service_description: string;
  area_hectares?: number;
  product_used?: string;
  location_link?: string;
  status?: DroneServiceStatus;
  technician_id?: string;
  office_notes?: string;
  technician_notes?: string;
  attachment_url?: string;
}

export const droneService = {
  async getAll(filters?: { status?: DroneServiceStatus; search?: string }): Promise<DroneService[]> {
    let query = (supabase
      .from('drone_services' as any) as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.or(`client_name.ilike.%${filters.search}%,client_document.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as DroneService[];
  },

  async create(data: CreateDroneServiceData): Promise<DroneService> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: newService, error } = await (supabase
      .from('drone_services' as any) as any)
      .insert({ ...data, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    return newService as DroneService;
  },

  async update(id: string, data: Partial<CreateDroneServiceData>): Promise<DroneService> {
    const { data: updatedService, error } = await (supabase
      .from('drone_services' as any) as any)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updatedService as DroneService;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase
      .from('drone_services' as any) as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
