import { supabase } from '@/integrations/supabase/client';

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  document_type: 'CPF' | 'CNPJ';
  contact_person?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  document?: string;
  document_type?: 'CPF' | 'CNPJ';
  contact_person?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  active?: boolean;
}

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Supplier[];
  },

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Supplier | null;
  },

  async create(supplier: CreateSupplierData): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async update(id: string, supplier: Partial<CreateSupplierData>): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
