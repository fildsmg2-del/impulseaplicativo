import { useState, useRef, useEffect } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, FileText, Upload, Eye, Edit, MessageCircle, ClipboardList, FolderOpen, Wrench, Plus, Download, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Client, CreateClientData } from '@/services/clientService';
import { Project } from '@/services/projectService';
import { Quote } from '@/services/quoteService';
import { ServiceOrder } from '@/services/serviceOrderService';
import { supabase } from '@/integrations/supabase/client';
import { storageService } from '@/services/storageService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ElectricityBill {
  url: string;
  path: string;
  name: string;
  uploaded_at: string;
}

interface ClientWithExtras extends Client {
  projects_count?: number;
  quotes_count?: number;
  service_orders_count?: number;
  cpf_rg_url?: string;
  electricity_bills?: ElectricityBill[];
}

interface ClientDetailSheetProps {
  client: ClientWithExtras | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: ClientWithExtras) => void;
  onWhatsApp: (client: ClientWithExtras) => void;
  onRefresh: () => void;
}

export function ClientDetailSheet({
  client,
  open,
  onOpenChange,
  onEdit,
  onWhatsApp,
  onRefresh,
}: ClientDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [uploading, setUploading] = useState<'cpf_rg' | 'bills' | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && client?.id) {
      loadClientDetails(client.id);
    }
  }, [open, client?.id]);

  const loadClientDetails = async (clientId: string) => {
    setIsLoadingDetails(true);
    try {
      const [projectsData, quotesData, serviceOrdersData] = await Promise.all([
        supabase.from('projects').select('*').eq('client_id', clientId),
        supabase.from('quotes').select('*').eq('client_id', clientId),
        supabase.from('service_orders').select('*, service_type_info:service_types(name)').eq('client_id', clientId),
      ]);

      setProjects((projectsData.data || []) as Project[]);
      setQuotes((quotesData.data || []) as Quote[]);
      setServiceOrders((serviceOrdersData.data || []) as any[]);
    } catch (error) {
      console.error('Error loading client details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (!client) return null;

  const clientProjects = projects.filter(p => p.client_id === client.id);
  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const clientServiceOrders = serviceOrders.filter(so => so.client_id === client.id);

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>, type: 'cpf_rg' | 'bills') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(type);
    
    try {
      const folder = type === 'cpf_rg' 
        ? `clients/${client.id}/documents`
        : `clients/${client.id}/bills`;

      const result = await storageService.upload(file, folder);

      if (type === 'cpf_rg') {
        await supabase
          .from('clients')
          .update({ cpf_rg_url: result.url })
          .eq('id', client.id);
      } else {
        const currentBills = client.electricity_bills || [];
        await supabase
          .from('clients')
          .update({ 
            electricity_bills: [
              ...currentBills, 
              { 
                url: result.url, 
                path: result.path, 
                name: file.name,
                uploaded_at: new Date().toISOString() 
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ] as any
          })
          .eq('id', client.id);
      }

      toast.success('Documento enviado com sucesso!');
      onRefresh();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(null);
      event.target.value = '';
    }
  };

  const handleDownloadDocument = async (urlOrPath: string, fileName?: string) => {
    setDownloadingDoc(urlOrPath);
    try {
      // If it's a Google Drive URL, open directly
      if (urlOrPath.includes('drive.google.com')) {
        window.open(urlOrPath, '_blank');
      } else {
        // Try to get download URL from storage service
        const downloadUrl = await storageService.getDownloadUrl(urlOrPath);
        window.open(downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: try opening the URL directly
      window.open(urlOrPath, '_blank');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDeleteBill = async (billIndex: number) => {
    try {
      const currentBills = client.electricity_bills || [];
      const billToDelete = currentBills[billIndex];
      
      // Try to delete from storage
      if (billToDelete?.path) {
        try {
          await storageService.delete(billToDelete.path);
        } catch (e) {
          console.warn('Could not delete file from storage:', e);
        }
      }
      
      // Remove from database
      const updatedBills = currentBills.filter((_, i: number) => i !== billIndex);
      await supabase
        .from('clients')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ electricity_bills: updatedBills as any })
        .eq('id', client.id);
      
      toast.success('Conta de luz removida!');
      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover conta de luz');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      VENDAS: { label: 'VENDAS', variant: 'default' },
      FINANCEIRO: { label: 'FINANCEIRO', variant: 'secondary' },
      COMPRAS: { label: 'COMPRAS', variant: 'default' },
      ENGENHEIRO: { label: 'ENGENHEIRO', variant: 'default' },
      TECNICO: { label: 'TECNICO', variant: 'default' },
      POS_VENDA: { label: 'PÓS VENDA', variant: 'outline' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getQuoteStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Rascunho', variant: 'outline' },
      SENT: { label: 'Enviado', variant: 'default' },
      APPROVED: { label: 'Aprovado', variant: 'secondary' },
      REJECTED: { label: 'Rejeitado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getServiceOrderStatusBadge = (status: string, deadlineDate?: string | null) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = deadlineDate && new Date(deadlineDate) < today && status !== 'CONCLUIDO';
    
    if (isOverdue) {
      return <Badge variant="destructive">Vencida</Badge>;
    }
    
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      EM_ABERTO: { label: 'Em Aberto', variant: 'outline' },
      EM_ANDAMENTO: { label: 'Em Andamento', variant: 'default' },
      CONCLUIDO: { label: 'Concluído', variant: 'secondary' },
      CANCELADO: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-3 rounded-xl',
                client.document_type === 'CNPJ'
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {client.document_type === 'CNPJ' ? (
                <Building2 className="h-6 w-6" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{client.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{client.document}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => onWhatsApp(client)}>
                <MessageCircle className="h-4 w-4 text-green-500" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="flex w-full overflow-x-auto justify-start h-auto p-1 bg-muted/20 scrollbar-none border-b rounded-none shrink-0 gap-1">
            <TabsTrigger value="info" className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Orçamentos</span>
              {clientQuotes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {clientQuotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1.5">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Projetos</span>
              {clientProjects.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {clientProjects.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="service-orders" className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">OS</span>
              {clientServiceOrders.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {clientServiceOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-6 space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
              </div>
              {(client.street || client.city) && (
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {[client.street, client.number].filter(Boolean).join(', ')}
                      {client.complement && ` - ${client.complement}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[client.neighborhood, client.city, client.state].filter(Boolean).join(' - ')}
                      {client.zip_code && ` | CEP: ${client.zip_code}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Documents */}
            <div className="space-y-4">
              <h3 className="font-semibold">Documentos</h3>
              
              {/* CPF/RG Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">CPF/RG</p>
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 transition-colors",
                    uploading === 'cpf_rg' ? 'opacity-50 cursor-wait' : 'hover:border-secondary/50 cursor-pointer'
                  )}
                >
                  {uploading === 'cpf_rg' ? (
                    <Loader2 className="h-5 w-5 text-secondary animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploading === 'cpf_rg' ? 'Enviando...' : client.cpf_rg_url ? 'Substituir documento' : 'Clique para enviar'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleUploadDocument(e, 'cpf_rg')}
                    className="hidden"
                    disabled={uploading === 'cpf_rg'}
                  />
                </div>
                {client.cpf_rg_url && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium">Documento CPF/RG</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDocument(client.cpf_rg_url!)}
                      disabled={downloadingDoc === client.cpf_rg_url}
                    >
                      {downloadingDoc === client.cpf_rg_url ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Abrir
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Electricity Bills Section */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Contas de Luz</p>
                <div 
                  onClick={() => !uploading && billsInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed border-border rounded-xl p-4 flex items-center justify-center gap-2 transition-colors",
                    uploading === 'bills' ? 'opacity-50 cursor-wait' : 'hover:border-secondary/50 cursor-pointer'
                  )}
                >
                  {uploading === 'bills' ? (
                    <Loader2 className="h-5 w-5 text-secondary animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploading === 'bills' ? 'Enviando...' : 'Adicionar conta de luz (PDF)'}
                  </span>
                  <input
                    ref={billsInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => handleUploadDocument(e, 'bills')}
                    className="hidden"
                    disabled={uploading === 'bills'}
                  />
                </div>
                {(client.electricity_bills || []).length > 0 && (
                  <div className="space-y-2">
                    {(client.electricity_bills || []).map((bill: ElectricityBill, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-chart-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {bill.name || `Conta ${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(bill.uploaded_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownloadDocument(bill.url || bill.path, bill.name)}
                            disabled={downloadingDoc === (bill.url || bill.path)}
                          >
                            {downloadingDoc === (bill.url || bill.path) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBill(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="mt-6 space-y-4">
            <Button
              onClick={() => {
                onOpenChange(false);
                window.location.href = `/quotes?new=true&client_id=${client.id}`;
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>

            {clientQuotes.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = `/quotes?id=${quote.id}`;
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {quote.recommended_power_kwp?.toFixed(2) || 0} kWp
                          </p>
                          {getQuoteStatusBadge(quote.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {quote.total 
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)
                            : 'Valor não definido'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criado em {format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6 space-y-4">
            <Button
              onClick={() => {
                onOpenChange(false);
                window.location.href = `/projects?new=true&client_id=${client.id}`;
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>

            {clientProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum projeto encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = `/projects?id=${project.id}`;
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {project.power_kwp?.toFixed(2) || 0} kWp
                          </p>
                          {getStatusBadge(project.status)}
                        </div>
                        {project.start_date && (
                          <p className="text-xs text-muted-foreground">
                            Início: {format(new Date(project.start_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Service Orders Tab */}
          <TabsContent value="service-orders" className="mt-6 space-y-4">
            <Button
              onClick={() => {
                onOpenChange(false);
                window.location.href = `/service-orders?new=true&client_id=${client.id}`;
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem de Serviço
            </Button>

            {clientServiceOrders.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma OS encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientServiceOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = `/service-orders?id=${order.id}`;
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.service_type_info?.name || order.service_type}</p>
                          {getServiceOrderStatusBadge(order.status, order.deadline_date)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {order.opening_date && (
                            <span>Abertura: {format(new Date(order.opening_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                          {order.deadline_date && (
                            <span>Prazo: {format(new Date(order.deadline_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
