import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Package, Calendar, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  movement_type: 'ENTRADA' | 'SAIDA';
  quantity: number;
  reason?: string;
  project_id?: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
}

export function StockMovementHistory() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id (name),
          profiles:created_by (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedMovements: StockMovement[] = (data || []).map((m: any) => ({
        id: m.id,
        product_id: m.product_id,
        product_name: m.products?.name || 'Produto removido',
        movement_type: m.movement_type as 'ENTRADA' | 'SAIDA',
        quantity: m.quantity,
        reason: m.reason,
        project_id: m.project_id,
        created_at: m.created_at,
        created_by: m.created_by,
        created_by_name: m.profiles?.name || 'Sistema',
      }));

      setMovements(formattedMovements);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch = m.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.reason?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || m.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalEntradas: movements.filter(m => m.movement_type === 'ENTRADA').reduce((sum, m) => sum + m.quantity, 0),
    totalSaidas: movements.filter(m => m.movement_type === 'SAIDA').reduce((sum, m) => sum + m.quantity, 0),
    totalMovimentos: movements.length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-impulse-gold/10">
              <Package className="h-5 w-5 text-impulse-gold" />
            </div>
            <div>
              <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Rastreabilidade completa do estoque
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-center">
            <ArrowUpCircle className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">{stats.totalEntradas}</p>
            <p className="text-[10px] text-muted-foreground">Entradas</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <ArrowDownCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-lg font-bold text-destructive">{stats.totalSaidas}</p>
            <p className="text-[10px] text-muted-foreground">Saídas</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <Package className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalMovimentos}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto ou motivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ENTRADA">Entradas</SelectItem>
              <SelectItem value="SAIDA">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Movements List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma movimentação encontrada
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    'p-2 rounded-lg',
                    movement.movement_type === 'ENTRADA' 
                      ? 'bg-success/10' 
                      : 'bg-destructive/10'
                  )}>
                    {movement.movement_type === 'ENTRADA' ? (
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">
                        {movement.product_name}
                      </p>
                      <Badge variant={movement.movement_type === 'ENTRADA' ? 'default' : 'destructive'}>
                        {movement.movement_type === 'ENTRADA' ? '+' : '-'}{movement.quantity}
                      </Badge>
                    </div>
                    {movement.reason && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {movement.reason}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(movement.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      por {movement.created_by_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
