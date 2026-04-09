import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { clientService } from '@/services/clientService';
import { pdfService } from '@/services/pdfService';
import { droneLogService, DroneServiceLog } from '@/services/droneLogService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { getUsers, UserWithRole } from '@/services/userService';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plane, Ruler, Box, MapPin, ClipboardList, CheckCircle2, Crosshair, FileText, Send, User, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DroneServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: DroneService | null;
  onSuccess: () => void;
}

const STATUS_LABELS: Record<DroneServiceStatus, string> = {
  PENDENTE: 'Aguardando Técnico',
  TECNICO: 'Em Execução (Campo)',
  REVISAO: 'Em Revisão (Escritório)',
  FINALIZADO: 'Serviço Finalizado',
};

const maskDocument = (v: string) => {
  v = v.replace(/\D/g, '');
  if (v.length <= 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4');
  return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5');
};

const maskPhone = (v: string) => {
  v = v.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{4})/g, '($1) $2-$3');
  return v.replace(/(\d{2})(\d{5})(\d{4})/g, '($1) $2-$3');
};

const maskCEP = (v: string) => {
  v = v.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  return v.replace(/(\d{5})(\d{3})/g, '$1-$2');
};

const EMPTY_FORM = {
  client_name: '',
  client_document: '',
  client_phone: '',
  client_cep: '',
  client_address_street: '',
  client_address_number: '',
  client_address_neighborhood: '',
  client_address_complement: '',
  client_address_city: '',
  client_address_state: '',
  service_description: '',
  area_hectares: '',
  product_used: '',
  location_link: '',
  status: 'PENDENTE' as DroneServiceStatus,
  office_notes: '',
  technician_id: '',
};

