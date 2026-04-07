import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, CheckCircle2, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { transactionService, Transaction, CreateTransactionData, TransactionStatus } from '@/services/transactionService';
import { supplierService } from '@/services/supplierService';
import { accountService } from '@/services/accountService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FinancialHeader } from '@/components/financial/FinancialHeader';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { csvService } from '@/services/csvService';
import { TransactionFormModal } from '@/components/financial/TransactionFormModal';
import { ExportFinancialDialog } from '@/components/financial/ExportFinancialDialog';

const STATUS_COLORS: Record<TransactionStatus, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  PAGO: 'bg-rose-100 text-rose-700 border-rose-200',
  ATRASADO: 'bg-rose-600 text-white border-rose-700',
  CANCELADO: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDENTE: 'Em Aberto',
  PAGO: 'Pago',
  ATRASADO: 'Vencido',
  CANCELADO: 'Cancelado',
};

export default function FinancialPayables() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filters, setFilters] = useState<{
    startDate: Date;
    endDate: Date;
    search: string;
    accountId: string;
    status?: string;
    category?: string;
    paymentMethod?: string;
  }>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    search: '',
    accountId: 'all',
    status: undefined,
    category: undefined,
    paymentMethod: undefined,
  });

  const [formData, setFormData] = useState<CreateTransactionData>({
    type: 'DESPESA',
    status: 'PENDENTE',
    description: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    category: '',
    notes: '',
    account_id: undefined
  });

  // Queries
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', 'DESPESA', filters],
    queryFn: () => transactionService.getAll({
      type: 'DESPESA',
      startDate: filters.startDate.toISOString(),
      endDate: filters.endDate.toISOString(),
      account_id: filters.accountId
    }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-active'],
    queryFn: accountService.getActive,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierService.getAll,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (args: { data: CreateTransactionData, installments: number }): Promise<any> => 
        args.installments > 1 
            ? transactionService.createBatch(args.data, args.installments)
            : transactionService.create(args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento(s) criado(s) com sucesso!');
      setIsDialogOpen(false);
      setEditingTransaction(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionData> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Lançamento atualizado!');
      setIsDialogOpen(false);
      setEditingTransaction(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Removido com sucesso');
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: transactionService.markAsPaid,
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        toast.success('Pagamento confirmado!');
    }
  });

  // Handlers
  const resetForm = useCallback(() => {
    setEditingTransaction(null);
    setIsDialogOpen(false);
  }, []);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleModalSubmit = (data: CreateTransactionData, installments: number) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate({ data, installments });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  // Calculations
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = !filters.status || t.status === filters.status;
        const matchesCategory = !filters.category || t.category?.toLowerCase() === filters.category.toLowerCase();
        const matchesPayment = !filters.paymentMethod || t.payment_method === filters.paymentMethod;
        
        return matchesSearch && matchesStatus && matchesCategory && matchesPayment;
    });
  }, [transactions, filters]);

  const summary = useMemo(() => {
    const s = { vencidos: 0, hoje: 0, aVencer: 0, liquidados: 0, total: 0 };
    const today = new Date().toISOString().split('T')[0];

    filteredTransactions.forEach(t => {
        const amt = Number(t.amount);
        s.total += amt;
        if (t.status === 'PAGO') {
            s.liquidados += amt;
        } else {
            if (t.due_date < today) s.vencidos += amt;
            else if (t.due_date === today) s.hoje += amt;
            else s.aVencer += amt;
        }
    });
    return s;
  }, [filteredTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-destructive">Contas a Pagar</h1>
              <p className="text-muted-foreground">Gerencie suas obrigações, impostos e fornecedores</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-destructive hover:bg-destructive/90 text-white gap-2">
                <Plus className="h-4 w-4" /> Nova Despesa
            </Button>
            <TransactionFormModal 
                type="DESPESA"
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                transaction={editingTransaction}
                onSubmit={handleModalSubmit}
            />
            <ExportFinancialDialog 
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                accounts={accounts}
                transactions={filteredTransactions}
                type="DESPESA"
                dateRange={{ start: filters.startDate, end: filters.endDate }}
            />
        </div>

        <FinancialHeader 
            type="DESPESA"
            filters={filters}
            onFilterChange={setFilters}
            summary={summary}
            selectedCount={selectedIds.length}
            onExport={handleExport}
            onBatchAction={(action) => {
                if (action === 'markAsPaid') {
                    selectedIds.forEach(id => markAsPaidMutation.mutate(id));
                    setSelectedIds([]);
                }
                if (action === 'delete') {
                    setBulkDeleteOpen(true);
                }
            }}
        />

        {/* Results Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="w-12 text-center">
                            <Checkbox 
                                checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0} 
                                onCheckedChange={toggleSelectAll}
                            />
                        </TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Vencimento</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Pagamento</TableHead>
                        <TableHead className="text-xs uppercase font-bold text-muted-foreground">Resumo do Lançamento</TableHead>
                        <TableHead className="text-right text-xs uppercase font-bold text-muted-foreground">Total (R$)</TableHead>
                        <TableHead className="text-right text-xs uppercase font-bold text-muted-foreground">A Pagar (R$)</TableHead>
                        <TableHead className="text-center text-xs uppercase font-bold text-muted-foreground">Situação</TableHead>
                        <TableHead className="w-20"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-20 text-muted-foreground animate-pulse">Buscando lançamentos...</TableCell></TableRow>
                    ) : filteredTransactions.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">Nenhum registro encontrado para este período.</TableCell></TableRow>
                    ) : (
                        filteredTransactions.map((t) => (
                            <TableRow key={t.id} className="hover:bg-muted/10 group transition-colors">
                                <TableCell className="text-center">
                                     <Checkbox 
                                        checked={selectedIds.includes(t.id)} 
                                        onCheckedChange={() => toggleSelect(t.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                    {format(parseISO(t.due_date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {t.status === 'PAGO' && t.paid_date ? format(parseISO(t.paid_date), 'dd/MM/yyyy') : '-'}
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-semibold text-sm">{t.description}</p>
                                        <div className="flex gap-2 mt-0.5">
                                            {t.category && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded uppercase font-bold text-muted-foreground opacity-70">{t.category}</span>}
                                            {t.account_id && <span className="text-[10px] text-impulse-gold font-bold uppercase">{accounts.find(a => a.id === t.account_id)?.name}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-sm">
                                    {formatCurrency(t.amount)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-sm text-rose-600">
                                    {t.status === 'PAGO' ? '-' : formatCurrency(t.amount)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className={`font-bold px-3 py-1 ${STATUS_COLORS[t.status]}`}>
                                        {STATUS_LABELS[t.status]}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => handleEdit(t)} className="gap-2 cursor-pointer">
                                                <Edit className="h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => markAsPaidMutation.mutate(t.id)} className="gap-2 cursor-pointer text-emerald-600">
                                                <CheckCircle2 className="h-4 w-4" /> Baixar Pagamento
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => deleteMutation.mutate(t.id)} className="gap-2 cursor-pointer text-rose-600">
                                                <Trash2 className="h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            
            {/* Table Footer / Summary (Expandable) */}
            <div className="bg-white dark:bg-slate-800 border-t shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]">
                <div 
                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                >
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-100">Totais do período</span>
                        <p className="text-slate-400 text-xs font-medium">
                            {format(filters.startDate, 'dd/MM/yyyy')} a {format(filters.endDate, 'dd/MM/yyyy')}
                        </p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                             <span className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter block mb-0.5">Totais do período (R$)</span>
                             <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                 {formatCurrency(summary.total)}
                             </span>
                        </div>
                        <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`}>
                            <ChevronUp className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                {isSummaryExpanded && (
                    <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="space-y-1 p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                            <span className="text-[10px] font-bold text-orange-600 uppercase">Em aberto (A vencer) (R$):</span>
                            <p className="text-lg font-bold text-slate-700">{formatCurrency(summary.aVencer)}</p>
                        </div>
                        <div className="space-y-1 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Em aberto (Vence hoje) (R$):</span>
                            <p className="text-lg font-bold text-slate-700">{formatCurrency(summary.hoje)}</p>
                        </div>
                        <div className="space-y-1 p-3 rounded-lg bg-rose-50/50 border border-rose-100">
                            <span className="text-[10px] font-bold text-rose-600 uppercase">Em aberto (Vencido) (R$):</span>
                            <p className="text-lg font-bold text-slate-700">{formatCurrency(summary.vencidos)}</p>
                        </div>
                        <div className="space-y-1 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Pagos (R$):</span>
                            <p className="text-lg font-bold text-slate-700">{formatCurrency(summary.liquidados)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.length} lançamento(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                selectedIds.forEach(id => deleteMutation.mutate(id));
                setSelectedIds([]);
                setBulkDeleteOpen(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
