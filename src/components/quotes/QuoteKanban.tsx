import { useState } from 'react';
import { GripVertical, User, Calendar, CircleDollarSign } from 'lucide-react';
import { Quote, QuoteStatus, quoteService } from '@/services/quoteService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const FUNNEL_STAGES: Array<{
  key: QuoteStatus;
  label: string;
  headerClass: string;
  badgeClass: string;
}> = [
  {
    key: 'DRAFT',
    label: 'Leads',
    headerClass: 'bg-muted text-muted-foreground',
    badgeClass: 'bg-muted/70 text-muted-foreground',
  },
  {
    key: 'SENT',
    label: 'Proposta enviada',
    headerClass: 'bg-secondary/15 text-secondary',
    badgeClass: 'bg-secondary/25 text-secondary',
  },
  {
    key: 'REJECTED',
    label: 'Negociação',
    headerClass: 'bg-amber-500/15 text-amber-700',
    badgeClass: 'bg-amber-500/25 text-amber-700',
  },
  {
    key: 'APPROVED',
    label: 'Em fechamento',
    headerClass: 'bg-success/15 text-success',
    badgeClass: 'bg-success/25 text-success',
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
            onDragOver={(e) => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.key)}
          >
            <div className={cn('p-3 rounded-t-xl', stage.headerClass)}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', stage.badgeClass)}>
                  {stageQuotes.length}
                </span>
              </div>
            </div>

            <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
              {stageQuotes.map((quote) => {
                const clientName = quote.client_id && clientNames
                  ? clientNames[quote.client_id] || 'Cliente não vinculado'
                  : 'Cliente não vinculado';
                const creatorName = quote.created_by && creatorNames
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
                      'bg-background rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing hover:border-impulse-gold/50 transition-all group',
                      isDragging && 'opacity-50 scale-95'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="font-medium text-sm text-foreground truncate">{clientName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Criador: {creatorName}
                        </p>

                        {typeof quote.total === 'number' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <CircleDollarSign className="h-3 w-3 text-impulse-gold" />
                            {formatCurrency(quote.total)}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {stageQuotes.length === 0 && (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
                  Arraste orçamentos aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
