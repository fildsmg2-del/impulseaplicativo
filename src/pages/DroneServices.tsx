import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, MoreHorizontal, Edit, Trash2, MapPin, Plane, Ruler, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { DroneServiceModal } from '@/components/drone/DroneServiceModal';
import { pdfService } from '@/services/pdfService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: servicesRaw = [], isLoading } = useQuery({
    queryKey: ['drone-services', statusFilter, search],
    queryFn: () => droneService.getAll({ 
        status: statusFilter === 'all' ? undefined : statusFilter as DroneServiceStatus,
        search: search 
    }),
  });

  const services = useMemo(() => {
    if (!user) return [];
    if (user.role === 'PILOTO') {
        return servicesRaw.filter(s => s.technician_id === user.id);
    }
    return servicesRaw;
  }, [servicesRaw, user]);

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
    setServiceToDelete(id);
  };

  return (
    <>
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

        <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? (
                <div className="p-10 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full bg-slate-50 animate-pulse rounded-lg" />
                    ))}
                </div>
            ) : services.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800">
                    <Plane className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Nenhuma ordem de serviço encontrada.</p>
                </div>
            ) : (
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-bold text-slate-500 h-12">ID/OS</TableHead>
                      <TableHead className="font-bold text-slate-500 h-12">Cliente</TableHead>
                      <TableHead className="font-bold text-slate-500 h-12">Área</TableHead>
                      <TableHead className="font-bold text-slate-500 h-12">Status</TableHead>
                      <TableHead className="font-bold text-slate-500 h-12">Data Abertura</TableHead>
                      <TableHead className="text-right font-bold text-slate-500 h-12">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => {
                        const config = STATUS_CONFIG[service.status];
                        return (
                            <TableRow key={service.id} className="hover:bg-slate-50 border-slate-50 transition-colors group">
                              <TableCell className="font-bold text-blue-600">
                                {service.display_code || `DR-${service.id.slice(0, 4)}`}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 dark:text-white">{service.client_name}</span>
                                  <span className="text-[10px] text-slate-400 uppercase font-medium">{service.client_document || 'Sem doc.'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                  <Ruler className="h-3.5 w-3.5 text-blue-500" />
                                  {service.area_hectares ? `${service.area_hectares} ha` : '-'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`font-bold px-3 py-1 gap-1.5 ${config.color} border-none`}>
                                    <config.icon className="h-3 w-3" />
                                    {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-500 font-medium text-sm">
                                {format(new Date(service.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {service.location_link && (
                                    <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500">
                                      <a href={service.location_link.startsWith('http') ? service.location_link : `https://${service.location_link}`} target="_blank" rel="noopener noreferrer">
                                        <MapPin className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                                              <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40 border-slate-100 shadow-xl rounded-xl">
                                          <DropdownMenuItem onClick={() => handleEdit(service)} className="gap-2 cursor-pointer font-medium">
                                              <Edit className="h-4 w-4 text-slate-400" /> Editar OS
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => pdfService.generateDetailedDronePDF(service)} className="gap-2 cursor-pointer font-medium text-emerald-600">
                                              <FileText className="h-4 w-4" /> Exportar PDF
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDelete(service.id)} className="gap-2 cursor-pointer font-medium text-rose-600">
                                              <Trash2 className="h-4 w-4" /> Excluir OS
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                        );
                    })}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>

        <DroneServiceModal 
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          service={selectedService}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['drone-services'] })}
        />

        <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && setServiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir OS de Drone</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  if (serviceToDelete) deleteMutation.mutate(serviceToDelete);
                  setServiceToDelete(null);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
