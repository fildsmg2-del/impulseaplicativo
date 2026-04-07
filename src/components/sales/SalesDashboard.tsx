import { useState, useEffect } from 'react';
import { TrendingUp, Target, DollarSign, ShoppingCart, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { saleService, Sale } from '@/services/saleService';
import { quoteService, Quote } from '@/services/quoteService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

interface MonthlyData {
  month: string;
  revenue: number;
  sales: number;
}

interface ConversionData {
  name: string;
  value: number;
}

export function SalesDashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState(100000);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [salesData, quotesData] = await Promise.all([
        saleService.getAll(),
        quoteService.getAll(),
      ]);
      setSales(salesData);
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate KPIs
  const approvedSales = sales.filter(s => s.approval_status === 'APROVADO');
  const paidSales = sales.filter(s => s.payment_status === 'PAGO');
  const pendingSales = sales.filter(s => s.approval_status === 'PENDENTE');
  
  const totalRevenue = approvedSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const paidRevenue = paidSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const pendingRevenue = pendingSales.reduce((sum, s) => sum + (s.total || 0), 0);

  // Conversion rate
  const approvedQuotes = quotes.filter(q => q.status === 'APPROVED').length;
  const totalQuotes = quotes.length;
  const conversionRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;

  // Monthly progress
  const currentMonth = new Date().getMonth();
  const currentMonthSales = approvedSales.filter(s => {
    const saleMonth = new Date(s.sale_date).getMonth();
    return saleMonth === currentMonth;
  });
  const currentMonthRevenue = currentMonthSales.reduce((sum, s) => sum + (s.total || 0), 0);
  const goalProgress = (currentMonthRevenue / monthlyGoal) * 100;

  // Monthly chart data
  const monthlyData: MonthlyData[] = [];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  for (let i = 0; i < 12; i++) {
    const monthSales = approvedSales.filter(s => {
      const saleMonth = new Date(s.sale_date).getMonth();
      return saleMonth === i;
    });
    monthlyData.push({
      month: months[i],
      revenue: monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
      sales: monthSales.length,
    });
  }

  // Conversion funnel data
  const conversionData: ConversionData[] = [
    { name: 'Aprovados', value: quotes.filter(q => q.status === 'APPROVED').length },
    { name: 'Pendentes', value: quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length },
    { name: 'Rejeitados', value: quotes.filter(q => q.status === 'REJECTED').length },
  ];

  // Payment status data
  const paymentData = [
    { name: 'Pago', value: paidSales.length, color: 'hsl(var(--success))' },
    { name: 'Pendente', value: sales.filter(s => s.payment_status === 'PENDENTE' && s.approval_status === 'APROVADO').length, color: 'hsl(var(--warning))' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-success mt-1">
                  {formatCurrency(paidRevenue)} recebido
                </p>
              </div>
              <div className="p-3 rounded-xl bg-impulse-gold/10">
                <DollarSign className="h-6 w-6 text-impulse-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas Aprovadas</p>
                <p className="text-2xl font-bold text-foreground">{approvedSales.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingSales.length} pendentes
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-foreground">{conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {approvedQuotes} de {totalQuotes} orçamentos
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(pendingRevenue)}</p>
                <p className="text-xs text-warning mt-1">
                  {pendingSales.length} vendas pendentes
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goal Progress */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-impulse-gold" />
              Meta Mensal
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Meta:</span>
              <input
                type="number"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)}
                className="w-32 px-2 py-1 text-sm bg-background border border-border rounded-lg"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso do mês</span>
              <span className="font-medium text-foreground">
                {formatCurrency(currentMonthRevenue)} / {formatCurrency(monthlyGoal)}
              </span>
            </div>
            <Progress value={Math.min(goalProgress, 100)} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              {goalProgress >= 100 
                ? '🎉 Meta atingida!' 
                : `Faltam ${formatCurrency(monthlyGoal - currentMonthRevenue)} para atingir a meta`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-impulse-gold" />
              Faturamento Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(45, 93%, 47%)" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-impulse-gold" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {conversionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {conversionData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Month Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-impulse-gold" />
            Quantidade de Vendas por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [value, 'Vendas']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
