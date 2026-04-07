import { supabase } from '@/integrations/supabase/client';

export type TransactionType = 'RECEITA' | 'DESPESA';
export type TransactionStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  category?: string;
  client_id?: string;
  project_id?: string;
  supplier_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionData {
  type: TransactionType;
  status?: TransactionStatus;
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  category?: string;
  client_id?: string;
  project_id?: string;
  supplier_id?: string;
  notes?: string;
}

export interface FinancialSummary {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  receitasPendentes: number;
  despesasPendentes: number;
  receitasAtrasadas: number;
  despesasAtrasadas: number;
}

export const transactionService = {
  async getAll(filters?: { type?: TransactionType; status?: TransactionStatus; startDate?: string; endDate?: string }): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('due_date', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.startDate) {
      query = query.gte('due_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('due_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Transaction[];
  },

  async getById(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Transaction | null;
  },

  async create(transaction: CreateTransactionData): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...transaction, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  async update(id: string, transaction: Partial<CreateTransactionData>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async markAsPaid(id: string): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        status: 'PAGO' as TransactionStatus, 
        paid_date: new Date().toISOString().split('T')[0] 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Transaction;
  },

  async getSummary(): Promise<FinancialSummary> {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, status, amount');

    if (error) throw error;

    const transactions = (data || []) as { type: TransactionType; status: TransactionStatus; amount: number }[];

    const summary: FinancialSummary = {
      totalReceitas: 0,
      totalDespesas: 0,
      saldo: 0,
      receitasPendentes: 0,
      despesasPendentes: 0,
      receitasAtrasadas: 0,
      despesasAtrasadas: 0,
    };

    transactions.forEach((t) => {
      if (t.type === 'RECEITA') {
        if (t.status === 'PAGO') summary.totalReceitas += Number(t.amount);
        if (t.status === 'PENDENTE') summary.receitasPendentes += Number(t.amount);
        if (t.status === 'ATRASADO') summary.receitasAtrasadas += Number(t.amount);
      } else {
        if (t.status === 'PAGO') summary.totalDespesas += Number(t.amount);
        if (t.status === 'PENDENTE') summary.despesasPendentes += Number(t.amount);
        if (t.status === 'ATRASADO') summary.despesasAtrasadas += Number(t.amount);
      }
    });

    summary.saldo = summary.totalReceitas - summary.totalDespesas;

    return summary;
  },
};
