import { supabase } from '@/integrations/supabase/client';

export interface ServiceType {
  id: string;
  name: string;
  deadline_days: number;
  active: boolean;
  checklist_template: ServiceTypeChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ServiceTypeChecklistItem {
  id: string;
  label: string;
}

export interface CreateServiceTypeData {
  name: string;
  deadline_days: number;
  active?: boolean;
  checklist_template?: ServiceTypeChecklistItem[];
}

const parseServiceType = (row: any): ServiceType => ({
  ...row,
  checklist_template: Array.isArray(row.checklist_template) 
    ? row.checklist_template 
    : [],
});

export const serviceTypeService = {
  async getAll(): Promise<ServiceType[]> {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(parseServiceType);
  },

  async getActive(): Promise<ServiceType[]> {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return (data || []).map(parseServiceType);
  },

  async create(serviceType: CreateServiceTypeData): Promise<ServiceType> {
    const { data, error } = await supabase
      .from('service_types')
      .insert({
        name: serviceType.name,
        deadline_days: serviceType.deadline_days,
        active: serviceType.active ?? true,
        checklist_template: (serviceType.checklist_template ?? []) as any,
      })
      .select()
      .single();

    if (error) throw error;
    return parseServiceType(data);
  },

  async update(id: string, serviceType: Partial<CreateServiceTypeData>): Promise<ServiceType> {
    const { data, error } = await supabase
      .from('service_types')
      .update(serviceType as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseServiceType(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('service_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getById(id: string): Promise<ServiceType | null> {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? parseServiceType(data) : null;
  },
};
