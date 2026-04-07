import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { supplierService, Supplier, CreateSupplierData } from '@/services/supplierService';
import { clientService } from '@/services/clientService';

export default function Suppliers() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    email: '',
    phone: '',
    document: '',
    document_type: 'CNPJ',
    contact_person: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    notes: '',
    active: true,
  });

  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: supplierService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor cadastrado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar fornecedor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSupplierData> }) =>
      supplierService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor atualizado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar fornecedor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: supplierService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir fornecedor');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      document_type: 'CNPJ',
      contact_person: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      notes: '',
      active: true,
    });
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      document: supplier.document || '',
      document_type: supplier.document_type || 'CNPJ',
      contact_person: supplier.contact_person || '',
      street: supplier.street || '',
      number: supplier.number || '',
      neighborhood: supplier.neighborhood || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: supplier.zip_code || '',
      notes: supplier.notes || '',
      active: supplier.active,
    });
    setIsDialogOpen(true);
  };

  const handleSearchCEP = async () => {
    if (!formData.zip_code || formData.zip_code.length < 8) return;
    try {
      const data = await clientService.searchCEP(formData.zip_code);
      setFormData(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
      toast.success('Endereço encontrado!');
    } catch {
      toast.error('CEP não encontrado');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(search.toLowerCase()) ||
    supplier.document?.toLowerCase().includes(search.toLowerCase())
  );

  const {
    paginatedItems: paginatedSuppliers,
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage,
  } = usePagination(filteredSuppliers, { itemsPerPage: 6 });

  useEffect(() => {
    resetPage();
  }, [search, resetPage]);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fornecedores</h1>
            <p className="text-muted-foreground">Gerencie seus fornecedores de equipamentos</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="gap-2 bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark">
                <Plus className="h-4 w-4" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome / Razão Social *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>CNPJ/CPF</Label>
                    <Input
                      value={formData.document}
                      onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.document_type}
                      onValueChange={(value: 'CPF' | 'CNPJ') => setFormData(prev => ({ ...prev, document_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNPJ">CNPJ</SelectItem>
                        <SelectItem value="CPF">CPF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Pessoa de Contato</Label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.zip_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                        onBlur={handleSearchCEP}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Rua</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={formData.number}
                      onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark">
                    {editingSupplier ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredSuppliers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <Badge variant={supplier.active ? 'default' : 'secondary'}>
                        {supplier.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {supplier.document && (
                      <p className="text-sm text-muted-foreground">
                        {supplier.document_type}: {supplier.document}
                      </p>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-impulse-gold" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-impulse-gold" />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-impulse-gold" />
                        {supplier.city}, {supplier.state}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
      </div>
    </AppLayout>
  );
}
