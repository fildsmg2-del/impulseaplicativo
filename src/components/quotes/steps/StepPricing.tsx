import { useEffect, useState } from 'react';
import { DollarSign, Calculator, TrendingUp, Lock, Plus, Trash2 } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { Slider } from '@/components/ui/slider';
import { quoteSettingsService } from '@/services/quoteSettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StepPricingProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const createAdditionalItem = (
  overrides?: Partial<NonNullable<QuoteFormData['additional_cost_items']>[number]>
) => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `additional-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  value: 0,
  ...overrides,
});

export function StepPricing({ formData, updateFormData }: StepPricingProps) {
  const { hasRole } = useAuth();
  const isMaster = hasRole(['MASTER', 'DEV']);
  const isFreeMarginProfile = hasRole(['MASTER', 'ENGENHEIRO', 'DEV']);
  const isSellerProfile = hasRole(['VENDEDOR']) && !isFreeMarginProfile;
  const minMargin = isSellerProfile ? 30 : 0;
  const maxMargin = isSellerProfile ? 35 : 100;
  const [profitMargin, setProfitMargin] = useState(() => (isSellerProfile ? 35 : 30));
  const [laborCostPerPanel, setLaborCostPerPanel] = useState(150);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const modulesQuantity = formData.modules_quantity || 0;
  const equipment = formData.equipment_cost || 0;
  const calculatedLabor = modulesQuantity * laborCostPerPanel;
  const labor = formData.labor_cost || 0;
  const additionalItems = formData.additional_cost_items || [];
  const additional = additionalItems.reduce((sum, item) => sum + (item.value || 0), 0);

  // Load labor cost per panel setting
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await quoteSettingsService.getSettings();
        setLaborCostPerPanel(settings.laborCostPerPanel);
      } catch (error) {
        console.error('Error loading quote settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Auto-calculate labor cost when modules quantity changes
  useEffect(() => {
    if (!loadingSettings && modulesQuantity > 0) {
      const newLaborCost = modulesQuantity * laborCostPerPanel;
      if (formData.labor_cost !== newLaborCost) {
        updateFormData({ labor_cost: newLaborCost });
      }
    }
  }, [modulesQuantity, laborCostPerPanel, loadingSettings]);
  
  // Calculate costs
  const totalCost = equipment + labor + additional;
  const profitAmount = totalCost * (profitMargin / 100);
  const salePrice = totalCost + profitAmount;
  const finalProfit = profitAmount;
  const finalProfitMargin = totalCost > 0 ? (finalProfit / salePrice) * 100 : 0;

  useEffect(() => {
    if (!formData.additional_cost_items || formData.additional_cost_items.length === 0) {
      updateFormData({
        additional_cost_items: [
          createAdditionalItem({ value: formData.additional_costs || 0 }),
        ],
        additional_costs: formData.additional_costs || 0,
      });
    }
  }, [formData.additional_cost_items, formData.additional_costs, updateFormData]);
  
  useEffect(() => {
    if (!formData.additional_cost_items || formData.additional_cost_items.length === 0) {
      return;
    }

    const hasMissingId = formData.additional_cost_items.some((item) => !item.id);
    if (!hasMissingId) {
      return;
    }

    const updatedItems = formData.additional_cost_items.map((item) =>
      item.id ? item : createAdditionalItem(item)
    );
    updateFormData({ additional_cost_items: updatedItems });
  }, [formData.additional_cost_items, updateFormData]);

  useEffect(() => {
    updateFormData({ total: Math.max(0, salePrice) });
  }, [salePrice, updateFormData]);

  useEffect(() => {
    const clampedMargin = Math.min(maxMargin, Math.max(minMargin, profitMargin));
    if (clampedMargin !== profitMargin) {
      setProfitMargin(clampedMargin);
    }
  }, [minMargin, maxMargin, profitMargin]);

  const handleMarginChange = (value: number[]) => {
    setProfitMargin(value[0]);
  };

  const handleAdditionalItemChange = (
    index: number,
    field: 'description' | 'value',
    value: string | number
  ) => {
    const updatedItems = additionalItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    );
    const newAdditionalTotal = updatedItems.reduce((sum, item) => sum + (item.value || 0), 0);
    updateFormData({ additional_cost_items: updatedItems, additional_costs: newAdditionalTotal });
  };

  const handleAddAdditionalItem = () => {
    const updatedItems = [...additionalItems, createAdditionalItem()];
    updateFormData({ additional_cost_items: updatedItems, additional_costs: additional });
  };

  const handleRemoveAdditionalItem = (index: number) => {
    if (additionalItems.length === 1) return;
    const updatedItems = additionalItems.filter((_, itemIndex) => itemIndex !== index);
    const newAdditionalTotal = updatedItems.reduce((sum, item) => sum + (item.value || 0), 0);
    updateFormData({ additional_cost_items: updatedItems, additional_costs: newAdditionalTotal });
  };

  const pricePerKwp = formData.recommended_power_kwp ? salePrice / formData.recommended_power_kwp : 0;
  const pricePerWp = formData.recommended_power_kwp ? salePrice / (formData.recommended_power_kwp * 1000) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <DollarSign className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Precificação</h3>
            <p className="text-muted-foreground">Defina os valores para compor o orçamento</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 6/8</span>
      </div>

      {/* Cost Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custo dos Equipamentos</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                step="0.01"
                value={formData.equipment_cost || ''}
                onChange={(e) => updateFormData({ equipment_cost: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Mão de Obra</label>
              {!isMaster && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Calculado automaticamente: {modulesQuantity} módulos × {formatCurrency(laborCostPerPanel)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <input
                type="number"
                step="0.01"
                value={formData.labor_cost || ''}
                onChange={(e) => updateFormData({ labor_cost: parseFloat(e.target.value) || 0 })}
                placeholder="0,00"
                disabled={!isMaster}
                className={`w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all ${
                  !isMaster ? 'bg-muted cursor-not-allowed opacity-75' : ''
                }`}
              />
            </div>
            {modulesQuantity > 0 && (
              <p className="text-xs text-muted-foreground">
                {modulesQuantity} módulos × {formatCurrency(laborCostPerPanel)} = {formatCurrency(calculatedLabor)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Custos Adicionais</label>
            <div className="space-y-3">
              {additionalItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleAdditionalItemChange(index, 'description', e.target.value)}
                    placeholder="Descrição"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={item.value || ''}
                      onChange={(e) => handleAdditionalItemChange(index, 'value', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAdditionalItem(index)}
                    disabled={additionalItems.length === 1}
                    className="inline-flex items-center justify-center rounded-xl border border-border p-3 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Remover item adicional"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddAdditionalItem}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-secondary hover:text-secondary"
              >
                <Plus className="h-4 w-4" />
                Adicionar linha
              </button>
            </div>
          </div>

        </div>

        {/* Margin and Summary */}
        <div className="space-y-4">
          {/* Profit Margin Slider */}
          <div className="p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-secondary" />
                Margem de Lucro
              </h4>
              <span className="text-2xl font-bold text-secondary">{profitMargin.toFixed(0)}%</span>
            </div>
            
            <Slider
              value={[profitMargin]}
              onValueChange={handleMarginChange}
              min={minMargin}
              max={maxMargin}
              step={1}
              className="mb-4"
            />
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Bruto</p>
                <p className="text-lg font-bold text-success">{formatCurrency(profitAmount)}</p>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Resumo da Precificação
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipamentos</span>
                <span className="text-foreground">{formatCurrency(equipment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mão de Obra</span>
                <span className="text-foreground">{formatCurrency(labor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custos Adicionais</span>
                <span className="text-foreground">{formatCurrency(additional)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-muted-foreground">Custo Total</span>
                <span className="text-foreground font-medium">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Margem ({profitMargin}%)</span>
                <span>+ {formatCurrency(profitAmount)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl gradient-gold">
            <div className="text-center">
              <p className="text-sm text-primary/70">Preço de Venda</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(salePrice)}</p>
              <p className="text-sm text-primary/70 mt-1">
                Lucro líquido: {formatCurrency(finalProfit)} ({finalProfitMargin.toFixed(1)}%)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <p className="text-xs text-muted-foreground">Preço por Wp</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(pricePerWp)}</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border text-center">
              <p className="text-xs text-muted-foreground">Preço por kWp</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(pricePerKwp)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
