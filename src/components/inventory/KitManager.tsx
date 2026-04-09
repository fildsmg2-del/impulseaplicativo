import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, Zap, Battery, PlugZap } from 'lucide-react';
import { kitService, Kit, CreateKitData, SystemType } from '@/services/kitService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { KitForm } from './KitForm';

const SYSTEM_TYPE_LABELS: Record<SystemType, { label: string; icon: React.ReactNode }> = {
  on_grid: { label: 'On Grid', icon: <PlugZap className="h-4 w-4" /> },
  hibrido: { label: 'Híbrido', icon: <Zap className="h-4 w-4" /> },
  off_grid: { label: 'Off Grid', icon: <Battery className="h-4 w-4" /> },
};

interface KitManagerProps {
  filters: {
    search: string;
    systemType: string;
  };
  onFiltersChange: (filters: Partial<KitManagerProps['filters']>) => void;
}

export function KitManager({ filters, onFiltersChange }: KitManagerProps) {
  const { search, systemType: systemTypeFilter } = filters;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);

  const queryClient = useQueryClient();

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ['kits'],
    queryFn: kitService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: kitService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit cadastrado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar kit');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateKitData> }) =>
      kitService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit atualizado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar kit');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: kitService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir kit');
    },
  });

  const resetForm = () => {
    setEditingKit(null);
    setIsDialogOpen(false);
  };

  const handleFormSubmit = (data: CreateKitData) => {
    if (editingKit) {
      updateMutation.mutate({ id: editingKit.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (kit: Kit) => {
    setEditingKit(kit);
    setIsDialogOpen(true);
  };

  const filteredKits = kits.filter(kit => {
    const matchesSearch = kit.name.toLowerCase().includes(search.toLowerCase()) ||
      kit.description?.toLowerCase().includes(search.toLowerCase());
    const matchesType = systemTypeFilter === 'all' || kit.system_type === systemTypeFilter;
    return matchesSearch && matchesType;
  });

  const {
    paginatedItems: paginatedKits,
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage,
  } = usePagination(filteredKits, { itemsPerPage: 6 });

  useEffect(() => {
    resetPage();
  }, [search, systemTypeFilter, resetPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kits de Geração Solar</h2>
          <p className="text-muted-foreground">Gerencie kits completos para orçamentos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingKit(null);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingKit(null)} className="gap-2 bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark">
              <Plus className="h-4 w-4" />
              Novo Kit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
            </DialogHeader>
            <KitForm
              editingKit={editingKit}
              onSubmit={handleFormSubmit}
              onCancel={resetForm}
              submitLabel="Cadastrar"
              showCancelButton={true}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar kit..."
            value={search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>
        <Select value={systemTypeFilter} onValueChange={(value) => onFiltersChange({ systemType: value })}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de Sistema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(SYSTEM_TYPE_LABELS).map(([key, { label, icon }]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">{icon} {label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kits List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredKits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum kit encontrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              Cadastre kits para usá-los nos orçamentos
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Potência</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedKits.map((kit) => {
                  const moduleCount = kit.items.filter(i => i.category === 'MODULO').reduce((sum, i) => sum + i.quantity, 0);
                  return (
                    <TableRow key={kit.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{kit.name}</p>
                          {kit.description && (
                            <p className="text-sm text-muted-foreground">{kit.description.slice(0, 50)}...</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {SYSTEM_TYPE_LABELS[kit.system_type].icon}
                          {SYSTEM_TYPE_LABELS[kit.system_type].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{kit.total_power_kwp.toFixed(2)} kWp</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Badge variant="secondary">{moduleCount} módulos</Badge>
                          <Badge variant="secondary">{kit.items.length} itens</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(kit.cost_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(kit.sale_price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(kit)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(kit.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
        </Card>
      )}
    </div>
  );
}
