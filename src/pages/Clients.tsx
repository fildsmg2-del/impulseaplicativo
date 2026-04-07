import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, MoreHorizontal, Building2, User, Phone, Mail, FileText, X, Trash2, Edit, MessageCircle, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { clientService, Client, CreateClientData } from '@/services/clientService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePagination } from '@/hooks/use-pagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { auditLogService } from '@/services/auditLogService';
import { ClientDetailSheet } from '@/components/clients/ClientDetailSheet';
import { Badge } from '@/components/ui/badge';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

interface ClientWithExtras extends Client {
  projects_count?: number;
  quotes_count?: number;
  service_orders_count?: number;
  cpf_rg_url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  electricity_bills?: any[];
}

export default function Clients() {
  const { hasRole } = useAuth();
  
  // Realtime updates
  useRealtimeInvalidation('clients', [['clients-list']]);
  useRealtimeInvalidation('projects', [['clients-list']]);
  useRealtimeInvalidation('quotes', [['clients-list']]);
  useRealtimeInvalidation('service_orders', [['clients-list']]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'CPF' | 'CNPJ'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithExtras | null>(null);
  const [editingClient, setEditingClient] = useState<CreateClientData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientWithExtras | null>(null);

  const canDelete = hasRole(['MASTER', 'DEV']);

  const { data: clients = [], isLoading, refetch } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const [clientsData, { data: projectCounts }, { data: quoteCounts }, { data: soCounts }] = await Promise.all([
        clientService.getAll(),
        supabase.from('projects').select('client_id'),
        supabase.from('quotes').select('client_id'),
        supabase.from('service_orders').select('client_id'),
      ]);

      return clientsData.map(client => ({
        ...client,
        projects_count: projectCounts?.filter(p => p.client_id === client.id).length || 0,
        quotes_count: quoteCounts?.filter(q => q.client_id === client.id).length || 0,
        service_orders_count: soCounts?.filter(s => s.client_id === client.id).length || 0,
      })) as ClientWithExtras[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const loadData = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOpenModal = (client?: ClientWithExtras) => {
    if (client) {
      setEditingClient({
        name: client.name,
        email: client.email,
        phone: client.phone,
        document: client.document,
        document_type: client.document_type,
        street: client.street,
        number: client.number,
        complement: client.complement,
        neighborhood: client.neighborhood,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code,
      });
      setSelectedClient(client);
    } else {
      setEditingClient({
        name: '',
        email: '',
        phone: '',
        document: '',
        document_type: 'CPF',
      });
      setSelectedClient(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setSelectedClient(null);
  };

  const handleOpenClientDetail = (client: ClientWithExtras) => {
    setSelectedClient(client);
    setShowDetailSheet(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;

    try {
      if (selectedClient) {
        await clientService.update(selectedClient.id, editingClient);
        await auditLogService.log('UPDATE', 'CLIENT', selectedClient.id, editingClient.name);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        const newClient = await clientService.create(editingClient);
        await auditLogService.log('CREATE', 'CLIENT', newClient.id, editingClient.name);
        toast.success('Cliente criado com sucesso!');
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      await clientService.delete(clientToDelete.id);
      await auditLogService.log('DELETE', 'CLIENT', clientToDelete.id, clientToDelete.name);
      toast.success('Cliente excluído com sucesso!');
      setClientToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleWhatsApp = (client: ClientWithExtras) => {
    const phone = client.phone.replace(/\D/g, '');
    const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;
    const message = encodeURIComponent(`Olá ${client.name}, tudo bem?`);
    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
  };

  const handleSearchCNPJ = async () => {
    if (!editingClient?.document || editingClient.document_type !== 'CNPJ') return;
    
    try {
      const data = await clientService.searchCNPJ(editingClient.document);
      setEditingClient({
        ...editingClient,
        name: data.razao_social || data.nome_fantasia,
        email: data.email || '',
        phone: data.ddd_telefone_1 || '',
        street: data.logradouro || '',
        number: data.numero || '',
        complement: data.complemento || '',
        neighborhood: data.bairro || '',
        city: data.municipio || '',
        state: data.uf || '',
        zip_code: data.cep || '',
      });
      toast.success('Dados do CNPJ carregados!');
    } catch (error) {
      toast.error('CNPJ não encontrado');
    }
  };

  const handleSearchCEP = async () => {
    if (!editingClient?.zip_code) return;
    
    try {
      const data = await clientService.searchCEP(editingClient.zip_code);
      setEditingClient({
        ...editingClient,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      });
      toast.success('Endereço carregado!');
    } catch (error) {
      toast.error('CEP não encontrado');
    }
  };

  // Upload is now handled by ClientDetailSheet component

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase()) ||
      client.document.includes(search);
    const matchesFilter = filterType === 'all' || client.document_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const {
    paginatedItems: paginatedClients,
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    resetPage,
  } = usePagination(filteredClients, { itemsPerPage: 15 });

  // Reset page when filters change
  useEffect(() => {
    resetPage();
  }, [search, filterType, resetPage]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua base de clientes
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 gradient-gold text-primary font-medium rounded-xl hover:shadow-gold transition-all"
        >
          <Plus className="h-5 w-5" />
          Novo Cliente
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou documento..."
            className="w-full pl-12 pr-4 py-3 bg-card rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterType('all')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              filterType === 'all' ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border hover:bg-muted'
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilterType('CPF')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              filterType === 'CPF' ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border hover:bg-muted'
            )}
          >
            Pessoa Física
          </button>
          <button 
            onClick={() => setFilterType('CNPJ')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              filterType === 'CNPJ' ? 'bg-secondary text-secondary-foreground' : 'bg-card border border-border hover:bg-muted'
            )}
          >
            Pessoa Jurídica
          </button>
        </div>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando clientes...</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {paginatedClients.map((client, i) => (
              <div
                key={client.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
                style={{ animationDelay: `${(i + 1) * 50}ms` }}
                onClick={() => handleOpenClientDetail(client)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'p-2.5 rounded-xl flex-shrink-0',
                    client.document_type === 'CNPJ'
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  {client.document_type === 'CNPJ' ? (
                    <Building2 className="h-5 w-5" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>

                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {client.name}
                    </h3>
                    {client.cpf_rg_url && (
                      <FileText className="h-4 w-4 text-secondary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="truncate">{client.document}</span>
                    <span className="hidden sm:inline truncate">{client.email}</span>
                    <span className="hidden md:inline">{client.phone}</span>
                  </div>
                </div>

                {/* Counts */}
                <div className="hidden sm:flex items-center gap-2">
                  {(client.quotes_count || 0) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {client.quotes_count} orç.
                    </Badge>
                  )}
                  {(client.projects_count || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {client.projects_count} proj.
                    </Badge>
                  )}
                  {(client.service_orders_count || 0) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {client.service_orders_count} OS
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div className="hidden lg:block text-sm text-muted-foreground min-w-[120px] text-right">
                  {client.city || 'N/A'}/{client.state || 'N/A'}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleWhatsApp(client); }}>
                        <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                        WhatsApp
                      </DropdownMenuItem>
                      {canDelete && (
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && filteredClients.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
        </div>
      )}

      {!isLoading && filteredClients.length > 0 && (
        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
          />
        </div>
      )}

      {/* Client Detail Sheet */}
      <ClientDetailSheet
        client={selectedClient}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}

        onEdit={(client) => {
          setShowDetailSheet(false);
          handleOpenModal(client);
        }}
        onWhatsApp={handleWhatsApp}
        onRefresh={loadData}
      />

      {/* Client Modal (Create/Edit) */}
      {showModal && editingClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Document Type */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={editingClient.document_type === 'CPF'}
                    onChange={() => setEditingClient({ ...editingClient, document_type: 'CPF' })}
                    className="text-secondary"
                  />
                  <span className="text-sm">Pessoa Física (CPF)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={editingClient.document_type === 'CNPJ'}
                    onChange={() => setEditingClient({ ...editingClient, document_type: 'CNPJ' })}
                    className="text-secondary"
                  />
                  <span className="text-sm">Pessoa Jurídica (CNPJ)</span>
                </label>
              </div>

              {/* Document */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {editingClient.document_type}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingClient.document}
                    onChange={(e) => setEditingClient({ ...editingClient, document: e.target.value })}
                    placeholder={editingClient.document_type === 'CPF' ? '000.000.000-00' : '00.000.000/0001-00'}
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                  {editingClient.document_type === 'CNPJ' && (
                    <button
                      onClick={handleSearchCNPJ}
                      className="px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Telefone</label>
                  <input
                    type="text"
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">CEP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingClient.zip_code || ''}
                      onChange={(e) => setEditingClient({ ...editingClient, zip_code: e.target.value })}
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <button
                      onClick={handleSearchCEP}
                      className="px-3 py-3 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Rua</label>
                  <input
                    type="text"
                    value={editingClient.street || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, street: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Número</label>
                  <input
                    type="text"
                    value={editingClient.number || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, number: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Bairro</label>
                  <input
                    type="text"
                    value={editingClient.neighborhood || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, neighborhood: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Cidade</label>
                  <input
                    type="text"
                    value={editingClient.city || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Estado</label>
                  <input
                    type="text"
                    value={editingClient.state || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, state: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              {/* Documents info - editing is done in ClientDetailSheet */}
              {selectedClient && (selectedClient.cpf_rg_url || (selectedClient.electricity_bills || []).length > 0) && (
                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Para gerenciar documentos, use a tela de detalhes do cliente.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClient}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
