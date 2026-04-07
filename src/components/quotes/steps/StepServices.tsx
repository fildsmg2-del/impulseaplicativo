import { Settings, Wrench, FileCheck, Monitor } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { cn } from '@/lib/utils';

interface StepServicesProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
}

const SERVICES = [
  {
    key: 'installation' as const,
    label: 'Instalação Completa',
    description: 'Inclui toda a mão de obra de instalação do sistema fotovoltaico, incluindo montagem de estruturas, módulos, inversor e cabeamento elétrico.',
    icon: Wrench,
  },
  {
    key: 'homologation' as const,
    label: 'Homologação junto à Concessionária',
    description: 'Elaboração do projeto técnico, protocolo junto à concessionária, acompanhamento do parecer de acesso e vistoria.',
    icon: FileCheck,
  },
  {
    key: 'monitoring' as const,
    label: 'Sistema de Monitoramento',
    description: 'Configuração do app de monitoramento para acompanhamento da geração de energia em tempo real via smartphone ou computador.',
    icon: Monitor,
  },
];

export function StepServices({ formData, updateFormData }: StepServicesProps) {
  const toggleService = (key: 'installation' | 'homologation' | 'monitoring') => {
    updateFormData({ [key]: !formData[key] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <Settings className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Serviços Adicionais</h3>
            <p className="text-muted-foreground">Selecione os serviços inclusos na proposta</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 5/8</span>
      </div>

      {/* Service Cards */}
      <div className="space-y-4">
        {SERVICES.map((service) => {
          const isSelected = formData[service.key];
          return (
            <button
              key={service.key}
              onClick={() => toggleService(service.key)}
              className={cn(
                'w-full p-5 rounded-2xl border text-left transition-all',
                isSelected
                  ? 'border-secondary bg-secondary/5 shadow-gold'
                  : 'border-border bg-card hover:border-secondary/50'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'p-3 rounded-xl transition-colors',
                    isSelected ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <service.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{service.label}</h4>
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                        isSelected
                          ? 'border-secondary bg-secondary'
                          : 'border-border'
                      )}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-5 rounded-2xl bg-muted/50 border border-border">
        <h4 className="font-medium text-foreground mb-3">Serviços Selecionados</h4>
        <div className="space-y-2">
          {SERVICES.filter((s) => formData[s.key]).map((service) => (
            <div key={service.key} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-foreground">{service.label}</span>
            </div>
          ))}
          {!formData.installation && !formData.homologation && !formData.monitoring && (
            <p className="text-sm text-muted-foreground">Nenhum serviço selecionado</p>
          )}
        </div>
      </div>

      {/* Important Notes */}
      <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
        <h5 className="font-medium text-warning mb-2">Observações Importantes</h5>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• A instalação é executada por equipe técnica certificada</li>
          <li>• O prazo médio de homologação é de 30 a 60 dias, conforme a concessionária</li>
          <li>• O sistema de monitoramento requer internet Wi-Fi no local</li>
        </ul>
      </div>
    </div>
  );
}
