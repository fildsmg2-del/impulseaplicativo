import { useEffect, useState } from 'react';
import { Calendar, DollarSign, CreditCard, Trash2, Plus } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { cn } from '@/lib/utils';
import { financingBankService, FinancingBank } from '@/services/financingBankService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StepPaybackProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface FinancingOption {
  id: string;
  bank: string;
  amount: number;
  rate: number;
  downPayment: number;
  gracePeriod: number;
  installments: number;
  installmentValue: number;
}

export function StepPayback({ formData, updateFormData }: StepPaybackProps) {
  const [activeTab, setActiveTab] = useState<'payment' | 'cashflow'>('payment');
  const [selectedBank, setSelectedBank] = useState<string | 'avista'>('avista');
  const [banks, setBanks] = useState<FinancingBank[]>([]);
  const [financingOptions, setFinancingOptions] = useState<FinancingOption[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCashflowModal, setShowCashflowModal] = useState(false);
  const [cashFlowFilter, setCashFlowFilter] = useState<'sem_financiamento' | string>('sem_financiamento');

  // Load banks from database
  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const data = await financingBankService.getAll();
      setBanks(data);
      
      // Initialize financing options with 3 options per bank
      if (data.length > 0 && formData.total) {
        const initialOptions: FinancingOption[] = [];
        const installmentOptions = [36, 48, 60]; // 3 different installment options
        
        data.forEach((bank) => {
          installmentOptions.forEach((installments, idx) => {
            const rate = bank.min_rate;
            const amount = formData.total || 0;
            const monthlyRate = rate / 100;
            const installmentValue = monthlyRate > 0 
              ? (amount * monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1)
              : amount / installments;
            
            initialOptions.push({
              id: `${bank.id}-${idx + 1}`,
              bank: bank.name,
              amount,
              rate,
              downPayment: 0,
              gracePeriod: bank.max_grace_period,
              installments,
              installmentValue,
            });
          });
        });
        setFinancingOptions(initialOptions);
      }
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

  // Recalculate when formData changes
  useEffect(() => {
    if (formData.total && financingOptions.length > 0) {
      setFinancingOptions(opts => opts.map(opt => {
        const amount = formData.total || 0;
        const monthlyRate = opt.rate / 100;
        const principal = amount - opt.downPayment;
        const installmentValue = monthlyRate > 0 && opt.installments > 0
          ? (principal * monthlyRate * Math.pow(1 + monthlyRate, opt.installments)) / (Math.pow(1 + monthlyRate, opt.installments) - 1)
          : principal / (opt.installments || 1);
        return { ...opt, amount, installmentValue };
      }));
    }
  }, [formData.total]);

  // Calculate payback based on real data
  useEffect(() => {
    calculatePayback();
  }, [formData.total, formData.estimated_generation_kwh, formData.tariff, selectedBank, financingOptions]);

  const calculatePayback = () => {
    const total = formData.total || 0;
    const monthlyGeneration = formData.estimated_generation_kwh || 0;
    const tariff = formData.tariff || 0;

    if (total > 0 && monthlyGeneration > 0 && tariff > 0) {
      const monthlySavings = monthlyGeneration * tariff;
      
      let effectiveInvestment = total;
      let financingData: Partial<typeof formData> = {
        payment_type: 'avista',
        financing_bank: undefined,
        financing_installments: undefined,
        financing_rate: undefined,
        financing_down_payment: undefined,
        financing_installment_value: undefined,
      };
      
      if (selectedBank !== 'avista') {
        const selectedFinancing = financingOptions.find(opt => opt.bank === selectedBank);
        if (selectedFinancing) {
          effectiveInvestment = selectedFinancing.downPayment + (selectedFinancing.installmentValue * selectedFinancing.installments);
          financingData = {
            payment_type: 'financiado',
            financing_bank: selectedFinancing.bank,
            financing_installments: selectedFinancing.installments,
            financing_rate: selectedFinancing.rate,
            financing_down_payment: selectedFinancing.downPayment,
            financing_installment_value: selectedFinancing.installmentValue,
          };
        }
      }
      
      const paybackMonths = monthlySavings > 0 ? Math.ceil(effectiveInvestment / monthlySavings) : 0;
      
      const annualGeneration = monthlyGeneration * 12;
      let totalSavings = 0;
      let currentTariff = tariff;
      const tariffIncrease = 0.095;
      const degradation = 0.005;

      for (let year = 0; year < 25; year++) {
        const yearGeneration = annualGeneration * Math.pow(1 - degradation, year);
        totalSavings += yearGeneration * currentTariff;
        currentTariff *= (1 + tariffIncrease);
      }

      const roi25Years = totalSavings - effectiveInvestment;

      updateFormData({
        monthly_savings: monthlySavings,
        payback_months: paybackMonths,
        roi_25_years: roi25Years,
        ...financingData,
      });
    } else {
      updateFormData({
        monthly_savings: 0,
        payback_months: 0,
        roi_25_years: 0,
        payment_type: 'avista',
      });
    }
  };

  const updateFinancingOption = (id: string, field: keyof FinancingOption, value: number) => {
    setFinancingOptions(opts => opts.map(opt => {
      if (opt.id === id) {
        const updated = { ...opt, [field]: value };
        if (field === 'amount' || field === 'downPayment' || field === 'installments' || field === 'rate') {
          const principal = (updated.amount - updated.downPayment);
          const monthlyRate = updated.rate / 100;
          if (monthlyRate > 0 && updated.installments > 0) {
            updated.installmentValue = (principal * monthlyRate * Math.pow(1 + monthlyRate, updated.installments)) / 
              (Math.pow(1 + monthlyRate, updated.installments) - 1);
          } else {
            updated.installmentValue = principal / (updated.installments || 1);
          }
        }
        return updated;
      }
      return opt;
    }));
  };

  const monthlySavings = formData.monthly_savings || 0;
  const paybackMonths = formData.payback_months || 0;
  const paybackYears = Math.floor(paybackMonths / 12);
  const paybackRemainderMonths = paybackMonths % 12;
  const currentSpend = (formData.average_monthly_kwh || 0) * (formData.tariff || 0);
  const savingsPercentage = currentSpend > 0 ? (monthlySavings / currentSpend) * 100 : 0;

  // Generate cash flow projection for 24 years
  const cashFlowData = [];
  let accumulatedCashFlow = -(formData.total || 0);
  let currentTariff = formData.tariff || 0;
  const annualGeneration = (formData.estimated_generation_kwh || 0) * 12;

  for (let year = 0; year <= 24; year++) {
    const yearGeneration = annualGeneration * Math.pow(0.995, year);
    const yearSavings = yearGeneration * currentTariff;
    const investment = year === 0 ? -(formData.total || 0) : 0;
    accumulatedCashFlow += year === 0 ? yearSavings : yearSavings;
    
    cashFlowData.push({
      year,
      generation: Math.round(yearGeneration),
      tariff: currentTariff,
      savings: yearSavings,
      investment,
      accumulated: year === 0 ? yearSavings - (formData.total || 0) : accumulatedCashFlow,
    });

    currentTariff *= 1.095;
  }

  const addFinancingOption = () => {
    const total = formData.total || 0;
    const bank = banks.find(b => b.name === (selectedBank === 'avista' ? banks[0]?.name : selectedBank));
    const rate = bank?.min_rate || 1.7;
    const installments = 60;
    const monthlyRate = rate / 100;
    const installmentValue = monthlyRate > 0 
      ? (total * monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1)
      : total / installments;

    const newOption: FinancingOption = {
      id: Date.now().toString(),
      bank: selectedBank === 'avista' ? (banks[0]?.name || 'Sicoob') : selectedBank,
      amount: total,
      rate,
      downPayment: 0,
      gracePeriod: bank?.max_grace_period || 6,
      installments,
      installmentValue,
    };
    setFinancingOptions([...financingOptions, newOption]);
    if (selectedBank === 'avista') {
      setSelectedBank(banks[0]?.name || 'Sicoob');
    }
  };

  const removeFinancingOption = (id: string) => {
    setFinancingOptions(financingOptions.filter(opt => opt.id !== id));
  };

  const bankOptions = financingOptions.filter(opt => opt.bank === selectedBank);

  // Check if data is missing
  const isMissingData = !formData.total || !formData.estimated_generation_kwh || !formData.tariff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <CreditCard className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Formas de pagamento</h3>
            <p className="text-muted-foreground">Configure opções de financiamento</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 7/8</span>
      </div>

      {/* Warning if missing data */}
      {isMissingData && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
          <p className="text-sm font-medium">Dados incompletos para cálculo:</p>
          <ul className="text-sm mt-1 list-disc list-inside">
            {!formData.total && <li>Preencha o valor total na etapa de Precificação</li>}
            {!formData.estimated_generation_kwh && <li>Complete o Dimensionamento do sistema</li>}
            {!formData.tariff && <li>Informe a tarifa de energia na etapa de Consumo</li>}
          </ul>
        </div>
      )}

      {/* Tabs with Summary */}
      <div className="flex items-center justify-between border-b border-border flex-wrap gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('payment')}
            className={cn(
              'px-4 py-2 font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'payment' 
                ? 'text-foreground border-secondary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            Pagamento
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={cn(
              'px-4 py-2 font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'cashflow' 
                ? 'text-foreground border-secondary' 
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            Fluxo de caixa
          </button>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-secondary" />
            <span className="text-muted-foreground">Economia mensal:</span>
            <span className="font-bold text-foreground">{formatCurrency(monthlySavings)}</span>
            <span className="text-success font-medium">{savingsPercentage.toFixed(1)}%</span>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className="text-secondary hover:underline"
            >
              Ver mais
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary" />
            <span className="text-muted-foreground">Tempo de retorno:</span>
            <span className="font-bold text-foreground">
              {paybackYears > 0 ? `${paybackYears} ano${paybackYears > 1 ? 's' : ''}` : ''}
              {paybackRemainderMonths > 0 ? ` e ${paybackRemainderMonths} meses` : ''}
              {paybackMonths === 0 && 'N/A'}
            </span>
            <button 
              onClick={() => setShowCashflowModal(true)}
              className="text-secondary hover:underline"
            >
              Ver mais
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'payment' ? (
        <div className="flex gap-6">
          {/* Bank Selection Sidebar */}
          <div className="w-48 shrink-0 space-y-2">
            <button
              onClick={() => setSelectedBank('avista')}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                selectedBank === 'avista'
                  ? 'border-secondary bg-secondary/5'
                  : 'border-border hover:border-secondary/50'
              )}
            >
              <span className="font-medium text-foreground">À Vista</span>
              <DollarSign className="h-4 w-4 text-secondary" />
            </button>

            {banks.map((bank) => {
              const count = financingOptions.filter(opt => opt.bank === bank.name).length;
              return (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
                    selectedBank === bank.name
                      ? 'border-secondary bg-secondary/5'
                      : 'border-border hover:border-secondary/50'
                  )}
                >
                  <span className="font-medium text-foreground">{bank.name}</span>
                  {count > 0 && (
                    <span className="w-6 h-6 rounded-full bg-secondary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            
            <button 
              onClick={addFinancingOption}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-secondary hover:bg-secondary/5 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo financiamento
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 space-y-4">
            {selectedBank === 'avista' ? (
              <div className="border border-border rounded-xl p-6 bg-card">
                <h4 className="font-bold text-foreground text-lg mb-4">Pagamento à Vista</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 rounded-xl bg-secondary/10">
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold text-secondary">{formatCurrency(formData.total || 0)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10">
                    <p className="text-sm text-muted-foreground">Economia Mensal</p>
                    <p className="text-3xl font-bold text-success">{formatCurrency(monthlySavings)}</p>
                    <p className="text-sm text-success">{savingsPercentage.toFixed(0)}% da conta</p>
                  </div>
                </div>
              </div>
            ) : bankOptions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma opção de financiamento para {selectedBank}</p>
                <button 
                  onClick={addFinancingOption}
                  className="mt-4 text-secondary hover:underline flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" /> Adicionar opção
                </button>
              </div>
            ) : (
              <>
                {bankOptions.map((option, index) => (
                  <div key={option.id} className="border border-border rounded-xl p-5 bg-card">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-bold text-foreground text-lg">Opção {index + 1}</h4>
                      <button
                        onClick={() => removeFinancingOption(option.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Financiamento</label>
                        <input
                          type="number"
                          value={option.amount}
                          onChange={(e) => updateFinancingOption(option.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Entrada</label>
                        <input
                          type="number"
                          value={option.downPayment}
                          onChange={(e) => updateFinancingOption(option.id, 'downPayment', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Parcelas</label>
                        <input
                          type="number"
                          value={option.installments}
                          onChange={(e) => updateFinancingOption(option.id, 'installments', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Taxa (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={option.rate}
                          onChange={(e) => updateFinancingOption(option.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Carência (meses)</label>
                        <input
                          type="number"
                          value={option.gracePeriod}
                          onChange={(e) => updateFinancingOption(option.id, 'gracePeriod', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Valor Parcela</label>
                        <div className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-bold text-secondary">
                          {formatCurrency(option.installmentValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button 
                  onClick={addFinancingOption}
                  className="flex items-center gap-2 text-secondary hover:underline"
                >
                  <Plus className="h-4 w-4" /> Adicionar opção
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        // Cash Flow Tab
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={cashFlowFilter}
              onChange={(e) => setCashFlowFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="sem_financiamento">Sem Financiamento</option>
              {financingOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.bank} - {opt.installments}x
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ano</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Geração (kWh)</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Tarifa</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Economia</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowData.map((row) => (
                  <tr key={row.year} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-4 font-medium">{row.year}</td>
                    <td className="py-2 px-4 text-right">{row.generation.toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(row.tariff)}</td>
                    <td className="py-2 px-4 text-right text-success">{formatCurrency(row.savings)}</td>
                    <td className={cn(
                      'py-2 px-4 text-right font-medium',
                      row.accumulated >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatCurrency(row.accumulated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes de Gastos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(currentSpend === 0 || monthlySavings === 0) && (
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm">
                <p className="font-medium">Dados incompletos</p>
                <p className="text-xs mt-1">
                  {!formData.average_monthly_kwh && 'Preencha o consumo médio mensal (kWh) na etapa de Consumo. '}
                  {!formData.tariff && 'Preencha a tarifa (R$/kWh) na etapa de Consumo. '}
                  {!formData.estimated_generation_kwh && 'Complete o Dimensionamento do sistema.'}
                </p>
              </div>
            )}
            <div className="flex justify-between items-center p-4 rounded-xl bg-muted">
              <span className="text-muted-foreground">Gasto atual mensal</span>
              <span className="font-bold text-foreground">{formatCurrency(currentSpend)}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-xl bg-success/10">
              <span className="text-muted-foreground">Economia mensal</span>
              <span className="font-bold text-success">{formatCurrency(monthlySavings)}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-xl bg-secondary/10">
              <span className="text-muted-foreground">Novo gasto estimado</span>
              <span className="font-bold text-secondary">{formatCurrency(Math.max(0, currentSpend - monthlySavings))}</span>
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Economia anual</span>
                <span className="font-bold text-success text-lg">{formatCurrency(monthlySavings * 12)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cashflow Details Modal */}
      <Dialog open={showCashflowModal} onOpenChange={setShowCashflowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Fluxo de Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted">
                <p className="text-sm text-muted-foreground">Investimento</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(formData.total || 0)}</p>
              </div>
              <div className="p-4 rounded-xl bg-success/10">
                <p className="text-sm text-muted-foreground">Economia mensal</p>
                <p className="text-xl font-bold text-success">{formatCurrency(monthlySavings)}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/10">
              <p className="text-sm text-muted-foreground">Tempo de retorno (Payback)</p>
              <p className="text-2xl font-bold text-secondary">
                {paybackYears > 0 ? `${paybackYears} ano${paybackYears > 1 ? 's' : ''}` : ''}
                {paybackRemainderMonths > 0 ? ` e ${paybackRemainderMonths} meses` : ''}
                {paybackMonths === 0 && 'N/A'}
              </p>
            </div>
            <div className="p-4 rounded-xl gradient-gold">
              <p className="text-sm text-primary/70">Retorno em 25 anos (ROI)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(formData.roi_25_years || 0)}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
