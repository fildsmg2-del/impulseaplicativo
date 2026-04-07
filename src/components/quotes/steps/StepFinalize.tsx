import { useState, useRef } from 'react';
import { FileText, Check, X, MessageCircle, Download, Send, Loader2, PenTool } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface StepFinalizeProps {
  formData: QuoteFormData;
  onApprove: () => void;
  onReject: () => void;
  onSendQuote: () => void;
  onSendForSignature: () => Promise<string | null>;
  isLoading: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function StepFinalize({ formData, onApprove, onReject, onSendQuote, onSendForSignature, isLoading }: StepFinalizeProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingSignature, setIsSendingSignature] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateQuotePDF(formData);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = formData.client?.phone?.replace(/\D/g, '') || '';
    const message = encodeURIComponent(
      `Olá ${formData.client?.name || ''}!\n\n` +
      `Segue a proposta comercial para seu sistema de energia solar:\n\n` +
      `📍 Local: ${formData.address_city || ''} - ${formData.address_state || ''}\n` +
      `☀️ Potência: ${formData.recommended_power_kwp?.toFixed(2) || 0} kWp\n` +
      `🔋 Módulos: ${formData.modules_quantity || 0} unidades\n` +
      `💰 Valor: ${formatCurrency(formData.total || 0)}\n` +
      `📈 Retorno: ${Math.floor((formData.payback_months || 0) / 12)} anos e ${(formData.payback_months || 0) % 12} meses\n\n` +
      `Aguardamos seu retorno!`
    );
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleSendForSignature = async () => {
    setIsSendingSignature(true);
    try {
      const token = await onSendForSignature();
      if (token) {
        const phone = formData.client?.phone?.replace(/\D/g, '') || '';
        const signatureUrl = `${window.location.origin}/orcamento/${token}`;
        const message = encodeURIComponent(
          `Olá ${formData.client?.name || ''}!\n\n` +
          `Sua proposta comercial para sistema de energia solar está pronta para assinatura! 🌞\n\n` +
          `📍 Local: ${formData.address_city || ''} - ${formData.address_state || ''}\n` +
          `☀️ Potência: ${formData.recommended_power_kwp?.toFixed(2) || 0} kWp\n` +
          `💰 Valor: ${formatCurrency(formData.total || 0)}\n\n` +
          `✍️ *Clique no link abaixo para revisar e assinar digitalmente:*\n` +
          `${signatureUrl}\n\n` +
          `Após sua assinatura, entraremos em contato para os próximos passos.\n\n` +
          `Qualquer dúvida, estamos à disposição!`
        );
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
      }
    } catch (error) {
      console.error('Error sending for signature:', error);
    } finally {
      setIsSendingSignature(false);
    }
  };

  const paybackYears = Math.floor((formData.payback_months || 0) / 12);
  const paybackRemainderMonths = (formData.payback_months || 0) % 12;
  
  // Calculate monthly savings if not set
  const monthlySavings = formData.monthly_savings || ((formData.estimated_generation_kwh || 0) * (formData.tariff || 0));

  // Check if quote was already signed
  const isClientSigned = !!formData.client_signature;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <FileText className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Finalizar Orçamento</h3>
            <p className="text-muted-foreground">Revise e finalize a proposta comercial</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 8/8</span>
      </div>

      {/* Client Signature Status */}
      {isClientSigned && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Cliente assinou digitalmente</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Assinado em: {new Date(formData.client_signed_at || '').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quote Preview */}
      <div ref={previewRef} className="p-6 rounded-2xl bg-card border border-border shadow-impulse space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground">Proposta Comercial</h2>
          <p className="text-muted-foreground">Sistema Fotovoltaico</p>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h4>
            <p className="font-semibold text-foreground">{formData.client?.name || 'Não informado'}</p>
            <p className="text-sm text-muted-foreground">{formData.client?.email}</p>
            <p className="text-sm text-muted-foreground">{formData.client?.phone}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Local de Instalação</h4>
            <p className="text-sm text-foreground">
              {formData.address_street}, {formData.address_number}
              {formData.address_complement && ` - ${formData.address_complement}`}
            </p>
            <p className="text-sm text-foreground">
              {formData.address_neighborhood} - {formData.address_city}/{formData.address_state}
            </p>
            <p className="text-sm text-foreground">CEP: {formData.address_zip_code}</p>
          </div>
        </div>

        {/* System Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground">Potência</p>
            <p className="text-lg font-bold text-foreground">{formData.recommended_power_kwp?.toFixed(2) || 0} kWp</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground">Módulos</p>
            <p className="text-lg font-bold text-foreground">{formData.modules_quantity || 0} un</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground">Geração Mensal</p>
            <p className="text-lg font-bold text-foreground">{formData.estimated_generation_kwh?.toLocaleString('pt-BR') || 0} kWh</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground">Payback</p>
            <p className="text-lg font-bold text-foreground">{paybackYears}a {paybackRemainderMonths}m</p>
          </div>
        </div>

        {/* Equipment */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Equipamentos</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Módulos:</span> {formData.modules_quantity}x {formData.modules}</p>
            <p><span className="text-muted-foreground">Inversor:</span> {formData.inverter}</p>
            <p><span className="text-muted-foreground">Estrutura:</span> {formData.structure}</p>
          </div>
        </div>

        {/* Services */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Serviços Inclusos</h4>
          <div className="flex flex-wrap gap-2">
            {formData.installation && (
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">Instalação</span>
            )}
            {formData.homologation && (
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">Homologação</span>
            )}
            {formData.monitoring && (
              <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">Monitoramento</span>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="p-5 rounded-xl gradient-gold">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary/70">Valor Total do Investimento</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(formData.total || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary/70">Economia Mensal</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(monthlySavings)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={handleGeneratePDF}
          disabled={isGeneratingPDF}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-xl hover:bg-muted transition-all disabled:opacity-50"
        >
          {isGeneratingPDF ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          <span className="font-medium">PDF</span>
        </button>

        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-success text-success-foreground rounded-xl hover:opacity-90 transition-all"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">WhatsApp</span>
        </button>

        <button
          onClick={handleSendForSignature}
          disabled={isSendingSignature || !formData.client?.phone}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 col-span-2 md:col-span-1"
        >
          {isSendingSignature ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <PenTool className="h-5 w-5" />
          )}
          <span className="font-medium">Enviar p/ Assinar</span>
        </button>

        <button
          onClick={() => {
            onSendQuote();
          }}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          <span className="font-medium">Marcar Enviado</span>
        </button>
      </div>

      {/* Approve/Reject */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-xl hover:bg-destructive/20 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
          <span className="font-semibold">Reprovar Orçamento</span>
        </button>

        <button
          onClick={onApprove}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-4 gradient-gold text-primary rounded-xl hover:shadow-gold transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          <span className="font-semibold">Aprovar e Criar Projeto</span>
        </button>
      </div>
    </div>
  );
}
