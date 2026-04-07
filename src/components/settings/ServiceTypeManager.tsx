import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { serviceTypeService, ServiceType, CreateServiceTypeData, ServiceTypeChecklistItem } from '@/services/serviceTypeService';

interface ServiceTypeManagerProps {
  isMaster: boolean;
}

export function ServiceTypeManager({ isMaster }: ServiceTypeManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<CreateServiceTypeData>({
    name: '',
    deadline_days: 5,
    active: true,
    checklist_template: [],
  });

  const queryClient = useQueryClient();

  const { data: serviceTypes = [], isLoading } = useQuery({
    queryKey: ['serviceTypes'],
    queryFn: serviceTypeService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: serviceTypeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
      toast.success('Tipo de serviço criado com sucesso!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar tipo de serviço');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateServiceTypeData> }) =>
      serviceTypeService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
      toast.success('Tipo de serviço atualizado!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar tipo de serviço');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: serviceTypeService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceTypes'] });
      toast.success('Tipo de serviço excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir tipo de serviço');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', deadline_days: 5, active: true, checklist_template: [] });
    setEditingType(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (type: ServiceType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      deadline_days: type.deadline_days,
      active: type.active,
      checklist_template: type.checklist_template ?? [],
    });
    setIsDialogOpen(true);
  };

  const updateChecklistItem = (
    index: number,
    field: keyof ServiceTypeChecklistItem,
    value: string,
  ) => {
    setFormData((prev) => {
      const checklist_template = [...(prev.checklist_template ?? [])];
      checklist_template[index] = { ...checklist_template[index], [field]: value };
      return { ...prev, checklist_template };
    });
  };

  const addChecklistItem = () => {
    setFormData((prev) => ({
      ...prev,
      checklist_template: [...(prev.checklist_template ?? []), { id: '', label: '' }],
    }));
  };

  const removeChecklistItem = (index: number) => {
    setFormData((prev) => {
      const checklist_template = [...(prev.checklist_template ?? [])];
      checklist_template.splice(index, 1);
      return { ...prev, checklist_template };
    });
  };

  const moveChecklistItem = (index: number, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const checklist_template = [...(prev.checklist_template ?? [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= checklist_template.length) {
        return prev;
      }
      const [item] = checklist_template.splice(index, 1);
      checklist_template.splice(targetIndex, 0, item);
      return { ...prev, checklist_template };
    });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Tipos de Serviço</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os tipos de serviço e seus prazos de execução
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          disabled={!isMaster}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {!isMaster && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Apenas usuários MASTER podem editar os tipos de serviço.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Prazo (dias)</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serviceTypes.map((type) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium">{type.name}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {type.deadline_days} dias
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    type.active 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {type.active ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(type)}
                      disabled={!isMaster}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTypeToDelete(type)}
                      disabled={!isMaster}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Manutenção Preventiva"
                disabled={!isMaster}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo para Execução (dias)</Label>
              <Input
                type="number"
                min="1"
                value={formData.deadline_days}
                onChange={(e) => setFormData({ ...formData, deadline_days: parseInt(e.target.value) || 5 })}
                disabled={!isMaster}
              />
              <p className="text-xs text-muted-foreground">
                A OS será considerada vencida após este período
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChecklistItem}
                  disabled={!isMaster}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar item
                </Button>
              </div>
              <div className="space-y-3">
                {(formData.checklist_template ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum item configurado.</p>
                )}
                {(formData.checklist_template ?? []).map((item, index) => (
                  <div key={`service-type-checklist-${index}`} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                    <Input
                      placeholder="ID"
                      value={item.id}
                      onChange={(event) => updateChecklistItem(index, 'id', event.target.value)}
                      disabled={!isMaster}
                    />
                    <Input
                      placeholder="Descrição"
                      value={item.label}
                      onChange={(event) => updateChecklistItem(index, 'label', event.target.value)}
                      disabled={!isMaster}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveChecklistItem(index, 'up')}
                        disabled={!isMaster || index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                      onClick={() => moveChecklistItem(index, 'down')}
                      disabled={!isMaster || index === (formData.checklist_template ?? []).length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChecklistItem(index)}
                        disabled={!isMaster}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                disabled={!isMaster}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!isMaster}>
              {editingType ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Tipo de Serviço</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o tipo "{typeToDelete?.name}"? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              if (typeToDelete) deleteMutation.mutate(typeToDelete.id);
              setTypeToDelete(null);
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
