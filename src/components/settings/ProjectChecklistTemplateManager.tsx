import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_PROJECT_CHECKLIST_TEMPLATE,
  DEFAULT_PROJECT_STAGES,
  InstallationType,
  ProjectChecklistTemplate,
  ProjectStatus,
  resolveChecklistTemplate,
} from '@/components/projects/projectStagesConfig';
import { projectChecklistTemplateService } from '@/services/projectChecklistTemplateService';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const INSTALLATION_TYPE_OPTIONS: { value: InstallationType; label: string }[] = [
  { value: 'URBANO', label: 'Urbano' },
  { value: 'RURAL', label: 'Rural' },
  { value: 'CNPJ', label: 'CNPJ' },
];

interface ProjectChecklistTemplateManagerProps {
  isMaster: boolean;
}

export function ProjectChecklistTemplateManager({ isMaster }: ProjectChecklistTemplateManagerProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<ProjectChecklistTemplate>(DEFAULT_PROJECT_CHECKLIST_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const data = await projectChecklistTemplateService.getTemplate();
        setTemplate(resolveChecklistTemplate(data));
      } catch (error) {
        console.error('Error loading project checklist template:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o template de checklist.',
          variant: 'destructive',
        });
        setTemplate(resolveChecklistTemplate(null));
      } finally {
        setLoading(false);
      }
    };

    void loadTemplate();
  }, [toast]);

  const updateStageChecklist = (
    stageKey: ProjectStatus,
    index: number,
    field: 'key' | 'label',
    value: string,
  ) => {
    setTemplate((prev) => {
      const stage = prev.stages[stageKey] ?? { checklist: [] };
      const checklist = [...(stage.checklist ?? [])];
      checklist[index] = { ...checklist[index], [field]: value };
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageKey]: {
            ...stage,
            checklist,
          },
        },
      };
    });
  };

  const updateVendasChecklist = (
    installationType: InstallationType,
    index: number,
    field: 'key' | 'label',
    value: string,
  ) => {
    setTemplate((prev) => {
      const vendasStage = prev.stages.VENDAS ?? { checklistByInstallationType: {} };
      const checklistByInstallationType = {
        ...vendasStage.checklistByInstallationType,
      } as NonNullable<typeof vendasStage.checklistByInstallationType>;
      const checklist = [...(checklistByInstallationType[installationType] ?? [])];
      checklist[index] = { ...checklist[index], [field]: value };
      return {
        ...prev,
        stages: {
          ...prev.stages,
          VENDAS: {
            ...vendasStage,
            checklistByInstallationType: {
              ...checklistByInstallationType,
              [installationType]: checklist,
            },
          },
        },
      };
    });
  };

  const addStageChecklistItem = (stageKey: ProjectStatus) => {
    setTemplate((prev) => {
      const stage = prev.stages[stageKey] ?? { checklist: [] };
      const checklist = [...(stage.checklist ?? []), { key: '', label: '' }];
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageKey]: {
            ...stage,
            checklist,
          },
        },
      };
    });
  };

  const addVendasChecklistItem = (installationType: InstallationType) => {
    setTemplate((prev) => {
      const vendasStage = prev.stages.VENDAS ?? { checklistByInstallationType: {} };
      const checklistByInstallationType = {
        ...vendasStage.checklistByInstallationType,
      } as NonNullable<typeof vendasStage.checklistByInstallationType>;
      const checklist = [...(checklistByInstallationType[installationType] ?? []), { key: '', label: '' }];
      return {
        ...prev,
        stages: {
          ...prev.stages,
          VENDAS: {
            ...vendasStage,
            checklistByInstallationType: {
              ...checklistByInstallationType,
              [installationType]: checklist,
            },
          },
        },
      };
    });
  };

  const removeStageChecklistItem = (stageKey: ProjectStatus, index: number) => {
    setTemplate((prev) => {
      const stage = prev.stages[stageKey] ?? { checklist: [] };
      const checklist = [...(stage.checklist ?? [])];
      checklist.splice(index, 1);
      return {
        ...prev,
        stages: {
          ...prev.stages,
          [stageKey]: {
            ...stage,
            checklist,
          },
        },
      };
    });
  };

  const removeVendasChecklistItem = (installationType: InstallationType, index: number) => {
    setTemplate((prev) => {
      const vendasStage = prev.stages.VENDAS ?? { checklistByInstallationType: {} };
      const checklistByInstallationType = {
        ...vendasStage.checklistByInstallationType,
      } as NonNullable<typeof vendasStage.checklistByInstallationType>;
      const checklist = [...(checklistByInstallationType[installationType] ?? [])];
      checklist.splice(index, 1);
      return {
        ...prev,
        stages: {
          ...prev.stages,
          VENDAS: {
            ...vendasStage,
            checklistByInstallationType: {
              ...checklistByInstallationType,
              [installationType]: checklist,
            },
          },
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectChecklistTemplateService.saveTemplate(template);
      toast({
        title: 'Sucesso',
        description: 'Template de checklist atualizado.',
      });
    } catch (error) {
      console.error('Error saving project checklist template:', { error, template });
      toast({
        title: 'Erro',
        description: `Não foi possível salvar o template de checklist. ${
          error instanceof Error ? error.message : 'Erro inesperado.'
        }`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-impulse-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isMaster && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Apenas usuários MASTER podem editar o template do checklist.
        </div>
      )}

      {DEFAULT_PROJECT_STAGES.map((stage) => {
        if (stage.key === 'VENDAS') {
          return (
            <Card key={stage.key}>
              <CardHeader>
                <CardTitle>{stage.label}</CardTitle>
                <CardDescription>Itens por tipo de instalação.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {INSTALLATION_TYPE_OPTIONS.map((type) => {
                  const items =
                    template.stages.VENDAS?.checklistByInstallationType?.[type.value] ?? [];
                  return (
                    <div key={type.value} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">{type.label}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addVendasChecklistItem(type.value)}
                          disabled={!isMaster}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar item
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {items.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Nenhum item configurado para este tipo.
                          </p>
                        )}
                        {items.map((item, index) => (
                          <div key={`${type.value}-${index}`} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                            <Input
                              placeholder="Chave"
                              value={item.key}
                              onChange={(event) =>
                                updateVendasChecklist(type.value, index, 'key', event.target.value)
                              }
                              disabled={!isMaster}
                            />
                            <Input
                              placeholder="Descrição"
                              value={item.label}
                              onChange={(event) =>
                                updateVendasChecklist(type.value, index, 'label', event.target.value)
                              }
                              disabled={!isMaster}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVendasChecklistItem(type.value, index)}
                              disabled={!isMaster}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Separator />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        }

        const items = template.stages[stage.key as ProjectStatus]?.checklist ?? [];
        return (
          <Card key={stage.key}>
            <CardHeader>
              <CardTitle>{stage.label}</CardTitle>
              <CardDescription>{stage.objective}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Itens do checklist</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addStageChecklistItem(stage.key as ProjectStatus)}
                  disabled={!isMaster}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar item
                </Button>
              </div>
              <div className="space-y-3">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum item configurado.</p>
                )}
                {items.map((item, index) => (
                  <div key={`${stage.key}-${index}`} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
                    <Input
                      placeholder="Chave"
                      value={item.key}
                      onChange={(event) =>
                        updateStageChecklist(stage.key as ProjectStatus, index, 'key', event.target.value)
                      }
                      disabled={!isMaster}
                    />
                    <Input
                      placeholder="Descrição"
                      value={item.label}
                      onChange={(event) =>
                        updateStageChecklist(stage.key as ProjectStatus, index, 'label', event.target.value)
                      }
                      disabled={!isMaster}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStageChecklistItem(stage.key as ProjectStatus, index)}
                      disabled={!isMaster}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!isMaster || saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Salvar template
        </Button>
      </div>
    </div>
  );
}
