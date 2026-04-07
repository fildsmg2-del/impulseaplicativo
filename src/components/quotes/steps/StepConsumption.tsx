import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Plus, Trash2, Upload, FileText, X, Settings, Edit } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { quoteSettingsService } from '@/services/quoteSettingsService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StepConsumptionProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PHASE_TYPES = [
  { value: 'monofasico_127V', label: 'Monofásico 127V' },
  { value: 'monofasico_220V', label: 'Monofásico 220V' },
  { value: 'bifasico_220_380V', label: 'Bifásico 220/380V' },
  { value: 'trifasico_127_220V', label: 'Trifásico 127/220V' },
  { value: 'trifasico_220_380V', label: 'Trifásico 220/380V' },
];

const SUBGROUPS_B = [
  { value: 'B1', label: 'B1 - Convencional - Residencial' },
  { value: 'B2', label: 'B2 - Rural' },
  { value: 'B3', label: 'B3 - Comercial' },
];

const SUBGROUPS_A = [
  { value: 'A1', label: 'A1 - Alta Tensão (230kV ou mais)' },
  { value: 'A2', label: 'A2 - Alta Tensão (88kV a 138kV)' },
  { value: 'A3', label: 'A3 - Alta Tensão (69kV)' },
  { value: 'A3a', label: 'A3a - Alta Tensão (30kV a 44kV)' },
  { value: 'A4', label: 'A4 - Alta Tensão (2,3kV a 25kV)' },
  { value: 'AS', label: 'AS - Subterrâneo' },
];

