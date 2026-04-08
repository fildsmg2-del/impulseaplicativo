import { useState } from 'react';
import { GripVertical, User, Calendar, CircleDollarSign } from 'lucide-react';
import { Quote, QuoteStatus, quoteService } from '@/services/quoteService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

const FUNNEL_STAGES: Array<{
  key: QuoteStatus;
  label: string;
  headerClass: string;
  badgeClass: string;
}> = [
  {
    key: 'DRAFT',
    label: 'Leads',
    headerClass: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeClass: 'bg-slate-200 text-slate-700',
  },
  {
    key: 'SENT',
    label: 'Proposta enviada',
    headerClass: 'bg-blue-50 text-blue-700 border-blue-100',
    badgeClass: 'bg-blue-200 text-blue-800',
  },
  {
    key: 'REJECTED',
    label: 'Negociação',
    headerClass: 'bg-amber-50 text-amber-700 border-amber-100',
    badgeClass: 'bg-amber-200 text-amber-800',
  },
  {
    key: 'APPROVED',
    label: 'Em fechamento',
    headerClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    badgeClass: 'bg-emerald-200 text-emerald-800',
  },
];

interface QuoteKanbanProps {
  quotes: Quote[];
  clientNames: Record<string, string>;
  creatorNames: Record<string, string>;
  onQuoteUpdate: () => void;
  onQuoteClick?: (quote: Quote) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function QuoteKanban({
  quotes,
  clientNames,
  creatorNames,
  onQuoteUpdate,
  onQuoteClick,
}: QuoteKanbanProps) {
  const { user, hasRole } = useAuth();
  const [draggedQuote, setDraggedQuote] = useState<Quote | null>(null);
  const [dragOverStage, setDragOverStage] = useState<QuoteStatus | null>(null);

  const canMoveQuote = (quote: Quote) => hasRole(['MASTER']) || quote.created_by === user?.id;

  const handleDragStart = (e: React.DragEvent, quote: Quote) => {
    if (!canMoveQuote(quote)) {
      toast.error('Você não tem permissão para mover este orçamento.');
      return;
    }
    setDraggedQuote(quote);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: QuoteStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageKey: QuoteStatus) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedQuote || draggedQuote.status === stageKey) {
      setDraggedQuote(null);
      return;
    }

    if (!canMoveQuote(draggedQuote)) {
      toast.error('Você não tem permissão para mover este orçamento.');
      setDraggedQuote(null);
      return;
    }

    try {
      await quoteService.updateStatus(draggedQuote.id, stageKey);
      toast.success(`Orçamento movido para ${FUNNEL_STAGES.find((s) => s.key === stageKey)?.label}`);
      onQuoteUpdate();
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast.error('Erro ao mover orçamento');
    } finally {
      setDraggedQuote(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedQuote(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {FUNNEL_STAGES.map((stage) => {
        const stageQuotes = quotes.filter((quote) => quote.status === stage.key);
        const isDropTarget = dragOverStage === stage.key;

        return (
          <div
            key={stage.key}
            className={cn(
              'flex-shrink-0 w-[280px] rounded-xl border transition-all duration-200',
              isDropTarget
                ? 'bg-impulse-gold/10 border-impulse-gold border-dashed'
                : 'bg-card border-border'
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverStage !== stage.key) setDragOverStage(stage.key);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverStage(stage.key);
            }}
            onDragLeave={(e) => {
              // Only clear if we are leaving the main container
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverStage(null);
            }}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className={cn('p-3 border-b border-inherit rounded-t-xl', stage.headerClass)}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider">{stage.label}</h3>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border border-black/5', stage.badgeClass)}>
                  {stageQuotes.length}
                </span>
              </div>
            </div>

            <div className="p-2 space-y-2 min-h-[400px] max-h-[calc(100vh-320px)] overflow-y-auto">
              {stageQuotes.map((quote) => {
                const clientName = (quote.client_id && clientNames)
                  ? clientNames[quote.client_id] || 'Cliente não vinculado'
                  : 'Cliente não vinculado';
                const creatorName = (quote.created_by && creatorNames)
                  ? creatorNames[quote.created_by] || 'Desconhecido'
                  : 'Usuário';
                const isDragging = draggedQuote?.id === quote.id;
                const canDragQuote = canMoveQuote(quote);

                return (
                  <div
                    key={quote.id}
                    draggable={canDragQuote}
                    onDragStart={(e) => handleDragStart(e, quote)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onQuoteClick?.(quote)}
                    className={cn(
                      'bg-white dark:bg-slate-900 rounded-xl border p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30 transition-all group relative',
                      isDragging && 'opacity-30 scale-95 border-dashed',
                      !canDragQuote && 'cursor-default grayscale-[0.5] opacity-80'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{clientName}</p>
                        </div>
                        
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-medium italic">
                            Por: {creatorName}
                          </p>

                          {typeof quote.total === 'number' && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-500" />
                              {formatCurrency(quote.total)}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <GripVertical className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </div>
                );
              })}

              {stageQuotes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-[10px] border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  <div className="mb-2 p-2 bg-white rounded-full shadow-sm">
                    <GripVertical className="h-4 w-4 text-slate-300" />
                  </div>
                  Arraste itens para esta etapa
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
