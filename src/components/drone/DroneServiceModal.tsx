import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plane, Ruler, Box, MapPin, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export function DroneServiceModal({ open, onOpenChange, service, onSuccess }: DroneServiceModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    client_name: '',
    service_description: '',
    area_hectares: '',
    product_used: '',
    location_link: '',
    status: 'PENDENTE',
    office_notes: '',
    technician_notes: '',
  });

  useEffect(() => {
    if (service) {
      setFormData({
        client_name: service.client_name,
        service_description: service.service_description,
        area_hectares: service.area_hectares || '',
        product_used: service.product_used || '',
        location_link: service.location_link || '',
        status: service.status,
        office_notes: service.office_notes || '',
        technician_notes: service.technician_notes || '',
      });
    } else {
      setFormData({
        client_name: '',
        service_description: '',
        area_hectares: '',
        product_used: '',
        location_link: '',
        status: 'PENDENTE',
        office_notes: '',
        technician_notes: '',
      });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (service) {
        await droneService.update(service.id, {
            ...formData,
            area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null
        });
        toast.success('Serviço atualizado!');
      } else {
        await droneService.create({
            ...formData,
            area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null
        });
        toast.success('Serviço de Drone aberto com sucesso!');
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

  const isTechnician = user?.role === 'TECNICO';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-2xl flex flex-col max-h-[95vh]">
        <DialogHeader className="p-6 bg-white dark:bg-slate-800 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-blue-500" />
            {service ? 'Editar Ordem de Serviço Drone' : 'Nova Ordem de Serviço Drone'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <Tabs defaultValue="general" className="w-full flex-1 flex flex-col">
            <div className="px-6 bg-white dark:bg-slate-800 border-b flex-shrink-0">
              <TabsList className="bg-transparent rounded-none justify-start gap-6 h-12 p-0">
                <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-2 font-bold text-slate-400 data-[state=active]:text-blue-700 h-10 flex gap-2">
                  <ClipboardList className="h-4 w-4" /> Dados Gerais
                </TabsTrigger>
                <TabsTrigger value="execution" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 px-2 font-bold text-slate-400 data-[state=active]:text-emerald-700 h-10 flex gap-2">
                  <Plane className="h-4 w-4" /> Execução / Campo
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general" className="p-8 m-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Nome do Cliente *</Label>
                  <Input 
                    value={formData.client_name} 
                    onChange={e => setFormData({...formData, client_name: e.target.value})}
                    placeholder="Digite o nome do cliente manual"
                    required
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Situação Atual</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={v => setFormData({...formData, status: v as DroneServiceStatus})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([val, lab]) => (
                        <SelectItem key={val} value={val}>{lab}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Descrição do Serviço *</Label>
                <Textarea 
                  value={formData.service_description} 
                  onChange={e => setFormData({...formData, service_description: e.target.value})}
                  placeholder="Descreva o que será feito..."
                  required
                  className="bg-white min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Observações do Escritório</Label>
                <Textarea 
                  value={formData.office_notes} 
                  onChange={e => setFormData({...formData, office_notes: e.target.value})}
                  placeholder="Notas internas..."
                  className="bg-white"
                />
              </div>
            </TabsContent>

            <TabsContent value="execution" className="p-8 m-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Ruler className="h-3 w-3" /> Área (Hectares)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.area_hectares} 
                    onChange={e => setFormData({...formData, area_hectares: e.target.value})}
                    placeholder="0.00"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Box className="h-3 w-3" /> Produto Utilizado</Label>
                  <Input 
                    value={formData.product_used} 
                    onChange={e => setFormData({...formData, product_used: e.target.value})}
                    placeholder="Ex: Herbicida X, Inseticida Y..."
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin className="h-3 w-3" /> Localização / Google Maps</Label>
                <Input 
                  value={formData.location_link} 
                  onChange={e => setFormData({...formData, location_link: e.target.value})}
                  placeholder="Cole o link da localização aqui..."
                  className="bg-white"
                />
              </div>

              <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <Label className="text-xs font-bold text-emerald-600 uppercase">Relatório do Técnico / Campo</Label>
                <Textarea 
                  value={formData.technician_notes} 
                  onChange={e => setFormData({...formData, technician_notes: e.target.value})}
                  placeholder="Relate como foi a aplicação, condições do tempo, etc..."
                  className="bg-white mt-1 min-h-[120px]"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-4 bg-white dark:bg-slate-800 border-t flex-shrink-0">
            <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button 
                type="submit" 
                disabled={loading} 
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-8 rounded-xl font-bold"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {service ? 'Salvar Alterações' : 'Abrir Ordem de Serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
