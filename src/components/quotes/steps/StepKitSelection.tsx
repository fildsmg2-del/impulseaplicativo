import { useState, useEffect } from 'react';
import { Package, Filter, Grid, List, Plus, Check, Zap, Battery, PlugZap } from 'lucide-react';
import { QuoteFormData } from '@/services/quoteService';
import { kitService, Kit, SystemType, CreateKitData } from '@/services/kitService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { KitForm } from '@/components/inventory/KitForm';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface StepKitSelectionProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  stepState: {
    systemType: SystemType | 'all';
    searchBy: 'consumo' | 'potencia' | 'modulos' | 'area';
    searchValue: number | undefined;
    sortBy: 'menor_preco' | 'maior_potencia';
    viewMode: 'grid' | 'list';
    activeTab: 'kits' | 'manual';
  };
  setStepState: (state: Partial<StepKitSelectionProps['stepState']>) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const SYSTEM_TYPE_LABELS: Record<SystemType, { label: string; icon: React.ReactNode }> = {
  on_grid: { label: 'On Grid', icon: <PlugZap className="h-4 w-4" /> },
  hibrido: { label: 'Híbrido', icon: <Zap className="h-4 w-4" /> },
  off_grid: { label: 'Off Grid', icon: <Battery className="h-4 w-4" /> },
};

