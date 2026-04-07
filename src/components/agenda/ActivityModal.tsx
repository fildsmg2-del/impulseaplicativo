import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ActivityInput } from "@/services/activityService";
import { clientService } from "@/services/clientService";
import { format } from "date-fns";

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: Activity | null;
  selectedDate: Date;
  onSave: (data: ActivityInput) => Promise<void>;
}

const ACTIVITY_TYPES = [
  { value: "REUNIAO", label: "Reunião" },
  { value: "VISITA", label: "Visita Técnica" },
  { value: "INSTALACAO", label: "Instalação" },
  { value: "MANUTENCAO", label: "Manutenção" },
  { value: "VISTORIA", label: "Vistoria" },
  { value: "LIGACAO", label: "Ligação" },
  { value: "OUTRO", label: "Outro" },
];

export function ActivityModal({ open, onOpenChange, activity, selectedDate, onSave }: ActivityModalProps) {
  const [formData, setFormData] = useState<ActivityInput>({
    title: "",
    description: "",
    activity_date: format(selectedDate, "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    activity_type: "REUNIAO",
    client_id: null,
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title,
        description: activity.description || "",
        activity_date: activity.activity_date,
        start_time: activity.start_time || "",
        end_time: activity.end_time || "",
        activity_type: activity.activity_type,
        client_id: activity.client_id,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        activity_date: format(selectedDate, "yyyy-MM-dd"),
        start_time: "",
        end_time: "",
        activity_type: "REUNIAO",
        client_id: null,
      });
    }
  }, [activity, selectedDate]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await clientService.getAll();
        setClients(data.map(c => ({ id: c.id, name: c.name })));
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };
    loadClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{activity ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity_type">Tipo</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity_date">Data *</Label>
              <Input
                id="activity_date"
                type="date"
                value={formData.activity_date}
                onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={formData.client_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Início</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time || ""}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Término</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time || ""}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
