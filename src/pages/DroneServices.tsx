import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Search, Plus, List, LayoutGrid, Calendar, 
  Loader2, Filter, ChevronRight, MoreHorizontal, Clock,
  CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
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

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['drone-services'],
    queryFn: droneService.getAll,
  });

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.client?.name?.toLowerCase().includes(search.toLowerCase()) || 
                         s.location?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleServiceClick = (service: DroneService) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  const statusConfig: Record<DroneServiceStatus, { label: string; color: string; icon: any }> = {
    'PENDENTE': { label: 'Pendente', color: 'bg-amber-500', icon: Clock },
    'EM_ANALISE': { label: 'Análise', color: 'bg-blue-500', icon: Activity },
    'CONCLUIDA': { label: 'Concluída', color: 'bg-green-500', icon: CheckCircle2 },
    'CANCELADA': { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Activity className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Serviços Drone</h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Gerenciamento e acompanhamento de ordens de serviço de drone
          </p>
        </div>

        <div className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-2xl border border-border">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn("rounded-xl h-9", viewMode === 'list' && "shadow-sm bg-background")}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className={cn("rounded-xl h-9", viewMode === 'kanban' && "shadow-sm bg-background")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </div>
      </div>

      {/* Filters & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por cliente ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-12 bg-card border-border rounded-2xl focus:ring-primary/20 transition-all"
            />
          </div>
          
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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold uppercase tracking-widest">Sincronizando dados...</p>
        </div>
      ) : filteredServices.length === 0 ? (
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
            onClick={() => { setSearch(''); setStatusFilter(null); }}
            className="rounded-2xl"
          >
            Limpar Filtros
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-5 duration-700">
          {filteredServices.map((service) => {
            const config = statusConfig[service.status];
            const StatusIcon = config.icon;
            
            return (
              <div
                key={service.id}
                onClick={() => handleServiceClick(service)}
                className="group relative bg-card rounded-[32px] border border-border p-6 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                {/* Status Indicator */}
                <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 blur-2xl transition-all duration-500 group-hover:scale-150", config.color)} />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className={cn("p-3 rounded-2xl text-white shadow-lg", config.color)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="bg-muted font-bold tracking-tight">
                    #{service.id.slice(0, 8)}
                  </Badge>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {service.client?.name || 'Cliente não vinculado'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium truncate">{service.location || 'Local não informado'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Status</span>
                      <span className={cn("text-sm font-bold", config.color.replace('bg-', 'text-'))}>{config.label}</span>
                    </div>
                    <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Data</span>
                      <span className="text-sm font-bold text-foreground">
                        {format(new Date(service.created_at), "dd/MM/yy")}
                      </span>
                    </div>
                  </div>

                  <Button className="w-full rounded-2xl bg-muted hover:bg-primary hover:text-white text-foreground border-none shadow-none mt-2 group/btn font-bold transition-all duration-300">
                    Ver Detalhes
                    <ChevronRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px] overflow-x-auto pb-4 no-scrollbar">
          {Object.entries(statusConfig).map(([statusKey, config]) => {
            const columnServices = filteredServices.filter(s => s.status === statusKey);
            const StatusIcon = config.icon;
            
            return (
              <div key={statusKey} className="flex flex-col gap-4 min-w-[280px]">
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
                
                <div className="flex-1 bg-muted/20 rounded-[32px] p-3 space-y-3 border border-border/50 backdrop-blur-sm">
                  {columnServices.map(service => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceClick(service)}
                      className="bg-card p-4 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                    >
                      <h4 className="font-bold text-sm text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                        {service.client?.name || 'Cliente vago'}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground truncate italic">{service.location || 'Sem local'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <Badge variant="outline" className="text-[9px] font-black h-5 px-1 bg-muted/30 border-none uppercase">
                          #{service.id.slice(0, 6)}
                        </Badge>
                        <span className="text-[9px] font-bold text-muted-foreground">
                          {format(new Date(service.created_at), "dd MMM", { locale: ptBR })}
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
