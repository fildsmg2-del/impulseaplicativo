import { useState, useEffect } from 'react';
import { X, FileText, Download, Edit, Save, CheckCircle, XCircle, DollarSign, Clock, User, Building2, Calendar, Package, PenTool, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { saleService, Sale, SaleItem } from '@/services/saleService';
import { clientService, Client } from '@/services/clientService';
import { getCompanySettings, CompanySettings } from '@/services/companySettingsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { generateSalePDF } from '@/utils/salePdfGenerator';
import { SignatureCanvas } from './SignatureCanvas';

interface SaleModalProps {
  saleId: string;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export function SaleModal({ saleId, onClose }: SaleModalProps) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editedSale, setEditedSale] = useState<Partial<Sale>>({});
  const [showClientSignature, setShowClientSignature] = useState(false);
  const [showCompanySignature, setShowCompanySignature] = useState(false);
  const { toast } = useToast();
  const { hasRole } = useAuth();

  useEffect(() => {
    loadData();
  }, [saleId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [saleData, companyData] = await Promise.all([
        saleService.getById(saleId),
        getCompanySettings(),
      ]);
      
      if (saleData) {
        setSale(saleData);
        setEditedSale(saleData);
        
        if (saleData.client_id) {
          const clientData = await clientService.getById(saleData.client_id);
          setClient(clientData);
        }
      }
      setCompany(companyData);
    } catch (error) {
      console.error('Error loading sale:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da venda.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!sale) return;
      await saleService.update(sale.id, editedSale);
      toast({
        title: 'Sucesso',
        description: 'Venda atualizada com sucesso.',
      });
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error('Error updating sale:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a venda.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async () => {
    try {
      if (!sale) return;
      await saleService.updateApprovalStatus(sale.id, 'APROVADO');
      toast({
        title: 'Sucesso',
        description: 'Venda aprovada com sucesso.',
      });
      loadData();
    } catch (error) {
      console.error('Error approving sale:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar a venda.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    try {
      if (!sale) return;
      await saleService.updateApprovalStatus(sale.id, 'REJEITADO');
      toast({
        title: 'Sucesso',
        description: 'Venda rejeitada.',
      });
      loadData();
    } catch (error) {
      console.error('Error rejecting sale:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar a venda.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      if (!sale) return;
      await saleService.updatePaymentStatus(sale.id, 'PAGO');
      toast({
        title: 'Sucesso',
        description: 'Pagamento confirmado.',
      });
      loadData();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o pagamento.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!sale || !client || !company) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos para gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await generateSalePDF(sale, client, company);
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso.',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleClientSign = async (signature: string) => {
    try {
      if (!sale) return;
      await saleService.signClient(sale.id, signature);
      toast({
        title: 'Sucesso',
        description: 'Assinatura do cliente registrada.',
      });
      setShowClientSignature(false);
      loadData();
    } catch (error) {
      console.error('Error signing:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a assinatura.',
        variant: 'destructive',
      });
    }
  };

  const handleCompanySign = async (signature: string) => {
    try {
      if (!sale) return;
      await saleService.signCompany(sale.id, signature);
      toast({
        title: 'Sucesso',
        description: 'Assinatura da empresa registrada.',
      });
      setShowCompanySignature(false);
      loadData();
    } catch (error) {
      console.error('Error signing:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a assinatura.',
        variant: 'destructive',
      });
    }
  };

  const handleWhatsApp = () => {
    if (!client) return;
    const phone = client.phone?.replace(/\D/g, '') || '';
    const message = encodeURIComponent(
      `Olá ${client.name}!\n\n` +
      `Segue o comprovante da sua compra nº ${sale?.sale_number}:\n\n` +
      `💰 Valor Total: ${formatCurrency(sale?.total || 0)}\n` +
      `📅 Data: ${sale?.sale_date ? formatDate(sale.sale_date) : '-'}\n\n` +
      `Agradecemos a preferência!`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary">
          <div className="flex items-center gap-4">
            <FileText className="h-6 w-6 text-primary-foreground" />
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">
                {sale.sale_number}
              </h2>
              <p className="text-sm text-primary-foreground/70">
                Comprovante de Venda
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
            {!isEditing ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSave}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex items-center gap-4">
            <Badge
              variant={sale.approval_status === 'APROVADO' ? 'default' : sale.approval_status === 'REJEITADO' ? 'destructive' : 'secondary'}
              className="gap-1 px-3 py-1"
            >
              {sale.approval_status === 'APROVADO' ? <CheckCircle className="h-4 w-4" /> : sale.approval_status === 'REJEITADO' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {sale.approval_status === 'APROVADO' ? 'Aprovado' : sale.approval_status === 'REJEITADO' ? 'Rejeitado' : 'Pendente'}
            </Badge>
            <Badge
              variant={sale.payment_status === 'PAGO' ? 'default' : 'outline'}
              className="gap-1 px-3 py-1"
            >
              {sale.payment_status === 'PAGO' ? <DollarSign className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {sale.payment_status === 'PAGO' ? 'Pago' : 'Pagamento Pendente'}
            </Badge>
          </div>

          {/* Company Header */}
          {company && (
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-start gap-4">
                {company.logo_url && (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-16 w-auto object-contain"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-impulse-gold" />
                    <h3 className="font-bold text-lg text-foreground">{company.name}</h3>
                  </div>
                  {company.cnpj && <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>}
                  {company.email && <p className="text-sm text-muted-foreground">{company.email}</p>}
                  {company.phone && <p className="text-sm text-muted-foreground">{company.phone}</p>}
                  {company.street && (
                    <p className="text-sm text-muted-foreground">
                      {company.street}, {company.number} {company.complement && `- ${company.complement}`} - {company.neighborhood}, {company.city}/{company.state} - {company.zip_code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Client Info */}
          {client && (
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-5 w-5 text-impulse-gold" />
                <h3 className="font-semibold text-foreground">Dados do Cliente</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium text-foreground">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Documento</p>
                  <p className="font-medium text-foreground">{client.document}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium text-foreground">{client.phone}</p>
                </div>
                {client.street && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium text-foreground">
                      {client.street}, {client.number} {client.complement && `- ${client.complement}`} - {client.neighborhood}, {client.city}/{client.state} - {client.zip_code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Products */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-impulse-gold" />
              <h3 className="font-semibold text-foreground">Produtos/Serviços</h3>
            </div>
            <div className="bg-muted/30 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Item</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground">Qtd</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">Valor Unit.</th>
                    <th className="text-right p-3 text-sm font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items?.map((item: SaleItem, index: number) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="p-3 text-foreground">{item.name}</td>
                      <td className="p-3 text-center text-foreground">{item.quantity}</td>
                      <td className="p-3 text-right text-foreground">{formatCurrency(item.unit_price)}</td>
                      <td className="p-3 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={3} className="p-3 text-right font-medium text-foreground">Subtotal:</td>
                    <td className="p-3 text-right font-medium text-foreground">{formatCurrency(sale.subtotal)}</td>
                  </tr>
                  {sale.discount > 0 && (
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-medium text-destructive">Desconto:</td>
                      <td className="p-3 text-right font-medium text-destructive">-{formatCurrency(sale.discount)}</td>
                    </tr>
                  )}
                  <tr className="bg-impulse-gold/10">
                    <td colSpan={3} className="p-3 text-right font-bold text-foreground">Total:</td>
                    <td className="p-3 text-right font-bold text-impulse-gold text-lg">{formatCurrency(sale.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-impulse-gold" />
                <h3 className="font-semibold text-foreground">Datas</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Data da Venda:</span>
                  <span className="text-foreground">{formatDate(sale.sale_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Previsão de Conclusão:</span>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedSale.estimated_completion_date || ''}
                      onChange={(e) => setEditedSale({ ...editedSale, estimated_completion_date: e.target.value })}
                      className="w-40 h-8"
                    />
                  ) : (
                    <span className="text-foreground">
                      {sale.estimated_completion_date ? formatDate(sale.estimated_completion_date) : 'Não definida'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Observações</Label>
            {isEditing ? (
              <Textarea
                value={editedSale.notes || ''}
                onChange={(e) => setEditedSale({ ...editedSale, notes: e.target.value })}
                placeholder="Observações sobre a venda..."
                rows={3}
              />
            ) : (
              <p className="mt-2 text-muted-foreground">
                {sale.notes || 'Nenhuma observação'}
              </p>
            )}
          </div>

          <Separator />

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground mb-4">Assinatura do Cliente</p>
              {sale.client_signature ? (
                <div>
                  <img 
                    src={sale.client_signature} 
                    alt="Assinatura do cliente" 
                    className="max-h-20 mx-auto mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Assinado em: {sale.client_signed_at ? formatDate(sale.client_signed_at) : '-'}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClientSignature(true)}
                  className="gap-2"
                >
                  <PenTool className="h-4 w-4" />
                  Assinar
                </Button>
              )}
            </div>
            <div className="text-center p-6 border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground mb-4">Assinatura da Empresa</p>
              {sale.company_signature ? (
                <div>
                  <img 
                    src={sale.company_signature} 
                    alt="Assinatura da empresa" 
                    className="max-h-20 mx-auto mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Assinado em: {sale.company_signed_at ? formatDate(sale.company_signed_at) : '-'}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompanySignature(true)}
                  className="gap-2"
                >
                  <PenTool className="h-4 w-4" />
                  Assinar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            {sale.approval_status === 'PENDENTE' && (
              <>
                <Button onClick={handleApprove} className="gap-2 bg-success hover:bg-success/90">
                  <CheckCircle className="h-4 w-4" />
                  Aprovar
                </Button>
                <Button onClick={handleReject} variant="destructive" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejeitar
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              className="gap-2 bg-success/10 text-success hover:bg-success/20 border-success/30"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar por WhatsApp
            </Button>
            {sale.payment_status === 'PENDENTE' && sale.approval_status === 'APROVADO' && (
              <Button onClick={handleMarkAsPaid} className="gap-2 bg-impulse-gold text-impulse-dark hover:bg-impulse-gold/90">
                <DollarSign className="h-4 w-4" />
                Confirmar Pagamento
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>

      {/* Signature Modals */}
      {showClientSignature && (
        <SignatureCanvas
          title="Assinatura do Cliente"
          onSave={handleClientSign}
          onCancel={() => setShowClientSignature(false)}
        />
      )}
      {showCompanySignature && (
        <SignatureCanvas
          title="Assinatura da Empresa"
          onSave={handleCompanySign}
          onCancel={() => setShowCompanySignature(false)}
        />
      )}
    </div>
  );
}
