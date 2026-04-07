import { supabase } from '@/integrations/supabase/client';

export interface FinancingBank {
  id: string;
  name: string;
  min_rate: number;
  max_rate: number;
  min_installments: number;
  max_installments: number;
  max_grace_period: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateFinancingBankData {
  name: string;
  min_rate?: number;
  max_rate?: number;
  min_installments?: number;
  max_installments?: number;
  max_grace_period?: number;
  active?: boolean;
}

export const financingBankService = {
  async getAll(): Promise<FinancingBank[]> {
    const { data, error } = await supabase
      .from('financing_banks')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as FinancingBank[];
  },

  async getById(id: string): Promise<FinancingBank | null> {
    const { data, error } = await supabase
      .from('financing_banks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as FinancingBank | null;
  },

  async create(bank: CreateFinancingBankData): Promise<FinancingBank> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('financing_banks')
      .insert({
        ...bank,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as FinancingBank;
  },

  async update(id: string, bank: Partial<CreateFinancingBankData>): Promise<FinancingBank> {
    const { data, error } = await supabase
      .from('financing_banks')
      .update(bank)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as FinancingBank;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('financing_banks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
