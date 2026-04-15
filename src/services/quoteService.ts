import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Client } from '@/services/clientService';
import { auditLogService } from '@/services/auditLogService';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
export type RoofType = 'CERAMICA' | 'FIBROCIMENTO' | 'METALICA' | 'LAJE';

export interface AdditionalCostItem {
  id: string;
  description: string;
  value: number;
}

export interface Quote {
  id: string;
  client_id?: string;
  status: QuoteStatus;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  latitude?: number;
  longitude?: number;
  roof_type?: RoofType;
  energy_distributor?: string;
  phase_type?: string;
  average_monthly_kwh?: number;
  tariff?: number;
  fio_b?: number;
  tariff_group?: string;
  tariff_subgroup?: string;
  simultaneity_factor?: number;
  compensated_energy_tax?: number;
  availability_cost?: number;
  monthly_bills?: number[];
  recommended_power_kwp?: number;
  estimated_generation_kwh?: number;
  modules_quantity?: number;
  inverter_power_kw?: number;
  modules?: string;
  inverter?: string;
  structure?: string;
  cables_connectors?: string;
  installation?: boolean;
  homologation?: boolean;
  monitoring?: boolean;
  equipment_cost?: number;
  labor_cost?: number;
  additional_costs?: number;
  additional_cost_items?: AdditionalCostItem[];
  discount?: number;
  total?: number;
  monthly_savings?: number;
  payback_months?: number;
  roi_25_years?: number;
  payment_type?: string;
  financing_bank?: string;
  financing_installments?: number;
  financing_rate?: number;
  financing_down_payment?: number;
  financing_installment_value?: number;
  signature_token?: string;
  client_signature?: string;
  client_signed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteData {
  client_id?: string;
  status?: QuoteStatus;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;
  latitude?: number;
  longitude?: number;
  roof_type?: RoofType;
  energy_distributor?: string;
  phase_type?: string;
  average_monthly_kwh?: number;
  tariff?: number;
  fio_b?: number;
  tariff_group?: string;
  tariff_subgroup?: string;
  simultaneity_factor?: number;
  compensated_energy_tax?: number;
  availability_cost?: number;
  monthly_bills?: number[];
  recommended_power_kwp?: number;
  estimated_generation_kwh?: number;
  modules_quantity?: number;
  inverter_power_kw?: number;
  modules?: string;
  inverter?: string;
  structure?: string;
  cables_connectors?: string;
  installation?: boolean;
  homologation?: boolean;
  monitoring?: boolean;
  equipment_cost?: number;
  labor_cost?: number;
  additional_costs?: number;
  additional_cost_items?: AdditionalCostItem[];
  discount?: number;
  total?: number;
  monthly_savings?: number;
  payback_months?: number;
  roi_25_years?: number;
  payment_type?: string;
  financing_bank?: string;
  financing_installments?: number;
  financing_rate?: number;
  financing_down_payment?: number;
  financing_installment_value?: number;
  signature_token?: string;
  client_signature?: string;
  client_signed_at?: string;
}

export interface QuoteFormData extends CreateQuoteData {
  client?: Client;
}

export const createAdditionalItem = (overrides?: Partial<AdditionalCostItem>) => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `additional-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  value: 0,
  ...overrides,
});

const mapQuoteFromDb = (data: unknown): Quote => {
  const row = data as Record<string, unknown>;
  return {
    ...row,
    additional_cost_items: row.additional_cost_items as AdditionalCostItem[] | undefined,
    monthly_bills: row.monthly_bills as number[] | undefined,
  } as Quote;
};

export const quoteService = {
  async getAll(): Promise<Quote[]> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapQuoteFromDb);
  },

  async getById(id: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapQuoteFromDb(data) : null;
  },

  async create(quote: CreateQuoteData): Promise<Quote> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const sessionUser = sessionData.session?.user;
    const { data: userData, error: userError } = sessionUser
      ? { data: { user: sessionUser }, error: null }
      : await supabase.auth.getUser();
    const user = sessionUser ?? userData.user;

    if (sessionError || userError) {
      console.error('User not authenticated:', sessionError ?? userError);
    }

    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }
    
    const insertData = {
      ...quote,
      created_by: user.id,
      additional_cost_items: quote.additional_cost_items as unknown as Json,
      monthly_bills: quote.monthly_bills as unknown as Json,
    };
    
    const { data, error } = await supabase
      .from('quotes')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('CREATE', 'QUOTE', data.id, 'Orçamento Gerado');
    return mapQuoteFromDb(data);
  },

  async update(id: string, quote: Partial<CreateQuoteData>): Promise<Quote> {
    const updateData = {
      ...quote,
      additional_cost_items: quote.additional_cost_items as unknown as Json,
      monthly_bills: quote.monthly_bills as unknown as Json,
    };
    
    const { data, error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await auditLogService.log('UPDATE', 'QUOTE', data.id, 'Orçamento Editado');
    return mapQuoteFromDb(data);
  },

  async delete(id: string): Promise<void> {
    // First, delete related sales
    await supabase
      .from('sales')
      .delete()
      .eq('quote_id', id);

    // Then, update related projects to remove quote reference
    await supabase
      .from('projects')
      .update({ quote_id: null })
      .eq('quote_id', id);

    // Now delete the quote
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await auditLogService.log('DELETE', 'QUOTE', id, 'Orçamento Excluído');
  },

  async deleteMany(ids: string[]): Promise<void> {
    // First, delete related sales
    await supabase
      .from('sales')
      .delete()
      .in('quote_id', ids);

    // Then, update related projects to remove quote reference
    await supabase
      .from('projects')
      .update({ quote_id: null })
      .in('quote_id', ids);

    // Now delete the quotes
    const { error } = await supabase
      .from('quotes')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  async updateStatus(id: string, status: QuoteStatus): Promise<Quote> {
    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let actionType: any = 'UPDATE';
    if (status === 'APPROVED') actionType = 'APPROVE';
    if (status === 'REJECTED') actionType = 'REJECT';
    
    await auditLogService.log(actionType, 'QUOTE', data.id, 'Alteração de Status de Orçamento', { novo_status: status });
    return mapQuoteFromDb(data);
  },

  async generateSignatureToken(id: string): Promise<string> {
    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '');
    
    const { error } = await supabase
      .from('quotes')
      .update({ 
        signature_token: token,
        status: 'SENT'
      })
      .eq('id', id);

    if (error) throw error;
    return token;
  },

  async getByToken(token: string): Promise<Quote | null> {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('signature_token', token)
      .maybeSingle();

    if (error) throw error;
    return data ? mapQuoteFromDb(data) : null;
  },
};
