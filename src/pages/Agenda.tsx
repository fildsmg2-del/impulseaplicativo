import { useState, useEffect, useCallback } from "react";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, FileText, Clock, User, CheckCircle2, ClipboardList } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { activityService, Activity, ActivityInput } from "@/services/activityService";
import { serviceOrderService, ServiceOrder } from "@/services/serviceOrderService";
import { ActivityModal } from "@/components/agenda/ActivityModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

const ACTIVITY_TYPES = [
  { value: "REUNIAO", label: "Reunião", color: "bg-blue-500" },
  { value: "VISITA", label: "Visita Técnica", color: "bg-green-500" },
  { value: "INSTALACAO", label: "Instalação", color: "bg-orange-500" },
  { value: "MANUTENCAO", label: "Manutenção", color: "bg-purple-500" },
  { value: "VISTORIA", label: "Vistoria", color: "bg-yellow-500" },
  { value: "LIGACAO", label: "Ligação", color: "bg-pink-500" },
  { value: "OUTRO", label: "Outro", color: "bg-gray-500" },
  { value: "OS", label: "Ordem de Serviço", color: "bg-teal-600" },
];

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  activity_type: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  completed: boolean;
  client?: { name: string } | null;
  isServiceOrder?: boolean;
  serviceOrderStatus?: string;
}

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [dayItems, setDayItems] = useState<AgendaItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isMaster = hasRole(["MASTER", "DEV"]);

  const loadMonthData = useCallback(async () => {
    try {
      const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
      const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");
      
      const [activitiesData, osData] = await Promise.all([
        activityService.getByDateRange(start, end),
        serviceOrderService.getAll(),
      ]);
      
      setActivities(activitiesData);
      setServiceOrders(osData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    }
  }, [selectedDate, toast]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  useEffect(() => {
    const activityItems: AgendaItem[] = activities
      .filter((a) => isSameDay(parseISO(a.activity_date), selectedDate))
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        activity_type: a.activity_type,
        activity_date: a.activity_date,
        start_time: a.start_time,
        end_time: a.end_time,
        completed: a.completed || false,
        client: a.client,
        isServiceOrder: false,
      }));

    const osItems: AgendaItem[] = serviceOrders
      .filter((os) => os.execution_date && isSameDay(parseISO(os.execution_date), selectedDate))
      .map((os) => ({
        id: os.id,
        title: `OS: ${os.service_type.substring(0, 50)}${os.service_type.length > 50 ? '...' : ''}`,
        description: os.notes,
        activity_type: 'OS',
        activity_date: os.execution_date!,
        start_time: null,
        end_time: null,
        completed: os.status === 'CONCLUIDO',
        client: os.client ? { name: os.client.name } : null,
        isServiceOrder: true,
        serviceOrderStatus: os.status,
      }));

    setDayItems([...activityItems, ...osItems]);
  }, [activities, serviceOrders, selectedDate]);

  const handleSave = async (data: ActivityInput) => {
    try {
      if (editingActivity) {
        await activityService.update(editingActivity.id, data);
        toast({ title: "Atividade atualizada com sucesso" });
      } else {
        await activityService.create(data);
        toast({ title: "Atividade criada com sucesso" });
      }
      loadMonthData();
      setEditingActivity(null);
    } catch (error) {
      console.error("Error saving activity:", error);
      toast({ title: "Erro ao salvar atividade", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!activityToDelete) return;
    try {
      await activityService.delete(activityToDelete.id);
      toast({ title: "Atividade excluída com sucesso" });
      loadMonthData();
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast({ title: "Erro ao excluir atividade", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  const handleToggleComplete = async (item: AgendaItem) => {
    if (item.isServiceOrder) {
      navigate('/service-orders');
      return;
    }
    try {
      await activityService.toggleComplete(item.id, !item.completed);
      loadMonthData();
    } catch (error) {
      console.error("Error toggling activity:", error);
    }
  };

  const getActivityTypeInfo = (type: string) => {
    return ACTIVITY_TYPES.find((t) => t.value === type) || ACTIVITY_TYPES[6];
  };

  const getDaysWithItems = () => {
    const dates: Date[] = [];
    activities.forEach((a) => {
      const date = parseISO(a.activity_date);
      if (!dates.some((d) => isSameDay(d, date))) {
        dates.push(date);
      }
    });
    serviceOrders.forEach((os) => {
      if (os.execution_date) {
        const date = parseISO(os.execution_date);
        if (!dates.some((d) => isSameDay(d, date))) {
          dates.push(date);
        }
      }
    });
    return dates;
  };

  const getOSStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      EM_ABERTO: 'Aberto',
      EM_TRATAMENTO: 'Tratamento',
      EM_EXECUCAO: 'Execução',
      CONCLUIDO: 'Concluído',
    };
    return labels[status] || status;
  };

  const generatePDF = async () => {
    try {
      let filteredActivities = activities;
      if (filterType !== "all") {
        filteredActivities = filteredActivities.filter((a) => a.activity_type === filterType);
      }
      if (filterStartDate) {
        filteredActivities = filteredActivities.filter((a) => a.activity_date >= filterStartDate);
      }
      if (filterEndDate) {
        filteredActivities = filteredActivities.filter((a) => a.activity_date <= filterEndDate);
      }

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório de Atividades", 20, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 30);
      if (filterType !== "all") {
        const typeInfo = getActivityTypeInfo(filterType);
        doc.text(`Tipo: ${typeInfo.label}`, 20, 36);
      }
      if (filterStartDate || filterEndDate) {
        doc.text(`Período: ${filterStartDate || "..."} a ${filterEndDate || "..."}`, 20, 42);
      }

      let yPos = 55;
      doc.setFontSize(9);
      filteredActivities.forEach((activity) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const typeInfo = getActivityTypeInfo(activity.activity_type);
        const status = activity.completed ? "[✓]" : "[ ]";
        const time = activity.start_time ? `${activity.start_time}${activity.end_time ? `-${activity.end_time}` : ""}` : "";
        doc.text(`${status} ${format(parseISO(activity.activity_date), "dd/MM/yyyy")} ${time} - ${typeInfo.label}: ${activity.title}`, 20, yPos);
        yPos += 5;
        if (activity.client?.name) {
          doc.text(`   Cliente: ${activity.client.name}`, 20, yPos);
          yPos += 5;
        }
        if (activity.description) {
          const desc = activity.description.substring(0, 80);
          doc.text(`   ${desc}${activity.description.length > 80 ? "..." : ""}`, 20, yPos);
          yPos += 5;
        }
        yPos += 3;
      });

      doc.save(`relatorio-atividades-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF gerado com sucesso" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const daysWithItems = getDaysWithItems();

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-muted-foreground">Gerencie suas atividades e compromissos</p>
          </div>
          <Button onClick={() => { setEditingActivity(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Atividade
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    hasActivity: daysWithItems,
                  }}
                  modifiersStyles={{
                    hasActivity: {
                      backgroundColor: "hsl(var(--primary) / 0.2)",
                      borderRadius: "50%",
                    },
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Exportar Relatório
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de Atividade</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {ACTIVITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">De</Label>
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Até</Label>
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={generatePDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar PDF
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                <Badge variant="secondary">{dayItems.length} item(ns)</Badge>
              </CardTitle>
              </CardHeader>
              <CardContent>
                {dayItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma atividade para este dia</p>
                    <Button
                      variant="link"
                      onClick={() => { setEditingActivity(null); setModalOpen(true); }}
                    >
                      Adicionar atividade
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayItems.map((item) => {
                      const typeInfo = getActivityTypeInfo(item.activity_type);
                      return (
                        <div
                          key={`${item.isServiceOrder ? 'os' : 'act'}-${item.id}`}
                          className={`p-4 rounded-lg border ${item.completed ? "opacity-60 bg-muted" : "bg-card"} ${item.isServiceOrder ? "border-l-4 border-l-teal-600" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {!item.isServiceOrder && (
                                <Checkbox
                                  checked={item.completed}
                                  onCheckedChange={() => handleToggleComplete(item)}
                                />
                              )}
                              {item.isServiceOrder && (
                                <ClipboardList className="h-5 w-5 text-teal-600 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className={`${typeInfo.color} text-white text-xs`}>
                                    {typeInfo.label}
                                  </Badge>
                                  {item.isServiceOrder && item.serviceOrderStatus && (
                                    <Badge variant="outline" className="text-xs">
                                      {getOSStatusLabel(item.serviceOrderStatus)}
                                    </Badge>
                                  )}
                                  {item.start_time && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {item.start_time}
                                      {item.end_time && ` - ${item.end_time}`}
                                    </span>
                                  )}
                                  {item.completed && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <h4 className={`font-medium ${item.completed ? "line-through" : ""}`}>
                                  {item.title}
                                </h4>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {item.description}
                                  </p>
                                )}
                                {item.client?.name && (
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {item.client.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {item.isServiceOrder ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate('/service-orders')}
                                >
                                  Ver OS
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => { 
                                      const activity = activities.find(a => a.id === item.id);
                                      if (activity) {
                                        setEditingActivity(activity); 
                                        setModalOpen(true);
                                      }
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {isMaster && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => { 
                                        const activity = activities.find(a => a.id === item.id);
                                        if (activity) {
                                          setActivityToDelete(activity); 
                                          setDeleteDialogOpen(true);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ActivityModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        activity={editingActivity}
        selectedDate={selectedDate}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
