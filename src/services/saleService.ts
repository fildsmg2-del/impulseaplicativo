import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface SaleItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface PaymentDetails {
  method: string;
  installments?: number;
  bank?: string;
  entry_value?: number;
  monthly_value?: number;
}

export interface Sale {
  id: string;
  sale_number: string;
  quote_id?: string;
  client_id?: string;
  project_id?: string;
  sale_date: string;
  estimated_completion_date?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method?: string;
  payment_details?: PaymentDetails;
  payment_status: string;
  approval_status: string;
  client_signature?: string;
  company_signature?: string;
  client_signed_at?: string;
  company_signed_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSaleData {
  quote_id?: string;
  client_id?: string;
  project_id?: string;
  sale_date?: string;
  estimated_completion_date?: string;
  items?: SaleItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  payment_method?: string;
  payment_details?: PaymentDetails;
  payment_status?: string;
  approval_status?: string;
  notes?: string;
}

const parseSaleData = (data: any): Sale => {
  return {
    ...data,
    items: (data.items as unknown as SaleItem[]) || [],
    payment_details: data.payment_details as unknown as PaymentDetails | undefined,
  };
};

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(parseSaleData);
  },

  async getById(id: string): Promise<Sale | null> {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    
    return parseSaleData(data);
  },

  async create(sale: CreateSaleData): Promise<Sale> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const insertData: any = {
      quote_id: sale.quote_id,
      client_id: sale.client_id,
      project_id: sale.project_id,
      sale_date: sale.sale_date,
      estimated_completion_date: sale.estimated_completion_date,
      items: sale.items || [],
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      payment_method: sale.payment_method,
      payment_details: sale.payment_details || null,
      payment_status: sale.payment_status,
      approval_status: sale.approval_status,
      notes: sale.notes,
      created_by: user?.id,
    };
    
    const { data, error } = await supabase
      .from('sales')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },

  async update(id: string, sale: Partial<CreateSaleData>): Promise<Sale> {
    const updateData: any = { ...sale };
    if (sale.items) {
      updateData.items = sale.items as unknown as Json;
    }
    if (sale.payment_details !== undefined) {
      updateData.payment_details = (sale.payment_details || null) as unknown as Json;
    }

    const { data, error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateApprovalStatus(id: string, status: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({ approval_status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },

  async updatePaymentStatus(id: string, status: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({ payment_status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },

  async signClient(id: string, signature: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({
        client_signature: signature,
        client_signed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },

  async signCompany(id: string, signature: string): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({
        company_signature: signature,
        company_signed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return parseSaleData(data);
  },
};
