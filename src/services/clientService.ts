import { supabase } from '@/integrations/supabase/client';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  phone: string;
  document: string;
  document_type: 'CPF' | 'CNPJ';
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Client[];
  },

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Client | null;
  },

  async create(client: CreateClientData): Promise<Client> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async update(id: string, client: Partial<CreateClientData>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async searchCNPJ(cnpj: string): Promise<any> {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    if (!response.ok) throw new Error('CNPJ não encontrado');
    return response.json();
  },

  async searchCEP(cep: string): Promise<any> {
    const cleanCEP = cep.replace(/\D/g, '');
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    if (!response.ok) throw new Error('CEP não encontrado');
    const data = await response.json();
    if (data.erro) throw new Error('CEP não encontrado');
    return data;
  },
};
