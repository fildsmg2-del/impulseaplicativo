import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, Landmark, Filter, CheckSquare, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { accountService } from '@/services/accountService';
import { FINANCIAL_CATEGORIES, PAYMENT_METHODS } from '@/constants/financialConstants';
import { Supplier } from '@/services/supplierService';
import { Client } from '@/services/clientService';

interface FinancialHeaderProps {
  type: 'RECEITA' | 'DESPESA';
  filters: {
      startDate: Date;
      endDate: Date;
      search: string;
      accountId: string;
      status?: string;
      category?: string;
      paymentMethod?: string;
      supplierId?: string;
      clientId?: string;
  };
  onFilterChange: (filters: {
      startDate: Date;
      endDate: Date;
      search: string;
      accountId: string;
      status?: string;
      category?: string;
      paymentMethod?: string;
      supplierId?: string;
      clientId?: string;
  }) => void;
  summary: {
      vencidos: number;
      hoje: number;
      aVencer: number;
      liquidados: number;
      total: number;
  };
  selectedCount?: number;
  onBatchAction?: (action: string) => void;
  onExport?: () => void;
  suppliers?: Supplier[];
  clients?: Client[];
}

export function FinancialHeader({ 
  type, 
  filters, 
  onFilterChange, 
  summary, 
  selectedCount = 0, 
  onBatchAction, 
  onExport,
  suppliers = [],
  clients = []
}: FinancialHeaderProps) {
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-active'],
    queryFn: accountService.getActive,
  });

  const handlePrevMonth = () => {
    const newDate = subMonths(filters.startDate, 1);
    onFilterChange({
        ...filters,
        startDate: startOfMonth(newDate),
        endDate: endOfMonth(newDate),
    });
  };

  const handleNextMonth = () => {
    const newDate = addMonths(filters.startDate, 1);
    onFilterChange({
        ...filters,
        startDate: startOfMonth(newDate),
        endDate: endOfMonth(newDate),
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const monthLabel = format(filters.startDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Top Filters Bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vencimento</label>
          <div className="flex items-center border rounded-md h-10 bg-card overflow-hidden">
            <Button variant="ghost" size="icon" className="h-full rounded-none px-2" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 font-medium min-w-[140px] text-center capitalize border-x">
              {monthLabel}
            </div>
            <Button variant="ghost" size="icon" className="h-full rounded-none px-2" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pesquisar no período selecionado</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-10" 
              placeholder="Pesquisar..." 
            />
          </div>
        </div>

        <div className="w-52 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conta</label>
          <Select value={filters.accountId} onValueChange={(val) => onFilterChange({ ...filters, accountId: val })}>
            <SelectTrigger className="h-10">
              <div className="flex items-center gap-2 truncate">
                <Landmark className="h-4 w-4 text-impulse-gold" />
                <SelectValue placeholder="Selecionar todas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={`gap-2 h-10 ${filters.status || filters.category || filters.paymentMethod ? 'border-primary text-primary bg-primary/5' : 'text-slate-600'}`}>
                  <Filter className="h-4 w-4" />
                  Mais filtros
                  {(filters.status || filters.category || filters.paymentMethod || filters.supplierId || filters.clientId) && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-primary text-white">Ativo</Badge>
                  )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-sm uppercase tracking-tight">Filtros Adicionais</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onFilterChange({ 
                        ...filters, 
                        status: undefined, 
                        category: undefined, 
                        paymentMethod: undefined,
                        supplierId: undefined,
                        clientId: undefined
                      })} 
                      className="h-7 text-xs text-rose-500"
                    >
                      Limpar
                    </Button>
                </div>
                
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Situação</label>
                        <Select value={filters.status || 'all'} onValueChange={(v) => onFilterChange({ ...filters, status: v === 'all' ? undefined : v })}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="PENDENTE">Em Aberto</SelectItem>
                                <SelectItem value="PAGO">Liquidados</SelectItem>
                                <SelectItem value="ATRASADO">Vencidos</SelectItem>
                                <SelectItem value="CANCELADO">Cancelados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                        <div className="relative">
                            <Input 
                                list="header-categories"
                                className="h-9 text-xs" 
                                placeholder="Filtrar por categoria..." 
                                value={filters.category || ''}
                                onChange={(e) => onFilterChange({ ...filters, category: e.target.value || undefined })}
                            />
                            <datalist id="header-categories">
                                {[...FINANCIAL_CATEGORIES.RECEITA, ...FINANCIAL_CATEGORIES.DESPESA].map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Forma de Pagamento</label>
                        <Select value={filters.paymentMethod || 'all'} onValueChange={(v) => onFilterChange({ ...filters, paymentMethod: v === 'all' ? undefined : v })}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {type === 'DESPESA' && (
                        <div className="space-y-1.5 pt-2 border-t">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                Fornecedor
                                {filters.supplierId && (
                                    <button 
                                        onClick={() => onFilterChange({ ...filters, supplierId: undefined })} 
                                        className="text-rose-500 hover:text-rose-600 font-black text-[9px]"
                                    >
                                        REMOVER
                                    </button>
                                )}
                            </label>
                            <Select 
                                value={filters.supplierId || 'all'} 
                                onValueChange={(v) => onFilterChange({ ...filters, supplierId: v === 'all' ? undefined : v })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Todos os fornecedores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os fornecedores</SelectItem>
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {type === 'RECEITA' && (
                        <div className="space-y-1.5 pt-2 border-t">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                                Cliente
                                {filters.clientId && (
                                    <button 
                                        onClick={() => onFilterChange({ ...filters, clientId: undefined })} 
                                        className="text-rose-500 hover:text-rose-600 font-black text-[9px]"
                                    >
                                        REMOVER
                                    </button>
                                )}
                            </label>
                            <Select 
                                value={filters.clientId || 'all'} 
                                onValueChange={(v) => onFilterChange({ ...filters, clientId: v === 'all' ? undefined : v })}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Todos os clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os clientes</SelectItem>
                                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>

        {onExport && (
          <Button variant="outline" onClick={onExport} className="gap-2 h-10 border-emerald-600/50 text-emerald-600 hover:bg-emerald-50">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-0 border rounded-xl overflow-hidden bg-card divide-y sm:divide-y-0 sm:divide-x shadow-sm transition-all duration-300">
        <div className="p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Vencidos (R$)</p>
            <p className="text-lg font-bold text-rose-600">{formatCurrency(summary.vencidos)}</p>
        </div>
        <div className="p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Vencem hoje (R$)</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.hoje)}</p>
        </div>
        <div className="p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">A vencer (R$)</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(summary.aVencer)}</p>
        </div>
        <div className="p-4 text-center bg-emerald-50/50 dark:bg-emerald-500/5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{type === 'RECEITA' ? 'Recebidos' : 'Pagos'} (R$)</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(summary.liquidados)}</p>
        </div>
        <div className="p-4 text-center bg-blue-50/50 dark:bg-blue-600/5 border-l-2 border-l-blue-600/20">
            <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest mb-1">Total do período (R$)</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-400">{formatCurrency(summary.total)}</p>
        </div>
      </div>

      {/* Batch Actions Bar */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>{selectedCount} registro(s) selecionado(s)</span>
            </div>
            {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-blue-600 h-8">Renegociar</Button>
                    <Select onValueChange={onBatchAction}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                             <SelectValue placeholder="Ações em lote" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="markAsPaid">{type === 'RECEITA' ? 'Marcar como Recebido' : 'Marcar como Pago'}</SelectItem>
                            <SelectItem value="delete">Excluir Selecionados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