export function StepConsumption({ formData, updateFormData }: StepConsumptionProps) {
  const [monthlyBills, setMonthlyBills] = useState<number[]>(
    (formData.monthly_bills as number[]) || Array(12).fill(0)
  );
  const [uploadedBills, setUploadedBills] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Modal states
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempMonthlyBills, setTempMonthlyBills] = useState<number[]>(Array(12).fill(0));
  
  // Tariff group state - initialize from formData
  const [tariffGroup, setTariffGroup] = useState<'A' | 'B'>((formData.tariff_group as 'A' | 'B') || 'B');
  const [subgroup, setSubgroup] = useState(formData.tariff_subgroup || 'B1');
  const [rule, setRule] = useState<'GD_II' | 'GD_III'>('GD_II');
  
  // Additional settings - initialize from formData
  const [simultaneityFactor, setSimultaneityFactor] = useState(formData.simultaneity_factor || 0);
  const [compensatedEnergyTax, setCompensatedEnergyTax] = useState(formData.compensated_energy_tax || 0);
  const [availabilityCost, setAvailabilityCost] = useState(formData.availability_cost || 50);
  const [currentCharges, setCurrentCharges] = useState(0);
  const [newCharges, setNewCharges] = useState(0);
  const [fioB, setFioB] = useState(formData.fio_b || 0.25721);
  const [tariff, setTariff] = useState(formData.tariff || 0.85);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await quoteSettingsService.getSettings();
      const hasTariff = formData.tariff !== undefined && formData.tariff > 0;
      const hasFioB = formData.fio_b !== undefined && formData.fio_b > 0;

      if (!hasTariff) {
        setTariff(settings.defaultTariff);
      }
      if (!hasFioB) {
        setFioB(settings.defaultFioB);
      }
      if (!hasTariff || !hasFioB) {
        updateFormData({
          tariff: hasTariff ? formData.tariff : settings.defaultTariff,
          fio_b: hasFioB ? formData.fio_b : settings.defaultFioB,
        });
      }
    } catch (error) {
      console.error('Error loading quote settings:', error);
    }
  }, [formData.tariff, formData.fio_b, updateFormData]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Sync local state from formData when editing existing quote
  useEffect(() => {
    if (!isInitialized && formData.average_monthly_kwh) {
      if (formData.monthly_bills && Array.isArray(formData.monthly_bills) && (formData.monthly_bills as number[]).some(v => v > 0)) {
        setMonthlyBills(formData.monthly_bills as number[]);
      }
      if (formData.tariff_group) {
        setTariffGroup(formData.tariff_group as 'A' | 'B');
      }
      if (formData.tariff_subgroup) {
        setSubgroup(formData.tariff_subgroup);
      }
      if (formData.simultaneity_factor !== undefined) {
        setSimultaneityFactor(formData.simultaneity_factor);
      }
      if (formData.compensated_energy_tax !== undefined) {
        setCompensatedEnergyTax(formData.compensated_energy_tax);
      }
      if (formData.availability_cost !== undefined) {
        setAvailabilityCost(formData.availability_cost);
      }
      if (formData.fio_b !== undefined && formData.fio_b > 0) {
        setFioB(formData.fio_b);
      }
      if (formData.tariff !== undefined && formData.tariff > 0) {
        setTariff(formData.tariff);
      }
      setIsInitialized(true);
    }
  }, [formData, isInitialized]);

  // Sync consumption data with formData (only after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    
    const validBills = monthlyBills.filter((v) => v > 0);
    const average = validBills.length > 0
      ? validBills.reduce((a, b) => a + b, 0) / validBills.length
      : formData.average_monthly_kwh || 0;
    
    updateFormData({
      monthly_bills: monthlyBills,
      average_monthly_kwh: Math.round(average),
      tariff: tariff,
      fio_b: fioB,
      tariff_group: tariffGroup,
      tariff_subgroup: subgroup,
      simultaneity_factor: simultaneityFactor,
      compensated_energy_tax: compensatedEnergyTax,
      availability_cost: availabilityCost,
    });
  }, [monthlyBills, tariff, fioB, tariffGroup, subgroup, simultaneityFactor, compensatedEnergyTax, availabilityCost, isInitialized, formData.average_monthly_kwh, updateFormData]);

  const handleBillChange = (index: number, value: string) => {
    const newBills = [...tempMonthlyBills];
    newBills[index] = parseFloat(value) || 0;
    setTempMonthlyBills(newBills);
  };

  const openMonthlyModal = () => {
    setTempMonthlyBills([...monthlyBills]);
    setShowMonthlyModal(true);
  };

  const applyMonthlyBills = () => {
    setMonthlyBills([...tempMonthlyBills]);
    setShowMonthlyModal(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUploadedBills: string[] = [...uploadedBills];

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos');
        continue;
      }

      try {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from('client-documents')
          .upload(`bills/${formData.client_id || 'temp'}/${fileName}`, file);

        if (error) throw error;
        
        newUploadedBills.push(data.path);
        toast.success(`${file.name} enviado com sucesso!`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    setUploadedBills(newUploadedBills);
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeBillFile = (index: number) => {
    const newBills = [...uploadedBills];
    newBills.splice(index, 1);
    setUploadedBills(newBills);
  };

  const averageConsumption = formData.average_monthly_kwh || 0;
  const monthlySpend = averageConsumption * tariff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <Zap className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Unidades Consumidoras</h3>
            <p className="text-muted-foreground">Informe os dados de consumo de energia</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 2/8</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button className="flex items-center gap-2 px-4 py-2 rounded-t-lg bg-secondary/10 text-secondary font-medium border border-border border-b-0">
          <Zap className="h-4 w-4" />
          Unidades Consumidoras
        </button>
      </div>

      <div className="flex gap-6">
        {/* Consumer Unit Card */}
        <div className="flex-1 border border-border rounded-2xl p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground">1. Unidade (Geradora)</h4>
            <button className="text-muted-foreground hover:text-foreground p-1">
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Rule Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Regra <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rule" 
                    checked={rule === 'GD_II'}
                    onChange={() => setRule('GD_II')}
                    className="text-secondary" 
                  />
                  <span className="text-sm">GD II</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="rule" 
                    checked={rule === 'GD_III'}
                    onChange={() => setRule('GD_III')}
                    className="text-secondary" 
                  />
                  <span className="text-sm">GD III</span>
                </label>
              </div>
            </div>

            {/* Tariff Group */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Grupo Tarifário <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tariffGroup" 
                    checked={tariffGroup === 'A'}
                    onChange={() => { setTariffGroup('A'); setSubgroup('A4'); }}
                    className="text-secondary" 
                  />
                  <span className="text-sm">A</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="tariffGroup" 
                    checked={tariffGroup === 'B'}
                    onChange={() => { setTariffGroup('B'); setSubgroup('B1'); }}
                    className="text-secondary" 
                  />
                  <span className="text-sm">B</span>
                </label>
              </div>
            </div>

            {/* Subgroup */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Subgrupo <span className="text-destructive">*</span>
              </label>
              <select
                value={subgroup}
                onChange={(e) => setSubgroup(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              >
                {(tariffGroup === 'B' ? SUBGROUPS_B : SUBGROUPS_A).map((group) => (
                  <option key={group.value} value={group.value}>{group.label}</option>
                ))}
              </select>
            </div>

            {/* Consumption */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Consumo <span className="text-destructive">*</span>
                </label>
                <button 
                  onClick={openMonthlyModal}
                  className="text-xs text-secondary hover:underline flex items-center gap-1"
                >
                  mês a mês <Edit className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={averageConsumption || ''}
                  onChange={(e) => updateFormData({ average_monthly_kwh: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                />
                <span className="flex items-center px-3 text-muted-foreground">kWh</span>
              </div>
            </div>

            {/* Phase Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fase e Tensão da Rede <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.phase_type || ''}
                onChange={(e) => updateFormData({ phase_type: e.target.value })}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              >
                <option value="">Selecione...</option>
                {PHASE_TYPES.map((phase) => (
                  <option key={phase.value} value={phase.value}>{phase.label}</option>
                ))}
              </select>
            </div>

            {/* Tariff and FioB Editable */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tarifa (R$/kWh)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={tariff}
                  onChange={(e) => setTariff(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">FioB (R$/kWh)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={fioB}
                  onChange={(e) => setFioB(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-sm"
                />
              </div>
            </div>

            {/* Additional Settings Button */}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-2 text-secondary text-sm hover:underline"
            >
              <Settings className="h-4 w-4" />
              Configurações adicionais
            </button>
          </div>
        </div>

        {/* Add New Unit Card */}
        <div 
          onClick={() => toast.info('Funcionalidade de múltiplas unidades em desenvolvimento')}
          className="w-64 border-2 border-dashed border-border rounded-xl flex items-center justify-center min-h-[300px] hover:border-secondary/50 transition-colors cursor-pointer bg-secondary/5"
        >
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
              <Plus className="h-5 w-5 text-secondary" />
            </div>
            <span className="text-secondary font-medium">+ Nova Unidade</span>
          </div>
        </div>
      </div>

      {/* Upload Bills Section */}
      <div className="border border-border rounded-2xl p-6 bg-card">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-secondary" />
          Upload de Contas de Luz (PDF)
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Faça upload das contas de luz em PDF para extração automática dos dados de consumo
        </p>

        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center hover:border-secondary/50 transition-colors cursor-pointer"
          >
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isUploading ? 'Enviando...' : 'Clique para selecionar arquivos PDF'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {uploadedBills.length > 0 && (
            <div className="space-y-2">
              {uploadedBills.map((bill, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-secondary" />
                    <span className="text-sm truncate max-w-[300px]">{bill.split('/').pop()}</span>
                  </div>
                  <button
                    onClick={() => removeBillFile(index)}
                    className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-6 rounded-2xl bg-primary text-primary-foreground">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-primary-foreground/70">Consumo Médio</p>
            <p className="text-2xl font-bold">
              {averageConsumption.toLocaleString('pt-BR')} kWh
            </p>
          </div>
          <div>
            <p className="text-sm text-primary-foreground/70">Consumo Anual</p>
            <p className="text-2xl font-bold">
              {(averageConsumption * 12).toLocaleString('pt-BR')} kWh
            </p>
          </div>
          <div>
            <p className="text-sm text-primary-foreground/70">Gasto Mensal Estimado</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlySpend)}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Consumption Modal */}
      <Dialog open={showMonthlyModal} onOpenChange={setShowMonthlyModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Consumo Mês a Mês</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {MONTHS.map((month, index) => (
              <div key={month} className="space-y-1">
                <label className="text-sm text-muted-foreground">{month}</label>
                <input
                  type="number"
                  value={tempMonthlyBills[index] || ''}
                  onChange={(e) => handleBillChange(index, e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMonthlyModal(false)}>
              Fechar
            </Button>
            <Button onClick={applyMonthlyBills} className="gradient-gold text-primary">
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Additional Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>1. Unidade (Geradora)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fator de Simultaneidade <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={simultaneityFactor}
                  onChange={(e) => setSimultaneityFactor(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                />
                <span className="flex items-center px-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Imposto Energia Compensada
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={compensatedEnergyTax}
                  onChange={(e) => setCompensatedEnergyTax(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                />
                <span className="flex items-center px-3 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Custo de Disponibilidade <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={availabilityCost}
                  onChange={(e) => setAvailabilityCost(parseFloat(e.target.value) || 0)}
                  placeholder="50"
                  className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                />
                <span className="flex items-center px-3 text-muted-foreground">kWh</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Encargos Atual</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={currentCharges}
                    onChange={(e) => setCurrentCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Encargos Novo</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 text-muted-foreground">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newCharges}
                    onChange={(e) => setNewCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Fechar
            </Button>
            <Button onClick={() => setShowSettingsModal(false)} className="gradient-gold text-primary">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
