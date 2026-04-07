import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { getMonthlySalesData, MonthlySalesData } from '@/services/dashboardService';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(value);

export function SalesChart() {
  const [data, setData] = useState<MonthlySalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const salesData = await getMonthlySalesData();
      setData(salesData);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Performance de Vendas
          </h3>
          <p className="text-sm text-muted-foreground">
            Faturamento e potência instalada por mês
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-impulse-gold" />
            <span className="text-muted-foreground">Vendas (R$)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-impulse-dark" />
            <span className="text-muted-foreground">Potência (kWp)</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FDB913" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FDB913" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorKwp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D5E5E" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0D5E5E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(v) => `${v} kWp`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) =>
                name === 'sales' ? formatCurrency(value) : `${value} kWp`
              }
              labelStyle={{ color: '#0D5E5E', fontWeight: 600 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#FDB913"
              strokeWidth={3}
              fill="url(#colorVendas)"
              name="sales"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="power"
              stroke="#0D5E5E"
              strokeWidth={3}
              fill="url(#colorKwp)"
              name="power"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
