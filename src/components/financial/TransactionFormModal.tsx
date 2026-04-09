import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, HelpCircle, Info, Calculator, Check, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { supplierService } from '@/services/supplierService';
import { accountService } from '@/services/accountService';
import { costCenterService } from '@/services/costCenterService';
import { projectService } from '@/services/projectService';
import { serviceOrderService } from '@/services/serviceOrderService';
import { storageService } from '@/services/storageService';
import { FINANCIAL_CATEGORIES, PAYMENT_METHODS } from '@/constants/financialConstants';
import { CreateTransactionData, Transaction, TransactionSplit } from '@/services/transactionService';
import { toast } from 'sonner';

interface TransactionFormModalProps {
  type: 'RECEITA' | 'DESPESA';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTransactionData, installments: number) => void;
  transaction?: Transaction | null;
  isLoading?: boolean;
}

export function TransactionFormModal({ type, open, onOpenChange, onSubmit, transaction, isLoading }: TransactionFormModalProps) {
  const [formData, setFormData] = useState<CreateTransactionData & { installments: number }>({
    type,
    description: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    competence_date: new Date().toISOString().split('T')[0],
    category: '',
    cost_center: '',
    payment_method: 'Pix',
    reference_code: '',
    account_id: undefined,
    project_id: undefined,
    service_order_id: undefined,
    notes: '',
    status: 'PENDENTE',
    installments: 1,
    splits: [],
    client_name_manual: '',
    supplier_name_manual: '',
    attachment_url: ''
  });

  const [useSplit, setUseSplit] = useState(false);
  const [isManualName, setIsManualName] = useState(false);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegData, setQuickRegData] = useState({ name: '', document: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [useNSU, setUseNSU] = useState(false);

  // Queries
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: clientService.getAll, enabled: type === 'RECEITA' });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: supplierService.getAll, enabled: type === 'DESPESA' });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts-active'], queryFn: accountService.getActive });
  const { data: costCenters = [] } = useQuery({ queryKey: ['cost-centers'], queryFn: costCenterService.getAll });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectService.getAll });
  const { data: serviceOrders = [] } = useQuery({ queryKey: ['service-orders'], queryFn: serviceOrderService.getAll });

  useEffect(() => {
    if (transaction) {
      setFormData({
        ...transaction,
        installments: 1,
        splits: [],
        client_name_manual: transaction.client_name_manual || '',
        supplier_name_manual: transaction.supplier_name_manual || '',
        attachment_url: transaction.attachment_url || ''
      } as any);
      if (transaction.client_name_manual || transaction.supplier_name_manual) {
          setIsManualName(true);
      }
    } else {
        setFormData(prev => ({ ...prev, type }));
    }
  }, [transaction, type]);

  const handleQuickRegister = async () => {
      try {
          if (!quickRegData.name) {
              toast.error('Nome é obrigatório');
              return;
          }
          if (type === 'RECEITA') {
              const res = await clientService.create({
                  name: quickRegData.name,
                  document: quickRegData.document,
                  document_type: quickRegData.document.length > 11 ? 'CNPJ' : 'CPF',
                  email: '',
                  phone: ''
              });
              setFormData(prev => ({ ...prev, client_id: res.id }));
              toast.success('Cliente cadastrado!');
          } else {
              const res = await supplierService.create({
                  name: quickRegData.name,
                  document: quickRegData.document,
                  document_type: quickRegData.document.length > 11 ? 'CNPJ' : 'CPF'
              });
              setFormData(prev => ({ ...prev, supplier_id: res.id }));
              toast.success('Fornecedor cadastrado!');
          }
          setShowQuickRegister(false);
          setQuickRegData({ name: '', document: '' });
      } catch (err) {
          toast.error('Erro ao cadastrar');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          setIsUploading(true);
          const result = await storageService.upload(file, 'financial_proofs');
          setFormData(prev => ({ ...prev, attachment_url: result.url }));
          toast.success('Comprovante enviado!');
      } catch (err) {
          toast.error('Erro no upload');
      } finally {
          setIsUploading(false);
      }
  };

  const addSplit = () => {
    setFormData(prev => ({
      ...prev,
      splits: [...(prev.splits || []), { cost_center_id: '', percentage: 0, amount: 0 }]
    }));
  };

  const removeSplit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      splits: prev.splits?.filter((_, i) => i !== index)
    }));
  };

  const updateSplit = (index: number, field: keyof TransactionSplit, value: any) => {
    const newSplits = [...(formData.splits || [])];
    newSplits[index] = { ...newSplits[index], [field]: value };
    
    // Sync percentage and amount if possible
    if (field === 'percentage') {
        newSplits[index].amount = (formData.amount * (Number(value) / 100));
    } else if (field === 'amount') {
        newSplits[index].percentage = (Number(value) / formData.amount) * 100;
    }

    setFormData({ ...formData, splits: newSplits });
  };

  // Helper: strips form-only fields and empty UUID strings so the DB never receives invalid data
  const cleanFormData = (data: typeof formData) => {
    const cleaned = { ...data };
    // Remove empty UUID strings - DB expects NULL not ""
    if (!cleaned.client_id) delete (cleaned as any).client_id;
    if (!cleaned.supplier_id) delete (cleaned as any).supplier_id;
    if (!cleaned.project_id) delete (cleaned as any).project_id;
    if (!cleaned.service_order_id) delete (cleaned as any).service_order_id;
    if (!cleaned.account_id) delete (cleaned as any).account_id;
    if (!cleaned.parent_id) delete (cleaned as any).parent_id;
    // Remove empty text strings
    if (!cleaned.cost_center) delete (cleaned as any).cost_center;
    if (!cleaned.reference_code) delete (cleaned as any).reference_code;
    if (!cleaned.nsu) delete (cleaned as any).nsu;
    if (!cleaned.attachment_url) delete (cleaned as any).attachment_url;
    if (!cleaned.client_name_manual) delete (cleaned as any).client_name_manual;
    if (!cleaned.supplier_name_manual) delete (cleaned as any).supplier_name_manual;
    return cleaned;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Destructure out form-only fields that should NOT go to the database
    const { installments, splits, ...dbData } = cleanFormData(formData);

    onSubmit(dbData as CreateTransactionData, installments);
  };

  const categories = type === 'RECEITA' ? FINANCIAL_CATEGORIES.RECEITA : FINANCIAL_CATEGORIES.DESPESA;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl max-h-[95vh] flex flex-col">
        <DialogHeader className="p-6 bg-white dark:bg-slate-800 border-b flex flex-row items-center justify-between flex-shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className={`w-2 h-6 rounded-full ${type === 'RECEITA' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {transaction ? 'Editar' : 'Novo'} {type === 'RECEITA' ? 'Recebimento' : 'Pagamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-8">
              
              {/* Seção 1: Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Informações do Lançamento
                </h3>
                <div className="grid grid-cols-12 gap-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="col-span-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-slate-500">{type === 'RECEITA' ? 'Cliente' : 'Fornecedor'}</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Avulso</span>
                            <Switch checked={isManualName} onCheckedChange={(val) => {
                                setIsManualName(val);
                                if (val) {
                                    setFormData(prev => ({ ...prev, client_id: '', supplier_id: '' }));
                                }
                            }} className="scale-75 h-4 w-8" />
                        </div>
                    </div>
                    
                    {!isManualName ? (
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select 
                                  value={type === 'RECEITA' ? formData.client_id : formData.supplier_id} 
                                  onValueChange={(v) => setFormData(prev => ({ ...prev, [type === 'RECEITA' ? 'client_id' : 'supplier_id']: v }))}
                                >
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    {type === 'RECEITA' 
                                      ? clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                      : suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                    }
                                  </SelectContent>
                                </Select>
                            </div>
                            <Button type="button" variant="outline" size="icon" onClick={() => setShowQuickRegister(true)} className="flex-shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Input 
                            placeholder={`Digite o nome do ${type === 'RECEITA' ? 'cliente' : 'fornecedor'}`}
                            value={type === 'RECEITA' ? formData.client_name_manual : formData.supplier_name_manual}
                            onChange={(e) => setFormData(prev => ({ ...prev, [type === 'RECEITA' ? 'client_name_manual' : 'supplier_name_manual']: e.target.value }))}
                        />
                    )}

                    {showQuickRegister && (
                        <div className="mt-4 p-4 border rounded-lg bg-slate-50 space-y-3">
                            <h4 className="text-xs font-bold uppercase">Cadastro Rápido</h4>
                            <Input placeholder="Nome" value={quickRegData.name} onChange={(e) => setQuickRegData({...quickRegData, name: e.target.value})} />
                            <Input placeholder="CPF/CNPJ" value={quickRegData.document} onChange={(e) => setQuickRegData({...quickRegData, document: e.target.value})} />
                            <div className="flex gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setShowQuickRegister(false)}>Cancelar</Button>
                                <Button type="button" size="sm" onClick={handleQuickRegister}>Salvar</Button>
                            </div>
                        </div>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-slate-500">Data de competência *</Label>
                    <Input 
                      type="date" 
                      value={formData.competence_date} 
                      onChange={(e) => setFormData(prev => ({ ...prev, competence_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-span-6 space-y-2">
                    <Label className="text-slate-500">Descrição do Lançamento *</Label>
                    <Input 
                      placeholder="Ex: Venda de Kit Solar" 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6 mt-4">
                     <div className="col-span-4 offset-col-8">
                        <div className="space-y-2">
                            <Label className="text-slate-500 font-bold block">Valor Total do Lançamento *</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                              <Input 
                                type="number" step="0.01" className="pl-9 font-bold text-2xl h-14 bg-emerald-50/30 border-emerald-100" 
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                required
                              />
                            </div>
                        </div>
                     </div>
                </div>
              </div>

              {/* Seção 2: Classificação e Rateio */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Calculator className="h-4 w-4" /> Classificação
                  </h3>
                  <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-emerald-200">
                    <Label htmlFor="rateio" className="text-xs font-bold text-slate-700 cursor-pointer">Habilitar rateio</Label>
                    <Switch 
                      id="rateio" 
                      checked={useSplit} 
                      onCheckedChange={setUseSplit} 
                      className="data-[state=checked]:bg-emerald-500 scale-90"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                  {!useSplit ? (
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-500 flex items-center gap-1">Categoria * <HelpCircle className="h-3 w-3" /></Label>
                        <div className="relative">
                            <Input 
                                list="categories-list"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                placeholder="Selecione ou digite..."
                                required
                            />
                            <datalist id="categories-list">
                                {categories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500">Centro de custo</Label>
                        <Select value={formData.cost_center} onValueChange={(v) => setFormData(prev => ({ ...prev, cost_center: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>) || <SelectItem value="geral">Geral</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500">Código de referência</Label>
                        <Input 
                          placeholder="Doc, NF, etc" 
                          value={formData.reference_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, reference_code: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-500">Projeto vinculado</Label>
                        <Select 
                          value={formData.project_id || "none"} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, project_id: v === "none" ? undefined : v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione o projeto..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.notes ? (p.notes.length > 30 ? p.notes.slice(0, 30) + "..." : p.notes) : `Projeto ${p.id.slice(0, 8)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-500">OS vinculada</Label>
                        <Select 
                          value={formData.service_order_id || "none"} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, service_order_id: v === "none" ? undefined : v }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione a OS..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {serviceOrders.map(so => (
                              <SelectItem key={so.id} value={so.id}>
                                {so.service_type} - {so.client?.name || 'Sem cliente'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-400 uppercase px-2">
                            <div className="col-span-6">Centro de Custo</div>
                            <div className="col-span-2 text-center">%</div>
                            <div className="col-span-3 text-right">Valor (R$)</div>
                            <div className="col-span-1"></div>
                        </div>
                        {formData.splits?.map((split, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-6">
                                    <Select value={split.cost_center_id} onValueChange={(v) => updateSplit(idx, 'cost_center_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 text-center">
                                    <Input 
                                        type="number" className="text-center" 
                                        value={split.percentage} 
                                        onChange={(e) => updateSplit(idx, 'percentage', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input 
                                        type="number" className="text-right font-semibold" 
                                        value={split.amount}
                                        onChange={(e) => updateSplit(idx, 'amount', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSplit(idx)} className="text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={addSplit} className="gap-2 border-dashed w-full text-slate-500">
                            <Plus className="h-4 w-4" /> Adicionar Rateio
                        </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 3: Condição de Pagamento */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Condição de Pagamento</h3>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                  <div className="grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-3 space-y-2">
                        <Label className="text-slate-500">Parcelamento *</Label>
                        <Select 
                          value={formData.installments.toString()} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, installments: Number(v) }))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">À vista</SelectItem>
                                {[...Array(59)].map((_, i) => (
                                    <SelectItem key={i+2} value={(i+2).toString()}>{i+2}x</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-3 space-y-2">
                        <Label className="text-slate-500">Vencimento *</Label>
                        <Input 
                          type="date" 
                          value={formData.due_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                          required
                        />
                    </div>
                    <div className="col-span-3 space-y-2">
                        <Label className="text-slate-500">Forma de pagamento</Label>
                        <Select 
                          value={formData.payment_method} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-3 space-y-2">
                        <Label className="text-slate-500">Conta de {type === 'RECEITA' ? 'recebimento' : 'pagamento'}</Label>
                        <Select value={formData.account_id} onValueChange={(v) => setFormData(prev => ({ ...prev, account_id: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="recebido" 
                          checked={formData.status === 'PAGO'} 
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked ? 'PAGO' : 'PENDENTE' }))}
                        />
                        <label htmlFor="recebido" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                            {type === 'RECEITA' ? 'Recebido' : 'Pago'}
                        </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Informar NSU?</Label>
                        <Switch checked={useNSU} onCheckedChange={setUseNSU} />
                        {useNSU && (
                            <Input 
                                className="h-8 w-32 text-xs" 
                                placeholder="Cód. NSU" 
                                value={formData.nsu}
                                onChange={(e) => setFormData(prev => ({ ...prev, nsu: e.target.value }))}
                            />
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Inferiores */}
              <Tabs defaultValue="observacoes" className="w-full">
                <TabsList className="bg-transparent border-b rounded-none w-full justify-start gap-4 h-10 p-0">
                  <TabsTrigger value="observacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-impulse-gold data-[state=active]:bg-transparent px-2 font-bold text-slate-400 data-[state=active]:text-slate-900 h-10">Observações</TabsTrigger>
                  <TabsTrigger value="anexo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-impulse-gold data-[state=active]:bg-transparent px-2 font-bold text-slate-400 data-[state=active]:text-slate-900 h-10">Anexo</TabsTrigger>
                </TabsList>
                <TabsContent value="observacoes" className="pt-4">
                  <Textarea 
                    placeholder="Descreva observações detalhadas sobre este lançamento..." 
                    className="min-h-[120px] bg-white border-slate-200"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </TabsContent>
                <TabsContent value="anexo" className="pt-4">
                   <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50 space-y-4">
                        {formData.attachment_url ? (
                            <div className="flex flex-col items-center gap-4">
                                <Check className="h-10 w-10 text-emerald-500" />
                                <div>
                                    <p className="font-bold">Comprovante Anexado!</p>
                                    <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 underline">Visualizar Arquivo</a>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(prev => ({...prev, attachment_url: ''}))} className="text-rose-500">Remover</Button>
                            </div>
                        ) : (
                            <>
                                <p className="text-slate-400 text-sm">Clique para anexar o comprovante de pagamento</p>
                                <Input 
                                    type="file" 
                                    className="hidden" 
                                    id="file-upload" 
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <Button type="button" variant="outline" disabled={isUploading} asChild>
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        {isUploading ? 'Enviando...' : 'Selecionar Arquivo'}
                                    </label>
                                </Button>
                            </>
                        )}
                   </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white dark:bg-slate-800 border-t flex items-center justify-between sm:justify-between flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-6" disabled={isLoading}>
                Voltar
            </Button>
            <Button 
                type="submit" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 h-11 text-lg font-bold min-w-[140px]"
                disabled={isLoading}
            >
                {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                ) : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
