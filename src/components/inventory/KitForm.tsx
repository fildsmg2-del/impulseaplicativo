import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, HelpCircle, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { CreateKitData, KitItem, SystemType, Kit } from '@/services/kitService';
import { productService, Product } from '@/services/productService';

interface KitItemWithAvulso extends KitItem {
  is_avulso?: boolean;
}

type TopologyType = 'STRING' | 'MICROINVERSOR';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface KitFormProps {
  editingKit?: Kit | null;
  onSubmit: (data: CreateKitData) => void;
  onCancel?: () => void;
  submitLabel?: string;
  showCancelButton?: boolean;
}

export function KitForm({
  editingKit,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  showCancelButton = true,
}: KitFormProps) {
  // Module rows state - manual entry with name, quantity, power, avulso
  const [moduleRows, setModuleRows] = useState<Array<{ 
    id: string; 
    name: string; 
    quantity: number; 
    power_w: number;
    is_avulso: boolean;
  }>>([
    { id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }
  ]);
  
  // Inverter rows state - manual entry with name, quantity, power, avulso
  const [inverterRows, setInverterRows] = useState<Array<{ 
    id: string; 
    name: string; 
    quantity: number; 
    power_w: number;
    is_avulso: boolean;
  }>>([
    { id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }
  ]);

  const [formData, setFormData] = useState<CreateKitData & { 
    distributor_name?: string; 
    kit_code?: string;
    topology?: TopologyType;
    include_structures?: boolean;
    include_transformer?: boolean;
  }>({
    name: '',
    description: '',
    system_type: 'on_grid',
    total_power_kwp: 0,
    min_consumption_kwh: undefined,
    max_consumption_kwh: undefined,
    min_area_m2: undefined,
    max_area_m2: undefined,
    cost_price: 0,
    sale_price: 0,
    items: [],
    active: true,
    distributor_name: '',
    kit_code: '',
    topology: 'STRING',
    include_structures: false,
    include_transformer: false,
  });

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productDialogType, setProductDialogType] = useState<'MODULO' | 'INVERSOR' | 'OUTROS'>('MODULO');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  useEffect(() => {
    if (editingKit) {
      setFormData({
        name: editingKit.name,
        description: editingKit.description || '',
        system_type: editingKit.system_type,
        total_power_kwp: editingKit.total_power_kwp,
        min_consumption_kwh: editingKit.min_consumption_kwh,
        max_consumption_kwh: editingKit.max_consumption_kwh,
        min_area_m2: editingKit.min_area_m2,
        max_area_m2: editingKit.max_area_m2,
        cost_price: editingKit.cost_price,
        sale_price: editingKit.sale_price,
        items: editingKit.items,
        active: editingKit.active,
        distributor_name: editingKit.distributor_name || '',
        kit_code: editingKit.kit_code || '',
        topology: (editingKit.topology as TopologyType) || 'STRING',
        include_structures: editingKit.include_structures || false,
        include_transformer: editingKit.include_transformer || false,
      });

      // Populate module rows from saved items
      const moduleItems = editingKit.items.filter(item => item.category === 'MODULO');
      if (moduleItems.length > 0) {
        setModuleRows(moduleItems.map(item => ({
          id: item.product_id || crypto.randomUUID(),
          name: item.product_name || '',
          quantity: item.quantity,
          power_w: item.power_w || 0,
          is_avulso: false,
        })));
      } else {
        setModuleRows([{ id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
      }

      // Populate inverter rows from saved items
      const inverterItems = editingKit.items.filter(item => item.category === 'INVERSOR');
      if (inverterItems.length > 0) {
        setInverterRows(inverterItems.map(item => ({
          id: item.product_id || crypto.randomUUID(),
          name: item.product_name || '',
          quantity: item.quantity,
          power_w: item.power_w || 0,
          is_avulso: false,
        })));
      } else {
        setInverterRows([{ id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
      }
    } else {
      // Reset for new kit
      setModuleRows([{ id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
      setInverterRows([{ id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
    }
  }, [editingKit]);

  const openProductDialog = (type: 'MODULO' | 'INVERSOR' | 'OUTROS') => {
    setProductDialogType(type);
    setProductDialogOpen(true);
    setSearchQuery('');
  };

  const addProductToKit = (product: Product) => {
    const existingIndex = formData.items.findIndex(i => i.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newItems = [...formData.items];
      newItems[existingIndex].quantity += 1;
      setFormData(prev => ({ ...prev, items: newItems }));
    } else {
      const newItem: KitItem = {
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        quantity: 1,
        unit_price: product.sale_price,
        power_w: product.power_w,
      };
      setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    }

    setProductDialogOpen(false);
  };

  // Update module row
  const updateModuleRow = (rowId: string, field: 'name' | 'quantity' | 'power_w' | 'is_avulso', value: string | number | boolean) => {
    setModuleRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  // Update inverter row
  const updateInverterRow = (rowId: string, field: 'name' | 'quantity' | 'power_w' | 'is_avulso', value: string | number | boolean) => {
    setInverterRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  // Remove module row
  const removeModuleRow = (rowId: string) => {
    setModuleRows(prev => prev.filter(row => row.id !== rowId));
  };

  // Remove inverter row
  const removeInverterRow = (rowId: string) => {
    setInverterRows(prev => prev.filter(row => row.id !== rowId));
  };

  // Add new module row
  const addModuleRow = () => {
    setModuleRows(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
  };

  // Add new inverter row
  const addInverterRow = () => {
    setInverterRows(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 0, power_w: 0, is_avulso: false }]);
  };

  const removeItemFromKit = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.product_id !== productId),
    }));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity < 0) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(i => 
        i.product_id === productId ? { ...i, quantity } : i
      ),
    }));
  };

  // Calculate power based on module rows
  const kitTotalPower = moduleRows.reduce((sum, row) => {
    if (row.power_w) {
      return sum + ((row.power_w * row.quantity) / 1000);
    }
    return sum;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build items from module and inverter rows (manual entry)
    const items: KitItem[] = [];
    
    moduleRows.forEach(row => {
      if (row.name) {
        items.push({
          product_id: row.id,
          product_name: row.name,
          category: 'MODULO',
          quantity: row.quantity,
          unit_price: 0,
          power_w: row.power_w,
        });
      }
    });
    
    inverterRows.forEach(row => {
      if (row.name) {
        items.push({
          product_id: row.id,
          product_name: row.name,
          category: 'INVERSOR',
          quantity: row.quantity,
          unit_price: 0,
          power_w: row.power_w,
        });
      }
    });
    
    // Add other items from dialog
    items.push(...formData.items.filter(i => i.category !== 'MODULO' && i.category !== 'INVERSOR'));

    const totalPower = moduleRows.reduce((sum, row) => sum + ((row.power_w || 0) * row.quantity / 1000), 0);

    const dataToSave: CreateKitData = {
      name: formData.name,
      description: formData.description,
      system_type: formData.system_type,
      total_power_kwp: totalPower || formData.total_power_kwp,
      min_consumption_kwh: formData.min_consumption_kwh,
      max_consumption_kwh: formData.max_consumption_kwh,
      min_area_m2: formData.min_area_m2,
      max_area_m2: formData.max_area_m2,
      cost_price: formData.cost_price,
      sale_price: formData.sale_price,
      items: items,
      active: formData.active,
      distributor_name: formData.distributor_name,
      kit_code: formData.kit_code,
      topology: formData.topology,
      include_structures: formData.include_structures,
      include_transformer: formData.include_transformer,
    };

    onSubmit(dataToSave);
  };

  const filteredProducts = products.filter(p => {
    if (!p.active) return false;
    if (productDialogType === 'MODULO' && p.category !== 'MODULO') return false;
    if (productDialogType === 'INVERSOR' && p.category !== 'INVERSOR') return false;
    if (productDialogType === 'OUTROS' && (p.category === 'MODULO' || p.category === 'INVERSOR')) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const otherItems = formData.items.filter(i => i.category !== 'MODULO' && i.category !== 'INVERSOR');

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">
          {/* Basic Info Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do distribuidor *</Label>
              <Input
                value={formData.distributor_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, distributor_name: e.target.value }))}
                placeholder=""
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                Custo *
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Custo do kit para uso em orçamentos</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="text"
                value={formatCurrency(formData.cost_price)}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const numValue = Number(value) / 100;
                  setFormData(prev => ({ ...prev, cost_price: numValue }));
                }}
                placeholder="R$ 0,00"
              />
            </div>
          </div>

          {/* Basic Info Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Kit *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder=""
                required
              />
            </div>
            <div>
              <Label>Código do Kit *</Label>
              <Input
                value={formData.kit_code || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, kit_code: e.target.value }))}
                placeholder=""
              />
            </div>
          </div>

          {/* System Type */}
          <div className="flex items-center gap-4">
            <Label className="flex items-center gap-1">
              Sistema
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tipo de sistema fotovoltaico</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <RadioGroup
              value={formData.system_type}
              onValueChange={(value: SystemType) => setFormData(prev => ({ ...prev, system_type: value }))}
              className="flex items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on_grid" id="on_grid" />
                <Label htmlFor="on_grid" className="font-normal cursor-pointer">On grid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hibrido" id="hibrido" />
                <Label htmlFor="hibrido" className="font-normal cursor-pointer">Híbrido</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="off_grid" id="off_grid" />
                <Label htmlFor="off_grid" className="font-normal cursor-pointer">Off grid</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Topology and Embedded Costs Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Topologia *</Label>
              <Select
                value={formData.topology}
                onValueChange={(value: TopologyType) => setFormData(prev => ({ ...prev, topology: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRING">String</SelectItem>
                  <SelectItem value="MICROINVERSOR">Microinversor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custos embutidos</Label>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_structures"
                    checked={formData.include_structures}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, include_structures: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include_structures" className="font-normal cursor-pointer">
                    Estruturas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_transformer"
                    checked={formData.include_transformer}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, include_transformer: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include_transformer" className="font-normal cursor-pointer">
                    Transformador
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <Label className="block">Itens</Label>
            
            {/* Module Rows */}
            {moduleRows.map((row, index) => (
              <div key={row.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Módulo *</Label>
                  {index === moduleRows.length - 1 && (
                    <button
                      type="button"
                      className="text-primary text-sm font-medium"
                      onClick={addModuleRow}
                    >
                      + Adicionar mais
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs text-muted-foreground">Nome / Modelo</Label>
                    <Input
                      value={row.name}
                      onChange={(e) => updateModuleRow(row.id, 'name', e.target.value)}
                      placeholder="Ex: Canadian 550W"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateModuleRow(row.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Potência (W)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.power_w}
                      onChange={(e) => updateModuleRow(row.id, 'power_w', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Switch
                      checked={row.is_avulso}
                      onCheckedChange={(checked) => updateModuleRow(row.id, 'is_avulso', checked)}
                    />
                    <span className="text-xs text-muted-foreground">Avulso?</span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeModuleRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Inverter Rows */}
            {inverterRows.map((row, index) => (
              <div key={row.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Inversor *</Label>
                  {index === inverterRows.length - 1 && (
                    <button
                      type="button"
                      className="text-primary text-sm font-medium"
                      onClick={addInverterRow}
                    >
                      + Adicionar mais
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs text-muted-foreground">Nome / Modelo</Label>
                    <Input
                      value={row.name}
                      onChange={(e) => updateInverterRow(row.id, 'name', e.target.value)}
                      placeholder="Ex: Growatt 5kW"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateInverterRow(row.id, 'quantity', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Potência (W)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={row.power_w}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateInverterRow(
                          row.id,
                          'power_w',
                          value === '' ? 0 : parseFloat(value)
                        );
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <Switch
                      checked={row.is_avulso}
                      onCheckedChange={(checked) => updateInverterRow(row.id, 'is_avulso', checked)}
                    />
                    <span className="text-xs text-muted-foreground">Avulso?</span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeInverterRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Other Components */}
            {otherItems.length > 0 && (
              <div className="space-y-2 mb-3">
                {otherItems.map((item) => (
                  <div 
                    key={item.product_id} 
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      <span className="text-sm">{item.product_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.product_id, Number(e.target.value))}
                        className="w-16 h-7 text-sm"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeItemFromKit(item.product_id)}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Extra buttons */}
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => openProductDialog('OUTROS')}
              >
                Otimizador
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => openProductDialog('OUTROS')}
              >
                Componente
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          {showCancelButton && onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Voltar
            </Button>
          ) : (
            <div />
          )}
          
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Potência: {kitTotalPower.toFixed(2).replace('.', ',')} kWp
          </Badge>
          
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            {submitLabel}
          </Button>
        </div>

        {/* Product Selection Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {productDialogType === 'MODULO' && 'Selecionar Módulo'}
                {productDialogType === 'INVERSOR' && 'Selecionar Inversor'}
                {productDialogType === 'OUTROS' && 'Selecionar Componente'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Input
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => addProductToKit(product)}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {product.brand && <span>{product.brand}</span>}
                          {product.power_w && <span>{product.power_w}W</span>}
                          <span>{formatCurrency(product.sale_price)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </form>
    </TooltipProvider>
  );
}