export function DroneServiceModal({ open, onOpenChange, service, onSuccess }: DroneServiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchingData, setSearchingData] = useState(false);
  const [logs, setLogs] = useState<DroneServiceLog[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    if (service) {
      setFormData({
        client_name: service.client_name || '',
        client_document: service.client_document || '',
        client_phone: service.client_phone || '',
        client_cep: service.client_cep || '',
        client_address_street: service.client_address_street || '',
        client_address_number: service.client_address_number || '',
        client_address_neighborhood: service.client_address_neighborhood || '',
        client_address_complement: service.client_address_complement || '',
        client_address_city: service.client_address_city || '',
        client_address_state: service.client_address_state || '',
        service_description: service.service_description || '',
        area_hectares: service.area_hectares != null ? String(service.area_hectares) : '',
        product_used: service.product_used || '',
        location_link: service.location_link || '',
        status: service.status,
        office_notes: service.office_notes || '',
        technician_id: service.technician_id || '',
      });
      loadLogs(service.id);
    } else {
      setFormData({ ...EMPTY_FORM });
      setLogs([]);
    }
  }, [service, open]);

  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers, enabled: open });
  const pilots = allUsers.filter(u => u.role === 'PILOTO' || u.role === 'CONSULTOR_TEC_DRONE');

  const loadLogs = async (id: string) => {
    try {
      const l = await droneLogService.getByServiceId(id);
      setLogs(l);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !service) return;
    try {
      const userName = user?.name || user?.email?.split('@')[0] || 'Usuário';
      const log = await droneLogService.create(service.id, newMessage, userName);
      setLogs([...logs, log]);
      setNewMessage('');
      toast.success('Mensagem enviada!');
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  // Build a clean payload with ONLY DB-valid columns
  const buildPayload = () => ({
    client_name: formData.client_name,
    client_document: formData.client_document || null,
    client_phone: formData.client_phone || null,
    client_cep: formData.client_cep || null,
    client_address_street: formData.client_address_street || null,
    client_address_number: formData.client_address_number || null,
    client_address_neighborhood: formData.client_address_neighborhood || null,
    client_address_complement: formData.client_address_complement || null,
    client_address_city: formData.client_address_city || null,
    client_address_state: formData.client_address_state || null,
    service_description: formData.service_description,
    area_hectares: formData.area_hectares && formData.area_hectares !== '' ? parseFloat(String(formData.area_hectares)) : null,
    product_used: formData.product_used || null,
    location_link: formData.location_link || null,
    status: formData.status,
    office_notes: formData.office_notes || null,
    // Add missing fields from migration
    technician_id: formData.technician_id || null,
    technician_notes: service?.technician_notes || null,
    attachment_url: service?.attachment_url || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload();
      if (service) {
        await droneService.update(service.id, payload);
        toast.success('Serviço atualizado!');
      } else {
        await droneService.create(payload);
        toast.success('Serviço de Drone aberto!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      const msg = error.message || error.details || 'Erro desconhecido';
      toast.error(`Erro ao salvar serviço: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCEP = async () => {
    const cleanCEP = formData.client_cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;
    setSearchingData(true);
    try {
      const data = await clientService.searchCEP(cleanCEP);
      setFormData(prev => ({
        ...prev,
        client_address_street: data.logradouro,
        client_address_neighborhood: data.bairro,
        client_address_complement: data.complemento || '',
        client_address_city: data.localidade,
        client_address_state: data.uf,
      }));
      toast.success('Endereço localizado!');
    } catch { toast.error('CEP não encontrado'); }
    finally { setSearchingData(false); }
  };

  const handleSearchCNPJ = async () => {
    const cleanCNPJ = formData.client_document.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;
    setSearchingData(true);
    try {
      const data = await clientService.searchCNPJ(cleanCNPJ);
      setFormData(prev => ({
        ...prev,
        client_name: data.razao_social || data.nome_fantasia,
        client_cep: maskCEP(data.cep),
        client_address_street: data.logradouro,
        client_address_number: data.numero,
        client_address_neighborhood: data.bairro,
        client_address_complement: data.complemento || '',
        client_address_city: data.municipio,
        client_address_state: data.uf,
      }));
      toast.success('Dados da empresa carregados!');
    } catch { toast.error('CNPJ não encontrado'); }
    finally { setSearchingData(false); }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error('Geolocalização não suportada');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setFormData(prev => ({ ...prev, location_link: `https://www.google.com/maps?q=${latitude},${longitude}` }));
        toast.success('Localização capturada!');
        setLoading(false);
      },
      () => { toast.error('Erro ao capturar GPS'); setLoading(false); }
    );
  };

  const handleExportPDF = () => {
    if (!service) return;
    pdfService.generateDetailedDronePDF({ ...service, logs } as any);
  };

  const f = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl flex flex-col max-h-[95vh]">
        <DialogHeader className="p-4 bg-white dark:bg-slate-800 border-b flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-blue-500" />
            {service ? (
              <div className="flex flex-col">
                <span className="text-sm font-black text-blue-600 leading-none">{service.display_code}</span>
                <span className="text-[10px] text-slate-400 font-medium">Editar Operação</span>
              </div>
            ) : 'Nova Operação Drone'}
          </DialogTitle>
          {service && (
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="text-emerald-600 gap-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
              <FileText className="h-4 w-4" /> Exportar Relatório OS
            </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col min-h-0">
          <Tabs defaultValue="client" className="w-full flex flex-col overflow-hidden">
            <div className="px-5 bg-white dark:bg-slate-800 border-b flex-shrink-0">
              <TabsList className="bg-transparent rounded-none justify-start gap-4 h-10 p-0">
                <TabsTrigger value="client" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-1 text-xs font-bold text-slate-400 data-[state=active]:text-blue-700 h-9 flex gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Cliente
                </TabsTrigger>
                <TabsTrigger value="service" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 px-1 text-xs font-bold text-slate-400 data-[state=active]:text-amber-700 h-9 flex gap-1.5">
                  <Ruler className="h-3.5 w-3.5" /> Serviço
                </TabsTrigger>
                <TabsTrigger value="execution" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 px-1 text-xs font-bold text-slate-400 data-[state=active]:text-emerald-700 h-9 flex gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> Diário de Bordo {logs.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-full text-[10px]">{logs.length}</span>}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="overflow-y-auto min-h-0 max-h-[65vh]">

              {/* TAB 1: CLIENTE */}
              <TabsContent value="client" className="p-4 m-0 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">CPF / CNPJ</Label>
                    <div className="relative">
                      <Input value={formData.client_document} onChange={e => f('client_document', maskDocument(e.target.value))} onBlur={handleSearchCNPJ} placeholder="000.000.000-00" className="bg-white h-9 text-sm" />
                      {searchingData && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-500" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Nome / Razão Social *</Label>
                    <Input value={formData.client_name} onChange={e => f('client_name', e.target.value)} required className="bg-white h-9 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Telefone / WhatsApp</Label>
                    <Input value={formData.client_phone} onChange={e => f('client_phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" className="bg-white h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">CEP</Label>
                    <Input value={formData.client_cep} onChange={e => f('client_cep', maskCEP(e.target.value))} onBlur={handleSearchCEP} placeholder="00000-000" className="bg-white h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Cidade *</Label>
                      <Input value={formData.client_address_city} onChange={e => f('client_address_city', e.target.value)} placeholder="Cidade" className="bg-white h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">UF *</Label>
                      <Input value={formData.client_address_state} onChange={e => f('client_address_state', e.target.value.toUpperCase())} maxLength={2} placeholder="UF" className="bg-white h-9 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Endereço (Rua/Estrada)</Label>
                    <Input value={formData.client_address_street} onChange={e => f('client_address_street', e.target.value)} className="bg-white h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Número</Label>
                    <Input value={formData.client_address_number} onChange={e => f('client_address_number', e.target.value)} placeholder="S/N" className="bg-white h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Bairro</Label>
                    <Input value={formData.client_address_neighborhood} onChange={e => f('client_address_neighborhood', e.target.value)} className="bg-white h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Complemento</Label>
                    <Input value={formData.client_address_complement} onChange={e => f('client_address_complement', e.target.value)} placeholder="Fazenda, Lote, Bloco..." className="bg-white h-9 text-sm" />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: SERVIÇO */}
              <TabsContent value="service" className="p-4 m-0 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Situação</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v as DroneServiceStatus }))}>
                      <SelectTrigger className="bg-white h-9 font-bold text-blue-600 text-sm focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="border-none shadow-xl">{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Piloto / Técnico Responsável</Label>
                    <Select value={formData.technician_id} onValueChange={v => f('technician_id', v)}>
                      <SelectTrigger className="bg-white h-9 text-sm focus:ring-0 shadow-none">
                        <SelectValue placeholder="Selecione um piloto..." />
                      </SelectTrigger>
                      <SelectContent className="border-none shadow-xl">
                        {pilots.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Escopo da Pulverização *</Label>
                  <Textarea value={formData.service_description} onChange={e => f('service_description', e.target.value)} required className="bg-white min-h-[80px] text-sm focus-visible:ring-0 border-slate-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t mt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Ruler className="h-3 w-3" /> Área (ha)</Label>
                    <Input type="number" step="0.01" value={formData.area_hectares} onChange={e => f('area_hectares', e.target.value)} className="bg-white h-9 text-lg font-black" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Box className="h-3 w-3" /> Produto Utilizado</Label>
                    <Input value={formData.product_used} onChange={e => f('product_used', e.target.value)} className="bg-white h-9 text-sm" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização Exata</Label>
                  <div className="flex gap-2">
                    <Input value={formData.location_link} onChange={e => f('location_link', e.target.value)} placeholder="Link do Maps ou coordenadas..." className="bg-white h-9 text-sm flex-1" />
                    <Button type="button" variant="outline" onClick={captureGPS} size="sm" className="bg-blue-50 text-blue-600 h-9 px-3 border-blue-100"><Crosshair className="h-4 w-4 mr-1" /> GPS</Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Observações do Escritório</Label>
                  <Textarea value={formData.office_notes} onChange={e => f('office_notes', e.target.value)} className="bg-white min-h-[50px] text-sm focus-visible:ring-0 border-slate-200" />
                </div>
              </TabsContent>

              {/* TAB 3: DIÁRIO DE BORDO */}
              <TabsContent value="execution" className="p-5 m-0 flex flex-col gap-4" style={{ minHeight: '400px' }}>
                <Label className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Diário de Operação
                </Label>

                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border p-3 overflow-y-auto space-y-3" style={{ minHeight: '250px' }}>
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-10">
                      <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
                      <span className="text-sm">Nenhum registro. Comece a conversa abaixo.</span>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className={`flex flex-col ${log.created_by === user?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${log.created_by === user?.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <User className="h-3 w-3 opacity-70" />
                            <span className="text-[10px] font-black uppercase">{log.created_by_name}</span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.message}</p>
                          <span className="text-[9px] opacity-60 mt-0.5 block text-right">
                            {format(new Date(log.created_at), "HH:mm ' - ' dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {service && (
                  <div className="flex gap-2 bg-white p-2 rounded-xl border shadow-sm">
                    <Textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Escreva como foi o serviço..."
                      className="border-none focus-visible:ring-0 min-h-[50px] resize-none text-sm"
                    />
                    <Button type="button" onClick={handleSendMessage} className="bg-blue-600 self-end h-9 w-9 p-0 rounded-lg">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

            </div>
          </Tabs>

          <DialogFooter className="p-3 bg-white dark:bg-slate-800 border-t flex-shrink-0">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-lg h-9">Descartar</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 h-10 rounded-lg font-bold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {service ? 'Salvar Edições' : 'Gerar Ordem de Serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
