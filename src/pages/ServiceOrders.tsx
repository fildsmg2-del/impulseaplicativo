import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isPast, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, MoreHorizontal, Trash2, Edit, FileDown, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/use-pagination';
import { useAuth } from '@/hooks/use-auth';
import { ServiceOrder, serviceOrderService } from '@/services/serviceOrderService';
import { serviceOrderLogService } from '@/services/serviceOrderLogService';
import { ServiceOrderModal } from '@/components/service-orders/ServiceOrderModal';
import { generateServiceOrderPDF } from '@/utils/serviceOrderPdfGenerator';
import { getCompanySettings } from '@/services/companySettingsService';
import { Navigate } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'EM_ABERTO', label: 'Em Aberto' },
  { value: 'EM_TRATAMENTO', label: 'Em Tratamento' },
  { value: 'EM_EXECUCAO', label: 'Em Execução' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'VENCIDAS', label: 'Vencidas' },
];

export default function ServiceOrders() {
  const { user, hasRole } = useAuth();

  if (user?.role === 'PILOTO' || user?.role === 'CONSULTOR_TEC_DRONE') {
    return <Navigate to="/dashboard" replace />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>();
  const [preselectedTechnicianId, setPreselectedTechnicianId] = useState<string | undefined>();
  const [prefilledNotes, setPrefilledNotes] = useState<string | undefined>();

  const isOrderOverdue = (order: ServiceOrder) => {
    return order.deadline_date && 
      order.status !== 'CONCLUIDO' && 
      isPast(new Date(order.deadline_date));
  };

  const getDaysUntilDeadline = (order: ServiceOrder) => {
    if (!order.deadline_date) return null;
    return differenceInDays(new Date(order.deadline_date), new Date());
  };

  const canViewAllOrders = hasRole(['MASTER', 'ENGENHEIRO', 'TECNICO', 'DEV', 'CONSULTOR_TEC_DRONE']);
  const canDeleteOrder = (order: ServiceOrder) => {
    if (!user) return false;
    if (['TECNICO', 'PILOTO', 'CONSULTOR_TEC_DRONE'].includes(user.role)) return false;
    return true;
  };

  const visibleOrders = canViewAllOrders || !user
    ? serviceOrders
    : serviceOrders.filter((order) => order.assigned_to === user.id);

  const filteredOrders = visibleOrders.filter((order) => {
    const matchesSearch =
      order.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.display_code && order.display_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'VENCIDAS') {
      return matchesSearch && isOrderOverdue(order);
    }
    
    const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const codeA = a.display_code || '';
    const codeB = b.display_code || '';
    return codeB.localeCompare(codeA, undefined, { numeric: true });
  });

  const { currentPage, totalPages, paginatedItems, goToPage, startIndex, endIndex, totalItems } = usePagination(sortedOrders, { itemsPerPage: 15 });

  const overdueCount = visibleOrders.filter(isOrderOverdue).length;

  const loadServiceOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = user
        ? await serviceOrderService.getForUser({ id: user.id, role: user.role })
        : await serviceOrderService.getAll();
      setServiceOrders(data);
    } catch (error) {
      console.error('Error loading service orders:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar ordens de serviço',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) {
      setServiceOrders([]);
      setLoading(false);
      return;
    }

    loadServiceOrders();
  }, [user, loadServiceOrders]);

  useEffect(() => {
    const orderId = searchParams.get('id');
    const isNew = searchParams.get('new') === 'true';
    const clientId = searchParams.get('client_id');
    const technicianId = searchParams.get('assigned_to');
    const notes = searchParams.get('notes');
    
    if (isNew && clientId) {
      setPreselectedClientId(clientId);
      setPreselectedTechnicianId(technicianId || undefined);
      setPrefilledNotes(notes || undefined);
      setSelectedOrder(null);
      setModalOpen(true);
      setSearchParams({});
    } else if (isNew && !clientId) {
      setPreselectedClientId(undefined);
      setPreselectedTechnicianId(technicianId || undefined);
      setPrefilledNotes(notes || undefined);
      setSelectedOrder(null);
      setModalOpen(true);
      setSearchParams({});
    } else if (orderId && !loading && serviceOrders.length > 0) {
      const order = serviceOrders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
        setModalOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, loading, serviceOrders, setSearchParams]);

  const handleCreate = () => {
    setSelectedOrder(null);
    setPreselectedClientId(undefined);
    setModalOpen(true);
  };

  const handleEdit = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedOrder(null);
    setPreselectedClientId(undefined);
    setPreselectedTechnicianId(undefined);
    setPrefilledNotes(undefined);
  };

  const handleDelete = async () => {
    if (!orderToDelete) return;
    const order = serviceOrders.find((serviceOrder) => serviceOrder.id === orderToDelete);
    if (!order || !canDeleteOrder(order)) {
      toast({
        title: 'Erro',
        description: 'Você não tem permissão para excluir esta OS',
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      return;
    }
    try {
      await serviceOrderService.delete(orderToDelete);
      toast({ title: 'OS excluída com sucesso' });
      loadServiceOrders();
    } catch (error) {
      console.error('Error deleting service order:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir OS',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleDownloadPDF = async (order: ServiceOrder) => {
    try {
      const [logs, companySettings] = await Promise.all([
        serviceOrderLogService.getByServiceOrderId(order.id),
        getCompanySettings()
      ]);
      await generateServiceOrderPDF(order, logs, companySettings);
      toast({ title: 'PDF gerado com sucesso' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      EM_ABERTO: { label: 'Em Aberto', variant: 'outline' },
      EM_TRATAMENTO: { label: 'Em Tratamento', variant: 'secondary' },
      EM_EXECUCAO: { label: 'Em Execução', variant: 'default' },
      CONCLUIDO: { label: 'Concluído', variant: 'default' },
    };
    const { label, variant } = config[status] || { label: status, variant: 'outline' };
    return (
      <Badge variant={variant} className={status === 'CONCLUIDO' ? 'bg-green-600' : ''}>
        {label}
      </Badge>
    );
  };

  const getDeadlineBadge = (order: ServiceOrder) => {
    if (!order.deadline_date) return null;
    
    const isOverdue = isOrderOverdue(order);
    const daysLeft = getDaysUntilDeadline(order);
    
    if (order.status === 'CONCLUIDO') {
      return (
        <span className="text-xs text-muted-foreground">
          {format(new Date(order.deadline_date + 'T00:00:00'), 'dd/MM/yyyy')}
        </span>
      );
    }
    
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
          <AlertTriangle className="h-3 w-3" />
          Vencida ({Math.abs(daysLeft!)} dias atrás)
        </span>
      );
    }
    
    if (daysLeft !== null && daysLeft <= 2) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <Clock className="h-3 w-3" />
          {daysLeft === 0 ? 'Vence hoje!' : `Vence em ${daysLeft} dia(s)`}
        </span>
      );
    }
    
    return (
      <span className="text-xs text-muted-foreground">
        {format(new Date(order.deadline_date + 'T00:00:00'), 'dd/MM/yyyy')}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-muted-foreground">
              Gerencie as ordens de serviço
              {overdueCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-destructive font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  {overdueCount} vencida(s)
                </span>
              )}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  {STATUS_OPTIONS.map((option) => (
                    <TabsTrigger key={option.value} value={option.value} className="relative">
                      {option.label}
                      {option.value === 'VENCIDAS' && overdueCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                          {overdueCount}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : paginatedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ordem de serviço encontrada
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo de Serviço</TableHead>
                      <TableHead>Abertura</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((order) => {
                      const overdue = isOrderOverdue(order);
                      return (
                        <TableRow 
                          key={order.id} 
                          className={overdue ? 'bg-destructive/5 hover:bg-destructive/10' : ''}
                        >
                          <TableCell className="font-bold text-primary">
                            {order.display_code || '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.client?.name || '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {order.service_type}
                          </TableCell>
                          <TableCell>
                            {order.opening_date
                              ? format(new Date(order.opening_date + 'T00:00:00'), 'dd/MM/yyyy')
                              : format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {getDeadlineBadge(order)}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(order)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(order)}>
                                  <FileDown className="h-4 w-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                                {canDeleteOrder(order) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setOrderToDelete(order.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ServiceOrderModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        serviceOrder={selectedOrder}
        onSave={loadServiceOrders}
        preselectedClientId={preselectedClientId}
        preselectedTechnicianId={preselectedTechnicianId}
        prefilledNotes={prefilledNotes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
