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
  competence_date?: string;
  category?: string;
  cost_center?: string;
  payment_method?: string;
  reference_code?: string;
  nsu?: string;
  attachment_url?: string;
  installment_number?: number;
  total_installments?: number;
  parent_id?: string;
  recurrence?: string;
  client_id?: string;
  client_name_manual?: string;
  project_id?: string;
  service_order_id?: string;
  drone_service_id?: string;

  supplier_id?: string;
  supplier_name_manual?: string;
  account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSplit {
  cost_center_id: string;
  percentage?: number;
  amount?: number;
}

export interface CreateTransactionData {
  type: TransactionType;
  status?: TransactionStatus;
  description: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  competence_date?: string;
  category?: string;
  cost_center?: string;
  payment_method?: string;
  reference_code?: string;
  nsu?: string;
  attachment_url?: string;
  client_id?: string;
  client_name_manual?: string;
  project_id?: string;
  service_order_id?: string;
  drone_service_id?: string;

  supplier_id?: string;
  supplier_name_manual?: string;
  account_id?: string;
  notes?: string;
  installment_number?: number;
  total_installments?: number;
  parent_id?: string;
  splits?: TransactionSplit[];
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
  async getAll(filters?: { 
    type?: TransactionType; 
    status?: TransactionStatus; 
    startDate?: string; 
    endDate?: string;
    account_id?: string;
    project_id?: string;
    service_order_id?: string;
    drone_service_id?: string;
  }): Promise<Transaction[]> {
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
    if (filters?.account_id && filters.account_id !== 'all') {
      query = query.eq('account_id', filters.account_id);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.service_order_id) {
      query = query.eq('service_order_id', filters.service_order_id);
    }
    if (filters?.drone_service_id) {
      query = query.eq('drone_service_id', filters.drone_service_id);
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
    const { splits, ...txData } = transaction;
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...txData, created_by: user?.id })
      .select()
      .single();

    if (error) throw error;

    if (splits && splits.length > 0) {
      const splitInserts = splits.map(s => ({
        transaction_id: data.id,
        cost_center_id: s.cost_center_id,
        percentage: s.percentage,
        amount: s.amount
      }));
      await supabase.from('transaction_splits').insert(splitInserts);
    }

    return data as Transaction;
  },

  async createBatch(transaction: CreateTransactionData, installments: number): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    const createdTransactions: Transaction[] = [];
    const parentId = crypto.randomUUID();
    const { splits, ...txData } = transaction;

    for (let i = 1; i <= installments; i++) {
        const dueDate = new Date(transaction.due_date);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));

        const installmentData = {
            ...txData,
            due_date: dueDate.toISOString().split('T')[0],
            installment_number: i,
            total_installments: installments,
            parent_id: i === 1 ? undefined : parentId,
            created_by: user?.id,
            amount: transaction.amount / installments
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert(installmentData)
            .select()
            .single();

        if (error) throw error;
        
        // Handle splits for each installment
        if (splits && splits.length > 0) {
            const splitInserts = splits.map(s => ({
                transaction_id: data.id,
                cost_center_id: s.cost_center_id,
                percentage: s.percentage,
                amount: (s.amount || 0) / installments
            }));
            await supabase.from('transaction_splits').insert(splitInserts);
        }

        createdTransactions.push(data as Transaction);
    }

    return createdTransactions;
  },

  async createBatchMany(transactions: CreateTransactionData[]): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const formatted = transactions.map(t => ({
      ...t,
      created_by: user?.id
    }));

    const { error } = await supabase
      .from('transactions')
      .insert(formatted);

    if (error) throw error;
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

  async getSummary(filters?: { 
    account_id?: string; 
    startDate?: string; 
    endDate?: string;
    project_id?: string;
    service_order_id?: string;
    drone_service_id?: string;
  }): Promise<FinancialSummary> {
    let query = supabase
      .from('transactions')
      .select('type, status, amount');

    if (filters?.account_id && filters.account_id !== 'all') {
      query = query.eq('account_id', filters.account_id);
    }
    if (filters?.startDate) {
      query = query.gte('due_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('due_date', filters.endDate);
    }
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters?.service_order_id) {
      query = query.eq('service_order_id', filters.service_order_id);
    }
    if (filters?.drone_service_id) {
      query = query.eq('drone_service_id', filters.drone_service_id);
    }

    const { data, error } = await query;

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
