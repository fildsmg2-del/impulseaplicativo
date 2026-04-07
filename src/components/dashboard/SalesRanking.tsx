import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SellerRanking {
  id: string;
  name: string;
  totalSales: number;
  totalQuotes: number;
  conversionRate: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(value);

export function SalesRanking() {
  const [ranking, setRanking] = useState<SellerRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      // Get all quotes with creator info
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status, total, created_by')
        .not('created_by', 'is', null);

      if (quotesError) throw quotesError;

      // Get profiles for names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) throw profilesError;

      // Calculate ranking
      const sellerStats: Record<string, { totalSales: number; totalQuotes: number; approvedQuotes: number }> = {};

      quotes?.forEach((quote) => {
        if (!quote.created_by) return;
        
        if (!sellerStats[quote.created_by]) {
          sellerStats[quote.created_by] = { totalSales: 0, totalQuotes: 0, approvedQuotes: 0 };
        }
        
        sellerStats[quote.created_by].totalQuotes++;
        
        if (quote.status === 'APPROVED') {
          sellerStats[quote.created_by].totalSales += Number(quote.total) || 0;
          sellerStats[quote.created_by].approvedQuotes++;
        }
      });

      const rankingData: SellerRanking[] = Object.entries(sellerStats)
        .map(([id, stats]) => {
          const profile = profiles?.find((p) => p.id === id);
          return {
            id,
            name: profile?.name || 'Usuário',
            totalSales: stats.totalSales,
            totalQuotes: stats.totalQuotes,
            conversionRate: stats.totalQuotes > 0 
              ? Math.round((stats.approvedQuotes / stats.totalQuotes) * 100) 
              : 0,
          };
        })
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5);

      setRanking(rankingData);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-impulse-gold" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{index + 1}</span>;
    }
  };

  const getRankBackground = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-impulse-gold/10 border-impulse-gold/30';
      case 1:
        return 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700';
      case 2:
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
        <h3 className="text-lg font-semibold text-foreground mb-4">Ranking de Vendedores</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-impulse-gold/10">
          <Trophy className="h-5 w-5 text-impulse-gold" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Ranking de Vendedores</h3>
          <p className="text-xs text-muted-foreground">Performance por vendedor</p>
        </div>
      </div>

      {ranking.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum dado de vendas ainda
        </p>
      ) : (
        <div className="space-y-3">
          {ranking.map((seller, index) => (
            <div
              key={seller.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01]',
                getRankBackground(index)
              )}
            >
              <div className="flex-shrink-0">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{seller.name}</p>
                <p className="text-xs text-muted-foreground">
                  {seller.totalQuotes} orçamentos • {seller.conversionRate}% conversão
                </p>
              </div>

              <div className="text-right">
                <p className={cn(
                  'font-bold',
                  index === 0 ? 'text-impulse-gold' : 'text-foreground'
                )}>
                  {formatCurrency(seller.totalSales)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
