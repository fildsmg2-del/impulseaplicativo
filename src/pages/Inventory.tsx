import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Boxes, History } from 'lucide-react';
import { productService, Product, CreateProductData, ProductCategory } from '@/services/productService';
import { supplierService } from '@/services/supplierService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KitManager } from '@/components/inventory/KitManager';
import { StockMovementHistory } from '@/components/inventory/StockMovementHistory';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  MODULO: 'Módulo Solar',
  INVERSOR: 'Inversor',
  ESTRUTURA: 'Estrutura',
  CABO: 'Cabo',
  CONECTOR: 'Conector',
  OUTROS: 'Outros',
};

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockOperation, setStockOperation] = useState<'add' | 'remove'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState(1);
  const [stockReason, setStockReason] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("inventory_active_tab") || "kits";
  });
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    category: 'MODULO',
    sku: '',
    brand: '',
    model: '',
    power_w: undefined,
    unit: 'un',
    cost_price: 0,
    sale_price: 0,
    quantity: 0,
    min_quantity: 5,
    supplier_id: undefined,
    active: true,
  });
  const [kitFilters, setKitFilters] = useState({
    search: '',
    systemType: 'all'
  });

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto cadastrado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar produto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductData> }) =>
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar produto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir produto');
    },
  });

  const addStockMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) =>
      productService.addStock(productId, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Estoque adicionado com sucesso!');
      setIsStockDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar estoque');
    },
  });

  const removeStockMutation = useMutation({
    mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason: string }) =>
      productService.removeStock(productId, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Estoque removido com sucesso!');
      setIsStockDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover estoque');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'MODULO',
      sku: '',
      brand: '',
      model: '',
      power_w: undefined,
      unit: 'un',
      cost_price: 0,
      sale_price: 0,
      quantity: 0,
      min_quantity: 5,
      supplier_id: undefined,
      active: true,
    });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      sku: product.sku || '',
      brand: product.brand || '',
      model: product.model || '',
      power_w: product.power_w || undefined,
      unit: product.unit,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      quantity: product.quantity,
      min_quantity: product.min_quantity,
      supplier_id: product.supplier_id || undefined,
      active: product.active,
    });
    setIsDialogOpen(true);
  };

  const handleStockOperation = (product: Product, operation: 'add' | 'remove') => {
    setSelectedProduct(product);
    setStockOperation(operation);
    setStockQuantity(1);
    setStockReason('');
    setIsStockDialogOpen(true);
  };

  const submitStockOperation = () => {
    if (!selectedProduct) return;
    if (stockOperation === 'add') {
      addStockMutation.mutate({ productId: selectedProduct.id, quantity: stockQuantity, reason: stockReason });
    } else {
      removeStockMutation.mutate({ productId: selectedProduct.id, quantity: stockQuantity, reason: stockReason });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase()) ||
      product.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const {
    paginatedItems: paginatedProducts,
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage,
  } = usePagination(filteredProducts, { itemsPerPage: 6 });

  useEffect(() => {
    resetPage();
  }, [search, categoryFilter, resetPage]);

  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity && p.active);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
            <p className="text-muted-foreground">Gerencie produtos e kits de geração solar</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value);
            sessionStorage.setItem("inventory_active_tab", value);
          }}
        >
          <TabsList className="bg-muted p-1 rounded-xl">
            <TabsTrigger 
              value="kits" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Boxes className="h-4 w-4" />
              Kits
            </TabsTrigger>
            <TabsTrigger 
              value="produtos" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger 
              value="movimentacoes" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <History className="h-4 w-4" />
              Movimentações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kits">
            <KitManager 
              filters={kitFilters} 
              onFiltersChange={(filters) => setKitFilters(prev => ({ ...prev, ...filters }))} 
            />
          </TabsContent>

          <TabsContent value="produtos" className="space-y-6">
            {/* Products Header */}
            <div className="flex justify-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm} className="gap-2 bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Nome *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Categoria *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value: ProductCategory) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>SKU</Label>
                        <Input
                          value={formData.sku}
                          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Marca</Label>
                        <Input
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Modelo</Label>
                        <Input
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Potência (W)</Label>
                        <Input
                          type="number"
                          value={formData.power_w || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, power_w: e.target.value ? Number(e.target.value) : undefined }))}
                        />
                      </div>
                      <div>
                        <Label>Fornecedor</Label>
                        <Select
                          value={formData.supplier_id || 'none'}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value === 'none' ? undefined : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Preço de Custo *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Preço de Venda *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.sale_price}
                          onChange={(e) => setFormData(prev => ({ ...prev, sale_price: Number(e.target.value) }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Quantidade Inicial</Label>
                        <Input
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label>Estoque Mínimo</Label>
                        <Input
                          type="number"
                          value={formData.min_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                      <Button type="submit" className="bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark">
                        {editingProduct ? 'Atualizar' : 'Cadastrar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
              <Card className="border-warning bg-warning/10">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="font-medium text-warning">
                      {lowStockProducts.length} produto(s) com estoque baixo
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Venda</TableHead>
                        <TableHead className="text-center">Estoque</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.brand} {product.model} {product.power_w ? `- ${product.power_w}W` : ''}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{CATEGORY_LABELS[product.category]}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(product.sale_price)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={product.quantity <= product.min_quantity ? 'destructive' : 'default'}>
                              {product.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStockOperation(product, 'add')}
                                title="Entrada"
                              >
                                <ArrowUpCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStockOperation(product, 'remove')}
                                title="Saída"
                              >
                                <ArrowDownCircle className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
          </TabsContent>



          <TabsContent value="movimentacoes">
            <StockMovementHistory />
          </TabsContent>
        </Tabs>

        {/* Stock Operation Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {stockOperation === 'add' ? 'Entrada de Estoque' : 'Saída de Estoque'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedProduct?.name}</p>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  placeholder={stockOperation === 'add' ? 'Ex: Compra de fornecedor' : 'Ex: Projeto #123'}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={submitStockOperation}
                  className={stockOperation === 'add' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
