import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { quoteService, Quote, CreateQuoteData, AdditionalCostItem } from '@/services/quoteService';
import { projectService } from '@/services/projectService';
import { buildInitialChecklist } from '@/components/projects/projectStagesConfig';
import { clientService, Client } from '@/services/clientService';
import { saleService, SaleItem } from '@/services/saleService';
import { StepLocation } from './steps/StepLocation';
import { StepConsumption } from './steps/StepConsumption';
import { StepDimensioning } from './steps/StepDimensioning';
import { StepKitSelection } from './steps/StepKitSelection';
import { StepServices } from './steps/StepServices';
import { StepPricing } from './steps/StepPricing';
import { StepPayback } from './steps/StepPayback';
import { StepFinalize } from './steps/StepFinalize';

export interface QuoteFormData extends CreateQuoteData {
  client?: Client;
}

const createAdditionalItem = (overrides?: Partial<QuoteFormData['additional_cost_items'][number]>) => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `additional-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  value: 0,
  ...overrides,
});

const STEPS = [
  { key: 'location', label: 'Localização', shortLabel: 'Localização', number: 1 },
  { key: 'consumption', label: 'Consumo', shortLabel: 'Consumo', number: 2 },
  { key: 'dimensioning', label: 'Dimensionamento', shortLabel: 'Dimens.', number: 3 },
  { key: 'kit', label: 'Kit Solar', shortLabel: 'Kit', number: 4 },
  { key: 'services', label: 'Serviços', shortLabel: 'Serviços', number: 5 },
  { key: 'pricing', label: 'Precificação', shortLabel: 'Preço', number: 6 },
  { key: 'payback', label: 'Forma de Pagamento', shortLabel: 'Pagam.', number: 7 },
  { key: 'finalize', label: 'Finalizar', shortLabel: 'Finalizar', number: 8 },
];

interface QuoteWizardProps {
  quoteId?: string;
  preselectedClientId?: string;
  onClose: () => void;
}

export function QuoteWizard({ quoteId, preselectedClientId, onClose }: QuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<QuoteFormData>({
    status: 'DRAFT',
    installation: true,
    homologation: true,
    monitoring: true,
    equipment_cost: 0,
    labor_cost: 0,
    additional_costs: 0,
    additional_cost_items: [createAdditionalItem()],
    discount: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [savedQuoteId, setSavedQuoteId] = useState<string | undefined>(quoteId);
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadClients = useCallback(async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const loadQuote = useCallback(async (id: string) => {
    try {
      const quote = await quoteService.getById(id);
      if (quote) {
        const client = quote.client_id ? await clientService.getById(quote.client_id) : undefined;
        const additionalItems =
          Array.isArray(quote.additional_cost_items) && quote.additional_cost_items.length > 0
            ? quote.additional_cost_items
            : [createAdditionalItem({ value: quote.additional_costs || 0 })];

        setFormData({
          ...quote,
          monthly_bills: quote.monthly_bills || [],
          client: client || undefined,
          additional_cost_items: additionalItems,
        });
        
        // If quote was sent (awaiting approval), go directly to finalize step
        if (quote.status === 'SENT') {
          setCurrentStep(7); // Finalize step (0-indexed)
        }
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o orçamento.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    loadClients();
    if (quoteId) {
      loadQuote(quoteId);
    }
  }, [quoteId, loadClients, loadQuote]);

  const updateFormData = useCallback((data: Partial<QuoteFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const saveQuote = async (): Promise<Quote | null> => {
    // Prevent duplicate saves
    if (isSaving) return null;
    
    setIsSaving(true);
    try {
      const quoteData: CreateQuoteData = {
        client_id: formData.client_id,
        status: formData.status,
        address_street: formData.address_street,
        address_number: formData.address_number,
        address_complement: formData.address_complement,
        address_neighborhood: formData.address_neighborhood,
        address_city: formData.address_city,
        address_state: formData.address_state,
        address_zip_code: formData.address_zip_code,
        latitude: formData.latitude,
        longitude: formData.longitude,
        roof_type: formData.roof_type,
        energy_distributor: formData.energy_distributor,
        phase_type: formData.phase_type,
        average_monthly_kwh: formData.average_monthly_kwh,
        tariff: formData.tariff,
        fio_b: formData.fio_b,
        tariff_group: formData.tariff_group,
        tariff_subgroup: formData.tariff_subgroup,
        simultaneity_factor: formData.simultaneity_factor,
        compensated_energy_tax: formData.compensated_energy_tax,
        availability_cost: formData.availability_cost,
        monthly_bills: formData.monthly_bills,
        recommended_power_kwp: formData.recommended_power_kwp,
        estimated_generation_kwh: formData.estimated_generation_kwh,
        modules_quantity: formData.modules_quantity,
        inverter_power_kw: formData.inverter_power_kw,
        modules: formData.modules,
        inverter: formData.inverter,
        structure: formData.structure,
        cables_connectors: formData.cables_connectors,
        installation: formData.installation,
        homologation: formData.homologation,
        monitoring: formData.monitoring,
        equipment_cost: formData.equipment_cost,
        labor_cost: formData.labor_cost,
        additional_costs: formData.additional_costs,
        additional_cost_items: formData.additional_cost_items,
        discount: formData.discount,
        total: formData.total,
        monthly_savings: formData.monthly_savings,
        payback_months: formData.payback_months,
        roi_25_years: formData.roi_25_years,
        payment_type: formData.payment_type,
        financing_bank: formData.financing_bank,
        financing_installments: formData.financing_installments,
        financing_rate: formData.financing_rate,
        financing_down_payment: formData.financing_down_payment,
        financing_installment_value: formData.financing_installment_value,
      };

      // Use savedQuoteId to track if we already created this quote
      if (savedQuoteId) {
        const updatedQuote = await quoteService.update(savedQuoteId, quoteData);
        return updatedQuote;
      } else {
        const newQuote = await quoteService.create(quoteData);
        setSavedQuoteId(newQuote.id); // Store the ID to prevent duplicates
        return newQuote;
      }
    } catch (error) {
      const errorDetails =
        error && typeof error === 'object'
          ? (error as { details?: string; message?: string }).details ||
            (error as { details?: string; message?: string }).message ||
            ''
          : '';
      const normalizedDetails = errorDetails.toLowerCase();
      let reason = errorDetails || 'Erro desconhecido';

      if (
        normalizedDetails.includes('usuário não autenticado') ||
        normalizedDetails.includes('not authenticated') ||
        normalizedDetails.includes('jwt') ||
        normalizedDetails.includes('auth')
      ) {
        reason = 'Usuário não autenticado. Faça login novamente.';
      } else if (
        normalizedDetails.includes('row level security') ||
        normalizedDetails.includes('rls') ||
        normalizedDetails.includes('permission') ||
        normalizedDetails.includes('denied') ||
        normalizedDetails.includes('not allowed') ||
        normalizedDetails.includes('not permitted')
      ) {
        reason = 'Você não tem permissão para salvar este orçamento.';
      }

      console.error('Error saving quote:', error);
      toast({
        title: 'Erro',
        description: `Não foi possível salvar o orçamento: ${reason}`,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const isFieldMissing = (value: QuoteFormData[keyof QuoteFormData]) => {
    if (typeof value === 'number') {
      return value <= 0;
    }
    if (typeof value === 'string') {
      return value.trim().length === 0;
    }
    return value === null || value === undefined;
  };

  const getMissingFieldsForStep = (stepKey: string) => {
    const stepRequiredFields: Record<string, (keyof QuoteFormData)[]> = {
      location: [
        'client_id',
        'roof_type',
        'energy_distributor',
        'address_city',
        'address_state',
        'address_zip_code',
      ],
      consumption: ['average_monthly_kwh', 'phase_type'],
    };

    const requiredFields = stepRequiredFields[stepKey] ?? [];
    return requiredFields.filter((field) => isFieldMissing(formData[field]));
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1 && !isSaving) {
      const stepKey = STEPS[currentStep].key;
      const missingFields = getMissingFieldsForStep(stepKey);
      if (missingFields.length > 0) {
        toast({
          title: 'Campos obrigatórios',
          description: `Preencha: ${missingFields.join(', ')}.`,
          variant: 'destructive',
        });
        return;
      }

      const saved = await saveQuote();
      if (saved) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const savedQuote = await saveQuote();
      if (savedQuote) {
        await quoteService.updateStatus(savedQuote.id, 'APPROVED');
        
        // Create the project
        const checklist = buildInitialChecklist();
        const project = await projectService.create({
          client_id: savedQuote.client_id,
          quote_id: savedQuote.id,
          power_kwp: savedQuote.recommended_power_kwp,
          status: 'VENDAS',
          start_date: new Date().toISOString().split('T')[0],
          checklist,
        });

        // Build sale items from quote data
        const saleItems: SaleItem[] = [];
        
        if (savedQuote.modules) {
          saleItems.push({
            name: `Módulos Solares - ${savedQuote.modules}`,
            quantity: savedQuote.modules_quantity || 1,
            unit_price: (savedQuote.equipment_cost || 0) / (savedQuote.modules_quantity || 1),
            total: savedQuote.equipment_cost || 0,
          });
        }
        
        if (savedQuote.inverter) {
          saleItems.push({
            name: `Inversor - ${savedQuote.inverter}`,
            quantity: 1,
            unit_price: 0,
            total: 0,
          });
        }
        
        if (savedQuote.structure) {
          saleItems.push({
            name: `Estrutura - ${savedQuote.structure}`,
            quantity: 1,
            unit_price: 0,
            total: 0,
          });
        }
        
        if (savedQuote.installation) {
          saleItems.push({
            name: 'Instalação',
            quantity: 1,
            unit_price: savedQuote.labor_cost || 0,
            total: savedQuote.labor_cost || 0,
          });
        }
        
        if (savedQuote.homologation) {
          saleItems.push({
            name: 'Homologação',
            quantity: 1,
            unit_price: 0,
            total: 0,
          });
        }
        
        if (savedQuote.monitoring) {
          saleItems.push({
            name: 'Monitoramento',
            quantity: 1,
            unit_price: 0,
            total: 0,
          });
        }

        type SaleAdditionalCostItem = {
          name?: string;
          description?: string;
          label?: string;
          quantity?: number;
          amount?: number;
          value?: number;
          total?: number;
        };

        const additionalCostItems = (savedQuote as { additional_cost_items?: SaleAdditionalCostItem[] })
          .additional_cost_items;

        if (Array.isArray(additionalCostItems) && additionalCostItems.length > 0) {
          additionalCostItems.forEach((item, index) => {
            const quantity = item.quantity ?? 1;
            const total = item.total ?? item.amount ?? item.value ?? 0;
            saleItems.push({
              name: item.name ?? item.description ?? item.label ?? `Custo adicional ${index + 1}`,
              quantity,
              unit_price: quantity > 0 ? total / quantity : total,
              total,
            });
          });
        } else if ((savedQuote.additional_costs || 0) > 0) {
          saleItems.push({
            name: 'Custos adicionais',
            quantity: 1,
            unit_price: savedQuote.additional_costs || 0,
            total: savedQuote.additional_costs || 0,
          });
        }

        // If no items were added, create a generic item
        if (saleItems.length === 0) {
          saleItems.push({
            name: `Sistema Solar ${savedQuote.recommended_power_kwp || 0} kWp`,
            quantity: 1,
            unit_price: savedQuote.total || 0,
            total: savedQuote.total || 0,
          });
        }

        const subtotal = saleItems.reduce((sum, item) => sum + (item.total || 0), 0);

        // Create the sale
        await saleService.create({
          quote_id: savedQuote.id,
          client_id: savedQuote.client_id,
          project_id: project.id,
          sale_date: new Date().toISOString().split('T')[0],
          items: saleItems,
          subtotal,
          discount: savedQuote.discount || 0,
          total: savedQuote.total || 0,
          approval_status: 'APROVADO',
          payment_status: 'PENDENTE',
        });

        toast({
          title: 'Orçamento aprovado!',
          description: 'Venda e projeto criados com sucesso.',
        });
        onClose();
        navigate('/sales');
      }
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível aprovar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      const savedQuote = await saveQuote();
      if (savedQuote) {
        await quoteService.updateStatus(savedQuote.id, 'REJECTED');
        toast({
          title: 'Orçamento rejeitado',
          description: 'O orçamento foi marcado como rejeitado.',
        });
        onClose();
      }
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível rejeitar o orçamento.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendQuote = async () => {
    setIsLoading(true);
    try {
      const savedQuote = await saveQuote();
      if (savedQuote) {
        await quoteService.updateStatus(savedQuote.id, 'SENT');
        toast({
          title: 'Orçamento enviado!',
          description: 'O status foi atualizado para enviado.',
        });
      }
    } catch (error) {
      console.error('Error sending quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendForSignature = async (): Promise<string | null> => {
    try {
      const savedQuote = await saveQuote();
      if (savedQuote) {
        const token = await quoteService.generateSignatureToken(savedQuote.id);
        toast({
          title: 'Link de assinatura gerado!',
          description: 'Envie o link via WhatsApp para o cliente assinar.',
        });
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error generating signature link:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o link de assinatura.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].key) {
      case 'location':
        return <StepLocation formData={formData} updateFormData={updateFormData} clients={clients} />;
      case 'consumption':
        return <StepConsumption formData={formData} updateFormData={updateFormData} />;
      case 'dimensioning':
        return <StepDimensioning formData={formData} updateFormData={updateFormData} />;
      case 'kit':
        return <StepKitSelection formData={formData} updateFormData={updateFormData} />;
      case 'services':
        return <StepServices formData={formData} updateFormData={updateFormData} />;
      case 'pricing':
        return <StepPricing formData={formData} updateFormData={updateFormData} />;
      case 'payback':
        return <StepPayback formData={formData} updateFormData={updateFormData} />;
      case 'finalize':
        return (
          <StepFinalize
            formData={formData}
            onApprove={handleApprove}
            onReject={handleReject}
            onSendQuote={handleSendQuote}
            onSendForSignature={handleSendForSignature}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header with current step indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-primary-foreground">
              {quoteId ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h2>
            <span className="px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium">
              {STEPS[currentStep].number}. {STEPS[currentStep].label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-primary-foreground/70 text-sm">
              Etapa {currentStep + 1} de {STEPS.length}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps - Compact with scroll on mobile */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 overflow-x-auto">
          <div className="flex items-center min-w-max">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={cn(
                    'flex items-center gap-1 transition-all',
                    index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                      index < currentStep
                        ? 'bg-success text-success-foreground'
                        : index === currentStep
                        ? 'gradient-gold text-primary shadow-gold'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index < currentStep ? <Check className="h-3 w-3" /> : step.number}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium whitespace-nowrap',
                      index === currentStep ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.shortLabel}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-4 md:w-6 h-0.5 mx-0.5',
                      index < currentStep ? 'bg-success' : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">{renderStepContent()}</div>

        {/* Footer */}
        {currentStep < STEPS.length - 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                currentStep === 0
                  ? 'text-muted-foreground cursor-not-allowed'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <ChevronLeft className="h-5 w-5" />
              Voltar
            </button>
            <button
              onClick={handleNext}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 gradient-gold text-primary font-medium rounded-xl hover:shadow-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Salvando...' : 'Próximo'}
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
