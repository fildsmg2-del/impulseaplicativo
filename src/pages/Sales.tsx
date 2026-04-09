import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Eye, FileText, Trash2, CheckCircle, XCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { saleService, Sale } from '@/services/saleService';
import { clientService, Client } from '@/services/clientService';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { SaleModal } from '@/components/sales/SaleModal';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const approvalStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  PENDENTE: { label: 'Pendente', variant: 'secondary', icon: Clock },
  APROVADO: { label: 'Aprovado', variant: 'default', icon: CheckCircle },
  REJEITADO: { label: 'Rejeitado', variant: 'destructive', icon: XCircle },
};

const paymentStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  PENDENTE: { label: 'Pendente', variant: 'outline', icon: Clock },
  PAGO: { label: 'Pago', variant: 'default', icon: DollarSign },
};

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Record<string, Client>>({});
  const [search, setSearch] = useState('');
  const [filterApproval, setFilterApproval] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [salesData, clientsData] = await Promise.all([
        saleService.getAll(),
        clientService.getAll(),
      ]);
      setSales(salesData);
      
      const clientsMap: Record<string, Client> = {};
      clientsData.forEach((client) => {
        clientsMap[client.id] = client;
      });
      setClients(clientsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as vendas.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleDeleteSale = async (e: React.MouseEvent, saleId: string) => {
    e.stopPropagation();
    try {
      await saleService.delete(saleId);
      toast({
        title: 'Sucesso',
        description: 'Venda excluída com sucesso.',
      });
      loadData();
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a venda.',
        variant: 'destructive',
      });
    }
  };

  const filteredSales = sales.filter((sale) => {
    const client = sale.client_id ? clients[sale.client_id] : null;
    const clientName = client?.name?.toLowerCase() || '';
    const saleNumber = sale.sale_number?.toLowerCase() || '';
    const matchesSearch = clientName.includes(search.toLowerCase()) || saleNumber.includes(search.toLowerCase());
    const matchesApproval = filterApproval === 'all' || sale.approval_status === filterApproval;
    const matchesPayment = filterPayment === 'all' || sale.payment_status === filterPayment;
    return matchesSearch && matchesApproval && matchesPayment;
  });

  const pagination = usePagination({ items: filteredSales, itemsPerPage: 6 });
  const { paginatedItems, currentPage, totalPages, goToPage, startIndex, endIndex, totalItems } = pagination;

  const stats = {
    total: sales.length,
    approved: sales.filter((s) => s.approval_status === 'APROVADO').length,
    pending: sales.filter((s) => s.approval_status === 'PENDENTE').length,
    paid: sales.filter((s) => s.payment_status === 'PAGO').length,
    totalValue: sales.filter((s) => s.approval_status === 'APROVADO').reduce((sum, s) => sum + (s.total || 0), 0),
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground">
              Gerencie as vendas geradas a partir dos orçamentos aprovados
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-impulse-gold/10">
                  <DollarSign className="h-5 w-5 text-impulse-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
                  <p className="text-xs text-muted-foreground">Pagas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-impulse-gold/10">
                  <DollarSign className="h-5 w-5 text-impulse-gold" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'list' | 'dashboard')}>
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="gap-2">
              <FileText className="h-4 w-4" />
              Lista de Vendas
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SalesDashboard />
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou número da venda..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={filterApproval} onValueChange={setFilterApproval}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
                  <TabsTrigger value="APROVADO">Aprovadas</TabsTrigger>
                  <TabsTrigger value="REJEITADO">Rejeitadas</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={filterPayment} onValueChange={setFilterPayment}>
                <TabsList>
                  <TabsTrigger value="all">Pagamento</TabsTrigger>
                  <TabsTrigger value="PENDENTE">Pendente</TabsTrigger>
                  <TabsTrigger value="PAGO">Pago</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

        {/* Sales List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando vendas...</p>
          </div>
        ) : paginatedItems.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Nenhuma venda encontrada
            </h3>
            <p className="text-muted-foreground">
              As vendas serão geradas automaticamente quando um orçamento for aprovado.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {paginatedItems.map((sale) => {
              const client = sale.client_id ? clients[sale.client_id] : null;
              const approvalConfig = approvalStatusConfig[sale.approval_status] || approvalStatusConfig.PENDENTE;
              const paymentConfig = paymentStatusConfig[sale.payment_status] || paymentStatusConfig.PENDENTE;
              const ApprovalIcon = approvalConfig.icon;
              const PaymentIcon = paymentConfig.icon;

              return (
                <Card
                  key={sale.id}
                  className="bg-card border-border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-impulse-gold/10">
                          <FileText className="h-6 w-6 text-impulse-gold" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {sale.sale_number}
                            </h3>
                            <Badge variant={approvalConfig.variant} className="gap-1">
                              <ApprovalIcon className="h-3 w-3" />
                              {approvalConfig.label}
                            </Badge>
                            <Badge variant={paymentConfig.variant} className="gap-1">
                              <PaymentIcon className="h-3 w-3" />
                              {paymentConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {client?.name || 'Cliente não informado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Data: {formatDate(sale.sale_date)} | Previsão: {sale.estimated_completion_date ? formatDate(sale.estimated_completion_date) : 'Não definida'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-impulse-gold">
                            {formatCurrency(sale.total)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {sale.items?.length || 0} itens
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSaleId(sale.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {hasRole(['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS']) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir venda?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. A venda será permanentemente removida.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => handleDeleteSale(e, sale.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
          )}
          </TabsContent>
        </Tabs>

        {/* Sale Modal */}
        {selectedSaleId && (
          <SaleModal
            saleId={selectedSaleId}
            onClose={() => {
              setSelectedSaleId(null);
              loadData();
            }}
          />
        )}
      </div>
    </>
  );
}