export function StepKitSelection({
  formData,
  updateFormData,
  stepState,
  setStepState,
}: StepKitSelectionProps) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    systemType,
    searchBy,
    searchValue,
    sortBy,
    viewMode,
    activeTab
  } = stepState;

  const hasSummaryBar = (formData.equipment_cost || 0) > 0;
  const queryClient = useQueryClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const kitsData = await kitService.getActive();
      setKits(kitsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter kits
  const filteredKits = kits.filter(kit => {
    // System type filter
    if (systemType !== 'all' && kit.system_type !== systemType) {
      return false;
    }

    // Search criteria filter
    if (searchValue) {
      switch (searchBy) {
        case 'consumo':
          if (kit.min_consumption_kwh && searchValue < kit.min_consumption_kwh) return false;
          if (kit.max_consumption_kwh && searchValue > kit.max_consumption_kwh) return false;
          break;
        case 'potencia': {
          const minPower = kit.total_power_kwp * 0.8;
          const maxPower = kit.total_power_kwp * 1.2;
          if (searchValue < minPower || searchValue > maxPower) return false;
          break;
        }
        case 'modulos': {
          const moduleCount = kit.items.filter(i => i.category === 'MODULO').reduce((sum, i) => sum + i.quantity, 0);
          if (Math.abs(searchValue - moduleCount) > 2) return false;
          break;
        }
        case 'area':
          if (kit.min_area_m2 && searchValue < kit.min_area_m2) return false;
          if (kit.max_area_m2 && searchValue > kit.max_area_m2) return false;
          break;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'menor_preco') return a.cost_price - b.cost_price;
    return b.total_power_kwp - a.total_power_kwp;
  });

  const selectKit = (kit: Kit) => {
    const modules = kit.items.filter(i => i.category === 'MODULO');
    const inverters = kit.items.filter(i => i.category === 'INVERSOR');
    const modulesSummary = modules.map(m => `${m.quantity}x ${m.product_name}`).join(', ');
    const inverterSummary = inverters.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
    const modulesQty = modules.reduce((sum, m) => sum + m.quantity, 0);
    const inverterPower = inverters.reduce((sum, i) => sum + ((i.power_w || 0) / 1000), 0);

    updateFormData({
      modules: modulesSummary || kit.name,
      modules_quantity: modulesQty,
      inverter: inverterSummary,
      inverter_power_kw: inverterPower || kit.total_power_kwp,
      recommended_power_kwp: kit.total_power_kwp,
      equipment_cost: kit.cost_price,
    });
  };

  const handleManualKitSubmit = async (data: CreateKitData) => {
    try {
      const newKit = await kitService.create(data);
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      toast.success('Kit criado com sucesso!');
      
      // Select the new kit for the quote
      selectKit(newKit);
      
      // Switch to kits tab and reload
      setActiveTab('kits');
      loadData();
    } catch (error) {
      toast.error('Erro ao criar kit');
      console.error(error);
    }
  };

  const clearFilters = () => {
    setStepState({
      systemType: 'all',
      searchBy: 'consumo',
      searchValue: formData.average_monthly_kwh || 500
    });
  };

  return (
    <div className="relative space-y-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <Package className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Kit Gerador</h3>
            <p className="text-muted-foreground">Selecione um kit do estoque ou crie manualmente</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 4/8</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setStepState({ activeTab: 'kits' })}
          className={cn(
            'px-4 py-2 font-medium transition-colors border-b-2 -mb-px',
            activeTab === 'kits' 
              ? 'text-secondary border-secondary' 
              : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          Kits Cadastrados
        </button>
        <button
          onClick={() => setStepState({ activeTab: 'manual' })}
          className={cn(
            'px-4 py-2 font-medium transition-colors border-b-2 -mb-px flex items-center gap-2',
            activeTab === 'manual' 
              ? 'text-secondary border-secondary' 
              : 'text-muted-foreground border-transparent hover:text-foreground'
          )}
        >
          <Plus className="h-4 w-4" /> Criar manualmente
        </button>
      </div>

      {activeTab === 'manual' ? (
        // Manual Entry Form - Same as inventory kit form
        <div className="border border-border rounded-xl p-6 bg-card">
          <KitForm
            onSubmit={handleManualKitSubmit}
            submitLabel="Criar Kit e Aplicar"
            showCancelButton={false}
          />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 shrink-0 space-y-6">
            <div className="p-4 border border-border rounded-xl bg-card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filtros
                </h4>
                <button 
                  onClick={clearFilters}
                  className="text-xs text-secondary hover:underline"
                >
                  Limpar filtro
                </button>
              </div>

              {/* System Type */}
              <div className="space-y-2 mb-4">
                <h5 className="text-sm font-medium text-foreground">Tipo de Sistema</h5>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="systemType"
                      checked={systemType === 'all'}
                      onChange={() => setStepState({ systemType: 'all' })}
                      className="text-secondary"
                    />
                    Todos
                  </label>
                  {(['on_grid', 'hibrido', 'off_grid'] as SystemType[]).map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="systemType"
                        checked={systemType === type}
                        onChange={() => setStepState({ systemType: type })}
                        className="text-secondary"
                      />
                      <span className="flex items-center gap-1">
                        {SYSTEM_TYPE_LABELS[type].icon}
                        {SYSTEM_TYPE_LABELS[type].label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Search By */}
              <div className="space-y-2 mb-4">
                <h5 className="text-sm font-medium text-foreground">Buscar kits por</h5>
                <div className="space-y-1">
                  {[
                    { value: 'consumo', label: 'Consumo médio mensal' },
                    { value: 'potencia', label: 'Potência do sistema' },
                    { value: 'modulos', label: 'Quantidade de módulos' },
                    { value: 'area', label: 'Área útil' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="searchBy"
                        checked={searchBy === option.value}
                        onChange={() => setStepState({ searchBy: option.value as any })}
                        className="text-secondary"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder={
                    searchBy === 'consumo' ? 'kWh/mês' : 
                    searchBy === 'potencia' ? 'kWp' : 
                    searchBy === 'area' ? 'm²' : 'un'
                  }
                  value={searchValue || ''}
                  onChange={(e) => setStepState({ searchValue: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-2 px-3 py-2 text-sm bg-background border border-border rounded-lg"
                />
              </div>

              {/* Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {filteredKits.length} kit(s) encontrado(s)
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setStepState({ sortBy: e.target.value as any })}
                    className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg"
                  >
                    <option value="menor_preco">Menor Custo</option>
                    <option value="maior_potencia">Maior Potência</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStepState({ viewMode: 'grid' })}
                  className={cn('p-2 rounded-lg', viewMode === 'grid' ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground')}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setStepState({ viewMode: 'list' })}
                  className={cn('p-2 rounded-lg', viewMode === 'list' ? 'bg-secondary/10 text-secondary' : 'text-muted-foreground')}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Kit List */}
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando kits do estoque...</p>
              </div>
            ) : filteredKits.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Nenhum kit encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Cadastre kits no módulo de Estoque ou crie um kit manual
                </p>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
                  : 'space-y-3'
              )}>
                {filteredKits.map((kit) => {
                  const isSelected = formData.equipment_cost === kit.cost_price && 
                    formData.recommended_power_kwp === kit.total_power_kwp;
                  const moduleCount = kit.items.filter(i => i.category === 'MODULO').reduce((sum, i) => sum + i.quantity, 0);
                  const pricePerWp = kit.total_power_kwp > 0 ? kit.cost_price / (kit.total_power_kwp * 1000) : 0;

                  return (
                    <div
                      key={kit.id}
                      className={cn(
                        'border rounded-xl p-4 transition-all cursor-pointer hover:border-secondary/50',
                        isSelected ? 'border-secondary bg-secondary/5' : 'border-border bg-card'
                      )}
                      onClick={() => selectKit(kit)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{kit.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {SYSTEM_TYPE_LABELS[kit.system_type].icon}
                              <span className="ml-1">{SYSTEM_TYPE_LABELS[kit.system_type].label}</span>
                            </Badge>
                          </div>
                          {kit.description && (
                            <p className="text-sm text-muted-foreground">{kit.description}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="p-1 rounded-full bg-secondary text-primary">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground">Potência</p>
                          <p className="font-medium text-foreground">{kit.total_power_kwp.toFixed(2)} kWp</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Módulos</p>
                          <p className="font-medium text-foreground">{moduleCount} un</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">R$/Wp</p>
                          <p className="font-medium text-foreground">R$ {pricePerWp.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Custo</p>
                          <p className="font-bold text-secondary">{formatCurrency(kit.cost_price)}</p>
                        </div>
                      </div>

                      {/* Kit items summary */}
                      <div className="flex flex-wrap gap-1">
                        {kit.items.slice(0, 4).map((item, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {item.quantity}x {item.product_name.slice(0, 20)}
                          </Badge>
                        ))}
                        {kit.items.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{kit.items.length - 4} itens
                          </Badge>
                        )}
                      </div>

                      {/* Area info if available */}
                      {(kit.min_area_m2 || kit.max_area_m2) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Área: {kit.min_area_m2 || 0}m² - {kit.max_area_m2 || '∞'}m²
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Summary bar */}
      {hasSummaryBar && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-muted-foreground">Potência Total</p>
                <p className="font-semibold text-foreground">{(formData.recommended_power_kwp || 0).toFixed(2)} kWp</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Módulos</p>
                <p className="font-semibold text-foreground">{formData.modules_quantity || 0} un</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Geração Mensal Est.</p>
                <p className="font-semibold text-foreground">{((formData.recommended_power_kwp || 0) * 130).toFixed(0)} kWh</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo Equipamentos</p>
              <p className="text-xl font-bold text-secondary">{formatCurrency(formData.equipment_cost || 0)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
