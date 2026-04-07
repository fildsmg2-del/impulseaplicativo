import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sun, Zap, DollarSign, TrendingUp, Calculator as CalcIcon, MapPin } from 'lucide-react';

interface CalculationResult {
  recommendedPowerKwp: number;
  modulesQuantity: number;
  annualGenerationKwh: number;
  monthlyGenerationKwh: number;
  monthlySavings: number;
  annualSavings: number;
  estimatedCost: number;
  paybackMonths: number;
  roi25Years: number;
}

// Irradiação média por região do Brasil (kWh/m²/dia)
const IRRADIATION_BY_REGION: Record<string, number> = {
  'Norte': 4.5,
  'Nordeste': 5.5,
  'Centro-Oeste': 5.2,
  'Sudeste': 4.8,
  'Sul': 4.3,
};

// Custo médio por kWp instalado
const COST_PER_KWP = 4500;

// Potência média de um módulo solar (Wp)
const MODULE_POWER_W = 550;

// Performance ratio típico
const PERFORMANCE_RATIO = 0.8;

export default function SolarCalculator() {
  const [monthlyConsumption, setMonthlyConsumption] = useState(500);
  const [tariff, setTariff] = useState(0.85);
  const [region, setRegion] = useState('Sudeste');
  const [roofType, setRoofType] = useState('CERAMICA');
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculateSystem = () => {
    const irradiation = IRRADIATION_BY_REGION[region];
    
    // Cálculo da potência necessária
    // Fórmula: Potência (kWp) = Consumo mensal (kWh) / (Irradiação * 30 dias * Performance Ratio)
    const recommendedPowerKwp = monthlyConsumption / (irradiation * 30 * PERFORMANCE_RATIO);
    
    // Quantidade de módulos
    const modulesQuantity = Math.ceil((recommendedPowerKwp * 1000) / MODULE_POWER_W);
    
    // Potência real com base nos módulos
    const realPowerKwp = (modulesQuantity * MODULE_POWER_W) / 1000;
    
    // Geração anual estimada
    const annualGenerationKwh = realPowerKwp * irradiation * 365 * PERFORMANCE_RATIO;
    const monthlyGenerationKwh = annualGenerationKwh / 12;
    
    // Economia
    const monthlySavings = monthlyGenerationKwh * tariff;
    const annualSavings = monthlySavings * 12;
    
    // Custo estimado do sistema
    const estimatedCost = realPowerKwp * COST_PER_KWP;
    
    // Payback
    const paybackMonths = Math.ceil(estimatedCost / monthlySavings);
    
    // ROI em 25 anos
    const roi25Years = (annualSavings * 25) - estimatedCost;
    
    setResult({
      recommendedPowerKwp: realPowerKwp,
      modulesQuantity,
      annualGenerationKwh,
      monthlyGenerationKwh,
      monthlySavings,
      annualSavings,
      estimatedCost,
      paybackMonths,
      roi25Years,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: decimals }).format(value);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sun className="h-8 w-8 text-impulse-gold" />
            Calculadora Solar
          </h1>
          <p className="text-muted-foreground">Dimensione o sistema ideal para cada cliente</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Form */}
          <Card className="shadow-impulse">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalcIcon className="h-5 w-5 text-impulse-gold" />
                Dados de Entrada
              </CardTitle>
              <CardDescription>Informe os dados do cliente para dimensionar o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Consumo Mensal Médio</span>
                  <span className="text-impulse-gold font-bold">{monthlyConsumption} kWh</span>
                </Label>
                <Slider
                  value={[monthlyConsumption]}
                  onValueChange={([value]) => setMonthlyConsumption(value)}
                  min={100}
                  max={5000}
                  step={50}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>100 kWh</span>
                  <span>5.000 kWh</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tarifa de Energia (R$/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={tariff}
                  onChange={(e) => setTariff(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-impulse-gold" />
                  Região
                </Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(IRRADIATION_BY_REGION).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r} (Irradiação: {IRRADIATION_BY_REGION[r]} kWh/m²/dia)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Telhado</Label>
                <Select value={roofType} onValueChange={setRoofType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CERAMICA">Cerâmico</SelectItem>
                    <SelectItem value="FIBROCIMENTO">Fibrocimento</SelectItem>
                    <SelectItem value="METALICA">Metálico</SelectItem>
                    <SelectItem value="LAJE">Laje</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={calculateSystem} 
                className="w-full bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark font-semibold"
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Calcular Sistema
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result ? (
            <div className="space-y-4">
              {/* System Size */}
              <Card className="gradient-impulse text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-impulse-gold">Sistema Recomendado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-300">Potência</p>
                      <p className="text-3xl font-bold">{formatNumber(result.recommendedPowerKwp)} kWp</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Módulos ({MODULE_POWER_W}W)</p>
                      <p className="text-3xl font-bold">{result.modulesQuantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-impulse-gold" />
                    Geração Estimada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Mensal</p>
                      <p className="text-2xl font-bold text-impulse-dark">{formatNumber(result.monthlyGenerationKwh, 0)} kWh</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Anual</p>
                      <p className="text-2xl font-bold text-impulse-dark">{formatNumber(result.annualGenerationKwh, 0)} kWh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Savings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-success" />
                    Economia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Mensal</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(result.monthlySavings)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Anual</p>
                      <p className="text-2xl font-bold text-success">{formatCurrency(result.annualSavings)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Investment */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-impulse-gold" />
                    Investimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Custo Estimado</span>
                      <span className="text-xl font-bold">{formatCurrency(result.estimatedCost)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Payback</span>
                      <span className="text-xl font-bold text-impulse-gold">
                        {Math.floor(result.paybackMonths / 12)} anos e {result.paybackMonths % 12} meses
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Retorno em 25 anos</span>
                      <span className="text-xl font-bold text-success">{formatCurrency(result.roi25Years)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Sun className="h-16 w-16 mx-auto text-impulse-gold/30 mb-4" />
                <p className="text-muted-foreground">
                  Preencha os dados e clique em "Calcular Sistema" para ver os resultados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
