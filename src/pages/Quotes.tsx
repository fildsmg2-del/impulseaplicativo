import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, ArrowRight, Trash2, CheckSquare, Square } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';
import { quoteService, Quote } from '@/services/quoteService';
import { clientService, Client } from '@/services/clientService';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

const statusConfig = {
  DRAFT: { label: 'Rascunho', icon: FileText, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200' },
  SENT: { label: 'Enviado', icon: Clock, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100' },
  APPROVED: { label: 'Aprovado', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100' },
  REJECTED: { label: 'Rejeitado', icon: XCircle, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function Quotes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const canDelete = hasRole(['MASTER', 'DEV']);
  const canOpenWizard = !hasRole(['TECNICO']);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | undefined>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    try {
      const [quotesData, clientsData] = await Promise.all([
        quoteService.getAll(),
        clientService.getAll(),
      ]);
      setQuotes(quotesData);
      const clientsMap: Record<string, Client> = {};
      clientsData.forEach((c) => (clientsMap[c.id] = c));
      setClients(clientsMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenWizard = useCallback((quoteId?: string) => {
    if (!canOpenWizard) return;
    setEditingQuoteId(quoteId);
    setShowWizard(true);
  }, [canOpenWizard]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check for quote ID or new quote with client in URL
  useEffect(() => {
    const quoteId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const clientId = searchParams.get('client_id');
    
    if (isNew) {
      if (canOpenWizard) {
        if (clientId) setPreselectedClientId(clientId);
        handleOpenWizard();
      }
      setSearchParams({});
    } else if (quoteId && !isLoading && quotes.length > 0) {
      const quoteExists = quotes.some(q => q.id === quoteId);
      if (quoteExists) {
        if (canOpenWizard) {
          handleOpenWizard(quoteId);
        }
        setSearchParams({});
      }
    }
  }, [searchParams, isLoading, quotes, canOpenWizard, handleOpenWizard, setSearchParams]);



  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingQuoteId(undefined);
    setPreselectedClientId(undefined);
    loadData();
  };

  const handleDeleteQuote = async (e: React.MouseEvent, quoteId: string) => {
    e.stopPropagation();
    try {
      await quoteService.delete(quoteId);
      toast.success('Orçamento excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Erro ao excluir orçamento.');
    }
  };

  const handleToggleSelect = (e: React.MouseEvent, quoteId: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(quoteId)) {
        newSet.delete(quoteId);
      } else {
        newSet.add(quoteId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredQuotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuotes.map((q) => q.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await quoteService.deleteMany(Array.from(selectedIds));
      toast.success(`${selectedIds.size} orçamento(s) excluído(s) com sucesso!`);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Error deleting quotes:', error);
      toast.error('Erro ao excluir orçamentos.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredQuotes = quotes.filter((quote) => {
    const client = quote.client_id ? clients[quote.client_id] : null;
    // Se não há busca, mostra todos. Se há busca, filtra pelo nome do cliente
    const matchesSearch = !search.trim() || (client?.name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const {
    paginatedItems: paginatedQuotes,
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage,
  } = usePagination(filteredQuotes, { itemsPerPage: 6 });

  useEffect(() => {
    resetPage();
  }, [search, statusFilter, resetPage]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie orçamentos de sistemas fotovoltaicos
          </p>
        </div>
        {canOpenWizard && (
          <button
            onClick={() => handleOpenWizard()}
            className="flex items-center gap-2 px-4 py-2.5 gradient-gold text-primary font-medium rounded-xl hover:shadow-gold transition-all"
          >
            <Plus className="h-5 w-5" />
            Novo Orçamento
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = quotes.filter((q) => q.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={cn(
                'p-4 rounded-xl border transition-all',
                statusFilter === key
                  ? 'border-secondary bg-secondary/5'
                  : 'border-border bg-card hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <config.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orçamento..."
            className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
          />
        </div>

        {canDelete && filteredQuotes.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="gap-2"
            >
              {selectedIds.size === filteredQuotes.length ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selectedIds.size === filteredQuotes.length ? 'Desmarcar' : 'Selecionar Todos'}
            </Button>

            {selectedIds.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Orçamentos</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedIds.size} orçamento(s)? As vendas associadas também serão excluídas. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir {selectedIds.size} orçamento(s)
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          paginatedQuotes.map((quote, i) => {
            const status = statusConfig[quote.status as keyof typeof statusConfig];
            const client = quote.client_id ? clients[quote.client_id] : null;
            const isSelected = selectedIds.has(quote.id);
            return (
              <div
                key={quote.id}
                onClick={() => handleOpenWizard(quote.id)}
                className={cn(
                  'bg-card rounded-2xl border p-5 shadow-impulse hover:shadow-lg transition-all animate-fade-in flex items-center gap-4 cursor-pointer',
                  isSelected ? 'border-secondary ring-2 ring-secondary/20' : 'border-border'
                )}
                style={{ animationDelay: `${(i + 3) * 100}ms` }}
              >
                {/* Selection Checkbox */}
                {canDelete && (
                  <div
                    onClick={(e) => handleToggleSelect(e, quote.id)}
                    className="p-1"
                  >
                    <Checkbox
                      checked={isSelected}
                      className="h-5 w-5"
                    />
                  </div>
                )}

                <div className={cn('p-3 rounded-xl', status.color)}>
                  <status.icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {client?.name || 'Cliente não informado'}
                    </h3>
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors', status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {quote.recommended_power_kwp?.toFixed(2) || 0} kWp • Criado em {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(quote.total || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quote.address_city}/{quote.address_state}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este orçamento? As vendas associadas também serão excluídas. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e) => handleDeleteQuote(e, quote.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isLoading && filteredQuotes.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground">Nenhum orçamento encontrado.</p>
        </div>
      )}

      {!isLoading && filteredQuotes.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
        />
      )}

      {/* Wizard Modal */}
      {showWizard && (
        <QuoteWizard quoteId={editingQuoteId} preselectedClientId={preselectedClientId} onClose={handleCloseWizard} />
      )}
    </AppLayout>
  );
}
