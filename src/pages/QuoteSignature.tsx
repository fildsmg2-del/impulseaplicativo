import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Check, FileText, MapPin, Zap, DollarSign, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignatureCanvas } from '@/components/sales/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';

interface QuoteData {
  id: string;
  status: string;
  recommended_power_kwp: number;
  estimated_generation_kwh: number;
  modules_quantity: number;
  modules: string;
  inverter: string;
  structure: string;
  total: number;
  equipment_cost: number;
  labor_cost: number;
  discount: number;
  monthly_savings: number;
  payback_months: number;
  installation: boolean;
  homologation: boolean;
  monitoring: boolean;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  client_signature: string | null;
  client_signed_at: string | null;
  clients: {
    id: string;
    name: string;
    email: string;
    phone: string;
    document: string;
    document_type: string;
  } | null;
}

interface CompanyData {
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

export default function QuoteSignature() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadQuote = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await supabase.functions.invoke('quote-signature', {
        method: 'GET',
        body: undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Since invoke doesn't support query params well, let's use fetch directly
      const { data: { publicUrl } } = supabase.storage.from('temp').getPublicUrl('temp');
      const baseUrl = publicUrl.replace('/storage/v1/object/public/temp/temp', '');
      
      const fetchResponse = await fetch(
        `${baseUrl}/functions/v1/quote-signature?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await fetchResponse.json();

      if (!fetchResponse.ok) {
        if (data.signed) {
          setAlreadySigned(true);
          setSignedAt(data.signed_at);
        } else {
          setError(data.error || 'Erro ao carregar orçamento');
        }
        return;
      }

      setQuote(data.quote);
      setCompany(data.company);
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Erro ao carregar orçamento. Verifique o link e tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadQuote();
    }
  }, [token, loadQuote]);



  const handleSign = async (signatureData: string) => {
    try {
      setSigning(true);
      
      const { data: { publicUrl } } = supabase.storage.from('temp').getPublicUrl('temp');
      const baseUrl = publicUrl.replace('/storage/v1/object/public/temp/temp', '');
      
      const response = await fetch(
        `${baseUrl}/functions/v1/quote-signature`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token,
            signature: signatureData
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao assinar');
      }

      setSuccess(true);
      setShowSignature(false);
    } catch (err: any) {
      console.error('Error signing quote:', err);
      setError(err.message || 'Erro ao assinar orçamento');
    } finally {
      setSigning(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Orçamento Assinado!</h2>
            <p className="text-muted-foreground">
              Sua assinatura foi registrada com sucesso. A empresa entrará em contato em breve para confirmar os próximos passos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Orçamento Já Assinado</h2>
            <p className="text-muted-foreground">
              Este orçamento já foi assinado
              {signedAt && ` em ${formatDate(signedAt)}`}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Erro</h2>
            <p className="text-muted-foreground">{error || 'Orçamento não encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          {company?.logo_url && (
            <img 
              src={company.logo_url} 
              alt={company.name} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-foreground">{company?.name || 'Impulse Soluções em Energia'}</h1>
          <p className="text-muted-foreground mt-2">Proposta de Sistema Fotovoltaico</p>
        </div>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{quote.clients?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documento</p>
              <p className="font-medium">{quote.clients?.document || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{quote.clients?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{quote.clients?.phone || '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Local da Instalação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {[
                quote.address_street,
                quote.address_number,
                quote.address_neighborhood,
                quote.address_city,
                quote.address_state
              ].filter(Boolean).join(', ') || 'Endereço não informado'}
            </p>
          </CardContent>
        </Card>

        {/* System Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Especificações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{quote.recommended_power_kwp?.toFixed(2) || 0}</p>
                <p className="text-sm text-muted-foreground">kWp</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{quote.estimated_generation_kwh?.toFixed(0) || 0}</p>
                <p className="text-sm text-muted-foreground">kWh/mês</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary">{quote.modules_quantity || 0}</p>
                <p className="text-sm text-muted-foreground">Módulos</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Módulos</span>
                <span className="font-medium">{quote.modules || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inversor</span>
                <span className="font-medium">{quote.inverter || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estrutura</span>
                <span className="font-medium">{quote.structure || '-'}</span>
              </div>
            </div>

            {/* Services */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {quote.installation && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
                  <Check className="h-3 w-3" /> Instalação
                </span>
              )}
              {quote.homologation && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
                  <Check className="h-3 w-3" /> Homologação
                </span>
              )}
              {quote.monitoring && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
                  <Check className="h-3 w-3" /> Monitoramento
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Investimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipamentos</span>
              <span>{formatCurrency(quote.equipment_cost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mão de obra</span>
              <span>{formatCurrency(quote.labor_cost || 0)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(quote.total || 0)}</span>
            </div>

            {/* ROI Info */}
            {quote.monthly_savings > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Economia Mensal Estimada</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(quote.monthly_savings)}</p>
                  </div>
                  {quote.payback_months > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Retorno em</p>
                      <p className="text-xl font-bold text-green-600">
                        {Math.floor(quote.payback_months / 12)} anos e {quote.payback_months % 12} meses
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Button */}
        <Card className="border-primary">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Aceitar Proposta</h3>
              <p className="text-muted-foreground mb-4">
                Ao assinar, você concorda com os termos desta proposta. A empresa entrará em contato para confirmar os próximos passos.
              </p>
              <Button 
                size="lg" 
                onClick={() => setShowSignature(true)}
                className="bg-impulse-gold text-impulse-dark hover:bg-impulse-gold/90"
              >
                Assinar Digitalmente
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>{company?.phone && `Tel: ${company.phone}`} {company?.email && `• ${company.email}`}</p>
        </div>
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <SignatureCanvas
          title="Assinar Orçamento"
          onSave={handleSign}
          onCancel={() => setShowSignature(false)}
        />
      )}
    </div>
  );
}
