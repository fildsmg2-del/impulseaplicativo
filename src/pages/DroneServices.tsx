import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, MapPin, Plane, Ruler, Calendar, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { DroneServiceModal } from '@/components/drone/DroneServiceModal';
import { pdfService } from '@/services/pdfService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<DroneServiceStatus, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  TECNICO: { label: 'Em Campo', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Plane },
  REVISAO: { label: 'Em Revisão', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: AlertCircle },
  FINALIZADO: { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

export default function DroneServices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<DroneService | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['drone-services', statusFilter, search],
    queryFn: () => droneService.getAll({ 
        status: statusFilter === 'all' ? undefined : statusFilter as DroneServiceStatus,
        search: search 
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: droneService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drone-services'] });
      toast.success('Serviço excluído');
    },
  });

  const handleEdit = (service: DroneService) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta OS?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                <Plane className="h-6 w-6" />
              </div>
              Operação de Drone
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Gestão de Ordens de Serviço e Pulverização</p>
          </div>
          
          <Button 
            onClick={() => { setSelectedService(null); setIsModalOpen(true); }} 
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 h-12 rounded-xl font-bold shadow-lg shadow-blue-100"
          >
            <Plus className="h-5 w-5" /> Abrir Novo Serviço
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input 
                    placeholder="Buscar por cliente..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl"
                />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                <Button 
                    variant={statusFilter === 'all' ? 'default' : 'outline'} 
                    onClick={() => setStatusFilter('all')}
                    className="rounded-full h-9 px-6 font-bold"
                >
                    Todos
                </Button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <Button 
                        key={key}
                        variant={statusFilter === key ? 'default' : 'outline'}
                        onClick={() => setStatusFilter(key)}
                        className={`rounded-full h-9 px-6 font-bold whitespace-nowrap ${statusFilter === key ? 'bg-blue-600' : ''}`}
                    >
                        {config.label}
                    </Button>
                ))}
            </div>
        </div>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse h-48 bg-slate-100" />
                ))}
            </div>
        ) : services.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                <Plane className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Nenhuma ordem de serviço encontrada.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                    const config = STATUS_CONFIG[service.status];
                    return (
                        <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-none bg-white dark:bg-slate-800 overflow-hidden relative">
                            <div className={`absolute top-0 left-0 w-1 h-full ${service.status === 'FINALIZADO' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <Badge variant="outline" className={`font-bold px-3 py-1 gap-1.5 ${config.color}`}>
                                        <config.icon className="h-3 w-3" />
                                        {config.label}
                                    </Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                            <DropdownMenuItem onClick={() => handleEdit(service)} className="gap-2 cursor-pointer">
                                                <Edit className="h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => pdfService.generateDetailedDronePDF(service)} className="gap-2 cursor-pointer text-emerald-600">
                                                <FileText className="h-4 w-4" /> PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(service.id)} className="gap-2 cursor-pointer text-rose-600">
                                                <Trash2 className="h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1">{service.client_name}</h3>
                                        <p className="text-sm text-slate-400 font-medium flex items-center gap-1.5 mt-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(new Date(service.created_at), "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-50 dark:border-slate-700">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">Área Total</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <Ruler className="h-3.5 w-3.5 text-blue-500" />
                                                {service.area_hectares ? `${service.area_hectares} ha` : '-'}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">Localização</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 ml-auto">
                                                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                                {service.location_link ? 'Ver Mapa' : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Serviço:</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {service.service_description}
                                        </p>
                                    </div>
                                    
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => handleEdit(service)}
                                        className="w-full mt-2 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 hover:text-blue-600 rounded-xl font-bold group-hover:bg-blue-600 group-hover:text-white transition-all"
                                    >
                                        Abrir Detalhes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        )}

        <DroneServiceModal 
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          service={selectedService}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['drone-services'] })}
        />
      </div>
    </AppLayout>
  );
}
