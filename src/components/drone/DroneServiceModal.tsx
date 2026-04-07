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
import { Loader2, Plane, Ruler, Box, MapPin, ClipboardList, CheckCircle2, Search, Crosshair, FileText, Send, User, MessageCircle } from 'lucide-react';
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

// Mask utilities
const maskDocument = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "$1.$2.$3-$4");
    }
    return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, "$1.$2.$3/$4-$5");
};

const maskPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length <= 10) {
        return v.replace(/(\d{2})(\d{4})(\d{4})/g, "($1) $2-$3");
    }
    return v.replace(/(\d{2})(\d{5})(\d{4})/g, "($1) $2-$3");
};

const maskCEP = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    return v.replace(/(\d{5})(\d{3})/g, "$1-$2");
};

export function DroneServiceModal({ open, onOpenChange, service, onSuccess }: DroneServiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchingData, setSearchingData] = useState(false);
  const [logs, setLogs] = useState<DroneServiceLog[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [formData, setFormData] = useState<any>({
    client_name: '',
    client_document: '',
    client_phone: '',
    client_cep: '',
    client_address_street: '',
    client_address_number: '',
    client_address_neighborhood: '',
    client_address_city: '',
    client_address_state: '',
    service_description: '',
    area_hectares: '',
    product_used: '',
    location_link: '',
    status: 'PENDENTE',
    office_notes: '',
  });

  useEffect(() => {
    if (service) {
      setFormData({
        ...service,
        area_hectares: service.area_hectares || '',
        client_document: service.client_document || '',
        client_phone: service.client_phone || '',
        client_cep: service.client_cep || '',
        client_address_street: service.client_address_street || '',
        client_address_number: service.client_address_number || '',
        client_address_neighborhood: service.client_address_neighborhood || '',
        client_address_city: service.client_address_city || '',
        client_address_state: service.client_address_state || '',
      });
      loadLogs(service.id);
    } else {
      setFormData({
        client_name: '',
        client_document: '',
        client_phone: '',
        client_cep: '',
        client_address_street: '',
        client_address_number: '',
        client_address_neighborhood: '',
        client_address_city: '',
        client_address_state: '',
        service_description: '',
        area_hectares: '',
        product_used: '',
        location_link: '',
        status: 'PENDENTE',
        office_notes: '',
      });
      setLogs([]);
    }
  }, [service, open]);

  const loadLogs = async (id: string) => {
      try {
          const l = await droneLogService.getByServiceId(id);
          setLogs(l);
      } catch (err) {
          console.error(err);
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Filter out auto-generated or internal fields before saving
      const { 
        id, created_at, updated_at, created_by, logs,
        ...saveData 
      } = formData;

      const payload = {
        ...saveData,
        area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null
      };

      if (service) {
        await droneService.update(service.id, payload);
        toast.success('Serviço atualizado!');
      } else {
        await droneService.create(payload);
        toast.success('Serviço de Drone aberto!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar serviço');
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
        setFormData((prev: any) => ({
            ...prev,
            client_address_street: data.logradouro,
            client_address_neighborhood: data.bairro,
            client_address_city: data.localidade,
            client_address_state: data.uf
        }));
    } catch (err) { toast.error('CEP não encontrado'); }
    finally { setSearchingData(false); }
  };

  const handleSearchCNPJ = async () => {
    const cleanCNPJ = formData.client_document.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;
    setSearchingData(true);
    try {
        const data = await clientService.searchCNPJ(cleanCNPJ);
        setFormData((prev: any) => ({
            ...prev,
            client_name: data.razao_social || data.nome_fantasia,
            client_cep: maskCEP(data.cep),
            client_address_street: data.logradouro,
            client_address_number: data.numero,
            client_address_neighborhood: data.bairro,
            client_address_city: data.municipio,
            client_address_state: data.uf
        }));
    } catch (err) { toast.error('CNPJ não encontrado'); }
    finally { setSearchingData(false); }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error('Geolocalização não suportada');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setFormData({...formData, location_link: `https://www.google.com/maps?q=${latitude},${longitude}`});
            toast.success('Localização capturada!');
            setLoading(false);
        },
        () => { toast.error('Erro ao capturar GPS'); setLoading(false); }
    );
  };

  const handleExportPDF = async () => {
    if (!service) return;
    // Use any casting to avoid type mismatch with the local log interface
    pdfService.generateDetailedDronePDF({...service, logs} as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl flex flex-col h-[90vh]">
        <DialogHeader className="p-6 bg-white dark:bg-slate-800 border-b flex-shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-blue-500" />
            {service ? 'OS Drone#' + service.id.slice(0, 5) : 'Nova Operação Drone'}
          </DialogTitle>
          {service && (
              <Button onClick={handleExportPDF} variant="outline" className="text-emerald-600 gap-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                  <FileText className="h-4 w-4" /> Exportar Relatório OS
              </Button>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="client" className="w-full flex-1 flex flex-col overflow-hidden">
            <div className="px-6 bg-white dark:bg-slate-800 border-b flex-shrink-0">
              <TabsList className="bg-transparent rounded-none justify-start gap-6 h-12 p-0">
                <TabsTrigger value="client" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-2 font-bold text-slate-400 data-[state=active]:text-blue-700 h-10 flex gap-2">
                  <ClipboardList className="h-4 w-4" /> Cliente
                </TabsTrigger>
                <TabsTrigger value="service" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-600 px-2 font-bold text-slate-400 data-[state=active]:text-amber-700 h-10 flex gap-2">
                  <Ruler className="h-4 w-4" /> Serviço
                </TabsTrigger>
                <TabsTrigger value="execution" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 px-2 font-bold text-slate-400 data-[state=active]:text-emerald-700 h-10 flex gap-2">
                  <MessageCircle className="h-4 w-4" /> Diário de Bordo {logs.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 rounded-full text-[10px] ml-1">{logs.length}</span>}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 dark:bg-slate-900/50">
                <TabsContent value="client" className="p-8 m-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">CPF / CNPJ *</Label>
                    <div className="relative group">
                        <Input 
                            value={formData.client_document} 
                            onChange={e => setFormData({...formData, client_document: maskDocument(e.target.value)})}
                            onBlur={handleSearchCNPJ}
                            placeholder="000.000.000-00"
                            className="bg-white"
                        />
                        {searchingData && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500" />}
                    </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nome / Razão Social *</Label>
                    <Input 
                        value={formData.client_name} 
                        onChange={e => setFormData({...formData, client_name: e.target.value})}
                        required className="bg-white"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Telefone / WhatsApp *</Label>
                    <Input 
                        value={formData.client_phone} 
                        onChange={e => setFormData({...formData, client_phone: maskPhone(e.target.value)})}
                        placeholder="(00) 00000-0000" className="bg-white"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">CEP *</Label>
                    <Input 
                        value={formData.client_cep} 
                        onChange={e => setFormData({...formData, client_cep: maskCEP(e.target.value)})}
                        onBlur={handleSearchCEP}
                        placeholder="00000-000" className="bg-white"
                    />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Cidade / UF</Label>
                    <Input value={`${formData.client_address_city || ''} - ${formData.client_address_state || ''}`} readOnly className="bg-slate-100 italic" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2 md:col-span-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Endereço (Rua/Estrada)</Label>
                    <Input value={formData.client_address_street} onChange={e => setFormData({...formData, client_address_street: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Número</Label>
                    <Input value={formData.client_address_number} onChange={e => setFormData({...formData, client_address_number: e.target.value})} className="bg-white" />
                    </div>
                </div>
                </TabsContent>

                <TabsContent value="service" className="p-8 m-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Situação</Label>
                            <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as DroneServiceStatus})}>
                                <SelectTrigger className="bg-white font-bold text-blue-600"><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Escopo da Pulverização *</Label>
                        <Textarea value={formData.service_description} onChange={e => setFormData({...formData, service_description: e.target.value})} required className="bg-white min-h-[120px]" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Ruler className="h-3 w-3" /> Área (Hectares)</Label>
                            <Input type="number" step="0.01" value={formData.area_hectares} onChange={e => setFormData({...formData, area_hectares: e.target.value})} className="bg-white text-lg font-black" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Box className="h-3 w-3" /> Produto Utilizado</Label>
                            <Input value={formData.product_used} onChange={e => setFormData({...formData, product_used: e.target.value})} className="bg-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização Exata</Label>
                        <div className="flex gap-2">
                            <Input value={formData.location_link} onChange={e => setFormData({...formData, location_link: e.target.value})} placeholder="Link do Maps..." className="bg-white flex-1" />
                            <Button type="button" variant="outline" onClick={captureGPS} className="bg-blue-50 text-blue-600"><Crosshair className="h-4 w-4 mr-2" /> GPS Atual</Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="execution" className="p-8 m-0 h-full flex flex-col space-y-6">
                    <div className="flex-1 flex flex-col space-y-4 min-h-[300px]">
                        <Label className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" /> Diário de Operação (Conversa)
                        </Label>
                        <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border p-4 overflow-y-auto space-y-4 min-h-[250px]">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                                    <MessageCircle className="h-10 w-10 mb-2 opacity-20" />
                                    Nenhum registro ainda. Comece a conversa abaixo.
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className={`flex flex-col ${log.created_by === user?.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${log.created_by === user?.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="h-3 w-3 opacity-70" />
                                                <span className="text-[10px] font-black uppercase tracking-tight">{log.created_by_name}</span>
                                            </div>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{log.message}</p>
                                            <span className="text-[9px] opacity-70 mt-1 block text-right">
                                                {format(new Date(log.created_at), "HH:mm ' - ' dd/MM", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {service && (
                            <div className="flex gap-2 bg-white p-2 rounded-2xl border shadow-sm">
                                <Textarea 
                                    value={newMessage} 
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Escreva como foi o serviço..."
                                    className="border-none focus-visible:ring-0 min-h-[60px] resize-none"
                                />
                                <Button type="button" onClick={() => handleSendMessage()} className="bg-blue-600 self-end h-10 w-10 p-0 rounded-xl">
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-4 bg-white dark:bg-slate-800 border-t flex-shrink-0">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-xl">Descartar</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-10 h-12 rounded-xl font-bold shadow-lg shadow-blue-100">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {service ? 'Salvar Edições' : 'Gerar Ordem de Serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
