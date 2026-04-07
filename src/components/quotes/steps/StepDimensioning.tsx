import { useEffect, useCallback } from 'react';
import { Sun, Calculator } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';

interface StepDimensioningProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
}

// Average solar irradiation by region (kWh/m²/day)
const IRRADIATION_BY_REGION: Record<string, number> = {
  'AC': 4.5, 'AL': 5.5, 'AP': 5.0, 'AM': 4.8, 'BA': 5.8,
  'CE': 5.9, 'DF': 5.5, 'ES': 5.2, 'GO': 5.5, 'MA': 5.6,
  'MT': 5.3, 'MS': 5.4, 'MG': 5.4, 'PA': 5.0, 'PB': 5.8,
  'PR': 4.8, 'PE': 5.7, 'PI': 5.9, 'RJ': 5.0, 'RN': 5.9,
  'RS': 4.6, 'RO': 4.8, 'RR': 5.2, 'SC': 4.5, 'SP': 4.9,
  'SE': 5.5, 'TO': 5.5,
};

// Module power options
const MODULE_POWERS = [545, 550, 555, 560, 585, 590, 600, 650, 670];

export function StepDimensioning({ formData, updateFormData }: StepDimensioningProps) {
  const state = formData.address_state || 'MG';
  const irradiation = IRRADIATION_BY_REGION[state] || 5.0;
  const monthlyConsumption = formData.average_monthly_kwh || 0;
  const modulePower = 585; // Default module power in Watts

  const calculateDimensioning = useCallback(() => {
    // System sizing calculation
    // Daily consumption = Monthly consumption / 30
    // Required power (kWp) = Daily consumption / (Irradiation * Performance ratio)
    const performanceRatio = 0.80; // 80% system efficiency
    const dailyConsumption = monthlyConsumption / 30;
    const recommendedPowerKw = dailyConsumption / (irradiation * performanceRatio);
    const recommendedPowerKwp = Math.ceil(recommendedPowerKw * 100) / 100;

    // Calculate number of modules
    const modulesQuantity = Math.ceil((recommendedPowerKwp * 1000) / modulePower);
    
    // Recalculate actual power based on modules
    const actualPowerKwp = (modulesQuantity * modulePower) / 1000;

    // Calculate estimated generation
    const monthlyGeneration = actualPowerKwp * irradiation * 30 * performanceRatio;

    // Calculate inverter power (typically 80-100% of panel power)
    const inverterPowerKw = Math.ceil(actualPowerKwp * 0.9 * 10) / 10;

    updateFormData({
      recommended_power_kwp: actualPowerKwp,
      modules_quantity: modulesQuantity,
      inverter_power_kw: inverterPowerKw,
      estimated_generation_kwh: Math.round(monthlyGeneration),
    });
  }, [monthlyConsumption, irradiation, modulePower, updateFormData]);

  useEffect(() => {
    if (monthlyConsumption > 0) {
      calculateDimensioning();
    }
  }, [monthlyConsumption, calculateDimensioning]);

  const recommendedPower = formData.recommended_power_kwp || 0;
  const modulesQty = formData.modules_quantity || 0;
  const inverterPower = formData.inverter_power_kw || 0;
  const estimatedGeneration = formData.estimated_generation_kwh || 0;
  const minArea = modulesQty * 2.5; // ~2.5m² per module

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <Calculator className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Dimensionamento Sugerido</h3>
            <p className="text-muted-foreground">Cálculo automático baseado no consumo e localização</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 3/8</span>
      </div>

      {/* Irradiation Info */}
      <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
        <div className="flex items-center gap-3">
          <Sun className="h-5 w-5 text-secondary" />
          <div>
            <p className="font-medium text-foreground">Irradiação Solar em {state}</p>
            <p className="text-sm text-muted-foreground">
              Média de {irradiation.toFixed(1)} kWh/m²/dia
            </p>
          </div>
        </div>
      </div>

      {/* Main Results - Only Power and Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border shadow-impulse">
          <p className="text-sm text-muted-foreground mb-2">Potência Recomendada</p>
          <p className="text-3xl font-bold text-foreground">
            {recommendedPower.toFixed(2)} <span className="text-lg font-normal">kWp</span>
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border shadow-impulse">
          <p className="text-sm text-muted-foreground mb-2">Área Mínima Necessária</p>
          <p className="text-3xl font-bold text-foreground">
            {minArea.toFixed(0)} <span className="text-lg font-normal">m²</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        O kit ideal será selecionado na próxima etapa com base nestes parâmetros.
      </p>
    </div>
  );
}
