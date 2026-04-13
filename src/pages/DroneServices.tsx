import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plane, Activity, Search, Plus as PlusIcon, List, LayoutGrid, Calendar, 
  Loader2, Filter, ChevronRight, MoreHorizontal, Clock,
  CheckCircle2, AlertCircle, XCircle, MapPin, User, Settings2
} from 'lucide-react';
import { getUsers, UserWithRole } from '@/services/userService';
import { droneService, DroneService, DroneServiceStatus } from '@/services/droneService';
import { DroneServiceModal } from '@/components/drone/DroneServiceModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type ViewMode = 'list' | 'kanban';

export default function DroneServices() {
  const { user } = useAuth();
  
  if (user?.role === 'TECNICO') {
    return <Navigate to="/dashboard" replace />;
  }

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<DroneService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DroneServiceStatus | null>(null);
  const [pilotFilter, setPilotFilter] = useState<string | null>(null);
  const [pilots, setPilots] = useState<UserWithRole[]>([]);

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['drone-services'],
    queryFn: droneService.getAll,
  });

  const handleServiceClick = (service: DroneService) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  // Carregar pilotos para mapear nomes localmente
  useEffect(() => {
    getUsers().then(setPilots).catch(console.error);
  }, []);

  const technicianNames = pilots.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

  const filteredServices = services.filter((s) => {
    // Regra: Piloto vê apenas o que foi designado a ele
    if (user?.role === 'PILOTO' && s.technician_id !== user.id) {
      return false;
    }

    const searchLower = (search || '').toLowerCase();
    const clientName = (s.client?.name || s.client_name || '').toLowerCase();
    const location = (s.location_link || '').toLowerCase();
    
    const matchesSearch = clientName.includes(searchLower) || location.includes(searchLower);
    const matchesStatus = !statusFilter || s.status === statusFilter;
    const matchesPilot = !pilotFilter || s.technician_id === pilotFilter;
    return matchesSearch && matchesStatus && matchesPilot;
  });

  const [draggedService, setDraggedService] = useState<DroneService | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, service: DroneService) => {
    setDraggedService(service);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, statusKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== statusKey) setDragOverColumn(statusKey);
  };

  const handleDrop = async (e: React.DragEvent, statusKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedService || draggedService.status === statusKey) {
      setDraggedService(null);
      return;
    }

    try {
      const oldStatus = statusConfig[draggedService.status]?.label || draggedService.status;
      const newStatus = statusConfig[statusKey as DroneServiceStatus]?.label || statusKey;
      
      await droneService.updateStatus(draggedService.id, statusKey as DroneServiceStatus);
      
      // Criar log de movimentação
      await droneLogService.create(
        draggedService.id,
        `Movimentou OS: ${oldStatus} para ${newStatus}`,
        user?.name || 'Usuário'
      );
      
      toast.success(`OS movida para ${newStatus}`);
      refetch();
    } catch (error) {
      console.error('Error moving drone service:', error);
      toast.error('Erro ao mover OS');
    } finally {
      setDraggedService(null);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    'PENDENTE': { label: 'Pendente', color: 'bg-amber-500', icon: Clock },
    'TECNICO': { label: 'Em Campo', color: 'bg-indigo-500', icon: User },
    'REVISAO': { label: 'Revisão', color: 'bg-purple-500', icon: Settings2 },
    'FINALIZADO': { label: 'Finalizado', color: 'bg-emerald-500', icon: CheckCircle2 },
  };

  const safeFormatDate = (dateStr: string | null | undefined, fmt: string = "dd/MM/yy") => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return format(date, fmt, { locale: ptBR });
    } catch (e) {
      return "-";
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm font-bold uppercase tracking-widest">Sincronizando dados...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/30 p-8 rounded-[40px] border border-border/50 backdrop-blur-xl group">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[22px] bg-primary/10 flex items-center justify-center text-primary rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <Plane className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">
              Serviços <span className="text-primary">Drone</span>
            </h1>
          </div>
          <p className="text-muted-foreground font-medium max-w-md ml-1">
            Gestão completa de mapeamento aéreo e processamento de dados.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-2xl border border-border">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn("rounded-xl h-9 flex-1 sm:flex-none", viewMode === 'list' && "shadow-sm bg-background")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={cn("rounded-xl h-9 flex-1 sm:flex-none", viewMode === 'kanban' && "shadow-sm bg-background")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </div>
          
          <Button 
            onClick={() => { setSelectedService(null); setModalOpen(true); }}
            className="rounded-2xl h-12 px-6 shadow-lg shadow-primary/20 animate-in zoom-in-50 duration-500 w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nova OS Drone
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 animate-in slide-in-from-left-5 duration-700 delay-150">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Buscar por cliente ou localização..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 rounded-2xl bg-card border-border/50 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={pilotFilter ? "secondary" : "outline"} className={cn("h-14 w-14 rounded-2xl border-border bg-card shadow-sm hover:bg-muted transition-all active:scale-95", pilotFilter && "border-primary/50 text-primary")}>
              <Filter className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 rounded-3xl bg-card border-border shadow-2xl" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black uppercase tracking-tighter text-sm">Filtrar por Piloto</h4>
                {pilotFilter && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPilotFilter(null)}
                    className="h-7 px-2 text-[10px] font-bold uppercase text-primary"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                {pilots.filter(p => p.role === 'PILOTO' || p.role === 'CONSULTOR_TEC_DRONE').map((pilot) => (
                  <button
                    key={pilot.id}
                    onClick={() => setPilotFilter(pilotFilter === pilot.id ? null : pilot.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left",
                      pilotFilter === pilot.id ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-muted-foreground border border-transparent"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold truncate">{pilot.name}</span>
                  </button>
                ))}
                {pilots.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum piloto encontrado</p>}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filters & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {Object.entries(statusConfig).map(([key, config]) => (
              <Button
                key={key}
                variant={statusFilter === key ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === key ? null : key as DroneServiceStatus)}
                className={cn(
                  "rounded-2xl h-12 px-4 whitespace-nowrap transition-all",
                  statusFilter === key ? "bg-primary/10 border-primary/50 text-primary" : "bg-card border-border text-muted-foreground"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full mr-2", config.color)} />
                {config.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-primary/70 uppercase tracking-widest">Total de OS</p>
            <p className="text-2xl font-black text-primary">{filteredServices.length}</p>
          </div>
          <Activity className="h-8 w-8 text-primary/20" />
        </div>
      </div>

      {/* Content */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-muted/20 rounded-[40px] border-2 border-dashed border-border/50 gap-6">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">Nenhuma OS encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Experimente ajustar seus filtros ou busca para encontrar o que procura.
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => { setSearch(''); setStatusFilter(null); setPilotFilter(null); }}
            className="rounded-2xl"
          >
            Limpar Filtros
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-card rounded-[32px] border border-border overflow-hidden animate-in slide-in-from-bottom-5 duration-700">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest pl-8">Código</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Cliente</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Piloto</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Localização</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Área</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Status</TableHead>
                <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const config = statusConfig[service.status] || statusConfig['PENDENTE'];
                return (
                  <TableRow 
                    key={service.id} 
                    className="cursor-pointer border-border hover:bg-muted/30 transition-colors group"
                    onClick={() => handleServiceClick(service)}
                  >
                    <TableCell className="pl-8 py-4 font-bold text-xs text-muted-foreground">
                      <Badge variant="outline" className="rounded-lg bg-muted/30 border-none font-black text-primary">
                        {service.display_code || `#${service.id.slice(0, 6)}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                          {service.client?.name || service.client_name || 'Não informado'}
                        </span>
                        {service.client_phone && (
                          <span className="text-[10px] text-muted-foreground">{service.client_phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {service.technician_id ? (technicianNames[service.technician_id] || 'Piloto Local') : 'Não atribuído'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 max-w-[200px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs truncate italic">{service.location_link || 'Sem local'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="bg-muted text-foreground font-black tracking-tight">
                        {service.area_hectares || '0'} ha
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", config.color)} />
                        <span className={cn("text-xs font-bold", config.color.replace('bg-', 'text-'))}>
                          {config.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                      {safeFormatDate(service.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px] overflow-x-auto pb-4 no-scrollbar">
          {Object.entries(statusConfig).map(([statusKey, config]) => {
            const columnServices = filteredServices.filter(s => {
              const sStatus = s.status as string;
              return sStatus === statusKey || (!statusConfig[sStatus] && statusKey === 'PENDENTE');
            });
            const StatusIcon = config.icon || Activity;
            const isDragOver = dragOverColumn === statusKey;
            
            return (
              <div 
                key={statusKey} 
                className="flex flex-col gap-4 min-w-[280px]"
                onDragOver={(e) => handleDragOver(e, statusKey)}
                onDrop={(e) => handleDrop(e, statusKey)}
                onDragLeave={() => setDragOverColumn(null)}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("h-4 w-4", config.color.replace('bg-', 'text-'))} />
                    <h3 className="font-black text-sm uppercase tracking-tighter text-foreground">{config.label}</h3>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold h-5 px-1.5">
                      {columnServices.length}
                    </Badge>
                  </div>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground/30 cursor-pointer" />
                </div>
                
                <div 
                  onDragOver={(e) => handleDragOver(e, statusKey)}
                  onDrop={(e) => handleDrop(e, statusKey)}
                  className={cn(
                    "flex-1 bg-muted/20 rounded-[32px] p-3 space-y-3 border transition-all duration-300 backdrop-blur-sm min-h-[500px]",
                    isDragOver ? "border-primary border-2 border-dashed bg-primary/5 scale-[1.02]" : "border-border/50"
                  )}
                >
                  {columnServices.map(service => (
                    <div
                      key={service.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, service)}
                      onClick={() => handleServiceClick(service)}
                      className={cn(
                        "bg-card p-4 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group",
                        draggedService?.id === service.id && "opacity-40 grayscale blur-[1px]"
                      )}
                    >
                      <h4 className="font-bold text-sm text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                        {service.client?.name || service.client_name || 'Cliente vago'}
                      </h4>
                      <div className="flex flex-col gap-1 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground truncate italic">{service.location_link || 'Sem local'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-primary/60" />
                          <span className="text-[10px] font-bold text-foreground/80">
                            {service.technician_id ? (technicianNames[service.technician_id] || 'Piloto') : 'Sem piloto'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <Badge variant="outline" className="text-[9px] font-black h-5 px-1 bg-muted/30 border-none uppercase">
                          {service.display_code || (service.id ? `#${service.id.slice(0, 6)}` : '---')}
                        </Badge>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {safeFormatDate(service.created_at, "dd MMM")}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {columnServices.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center opacity-30 gap-2">
                      <div className={cn("w-8 h-8 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center", config.color.replace('bg-', 'text-'))} />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DroneServiceModal
        service={selectedService}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={refetch}
      />
    </div>
  );
}

