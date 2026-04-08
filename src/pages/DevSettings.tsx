import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Key, Eye, EyeOff, Code, Settings2, Zap, MessageSquare, Calculator, Map, HardDrive, Monitor } from "lucide-react";
import { AuditLogViewer } from "@/components/dev/AuditLogViewer";
import { HealthBoard } from "@/components/dev/HealthBoard";
import { FeatureFlagManager } from "@/components/dev/FeatureFlagManager";
import { UserImpersonator } from "@/components/dev/UserImpersonator";
import { AnnouncementPanel } from "@/components/dev/AnnouncementPanel";
import { UserPresenceBoard } from "@/components/dev/UserPresenceBoard";
import { PwaSettings } from "@/components/dev/PwaSettings";
import { apiSettingsService, ApiSetting, ApiSettingInput } from "@/services/apiSettingsService";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  { value: "maps", label: "Mapas", icon: Map },
  { value: "energy", label: "Energia", icon: Zap },
  { value: "communication", label: "Comunicação", icon: MessageSquare },
  { value: "calculation", label: "Cálculos", icon: Calculator },
  { value: "notification", label: "Notificações", icon: MessageSquare },
  { value: "storage", label: "Armazenamento", icon: HardDrive },
  { value: "geral", label: "Geral", icon: Settings2 },
];

export default function DevSettings() {
  const [settings, setSettings] = useState<ApiSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ApiSetting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState<ApiSetting | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<ApiSettingInput>({
    key: "",
    value: "",
    description: "",
    category: "geral",
    is_secret: false,
  });
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiSettingsService.getAll();
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({ title: "Erro ao carregar configurações", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleOpenModal = (setting?: ApiSetting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        key: setting.key,
        value: setting.value || "",
        description: setting.description || "",
        category: setting.category,
        is_secret: setting.is_secret,
      });
    } else {
      setEditingSetting(null);
      setFormData({
        key: "",
        value: "",
        description: "",
        category: "geral",
        is_secret: false,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingSetting) {
        await apiSettingsService.update(editingSetting.id, formData);
        toast({ title: "Configuração atualizada com sucesso" });
      } else {
        await apiSettingsService.create(formData);
        toast({ title: "Configuração criada com sucesso" });
      }
      loadSettings();
      setModalOpen(false);
    } catch (error) {
      console.error("Error saving setting:", error);
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!settingToDelete) return;
    try {
      await apiSettingsService.delete(settingToDelete.id);
      toast({ title: "Configuração excluída com sucesso" });
      loadSettings();
    } catch (error) {
      console.error("Error deleting setting:", error);
      toast({ title: "Erro ao excluir configuração", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setSettingToDelete(null);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter((s) => s.category === category);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || Settings2;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Code className="h-6 w-6 text-impulse-gold" />
              Área DEV
            </h1>
            <p className="text-muted-foreground">Gerencie chaves de API e configurações do sistema</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Configuração
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2 scrollbar-none">
            <TabsList className="inline-flex w-auto md:w-full justify-start md:justify-center p-1 bg-muted/50 backdrop-blur-sm border border-white/5 shadow-premium">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="health">Monitoramento</TabsTrigger>
              <TabsTrigger value="flags">Feature Flags</TabsTrigger>
              <TabsTrigger value="announcements">Comunicados</TabsTrigger>
              <TabsTrigger value="presence">👥 Usuários Online</TabsTrigger>
              <TabsTrigger value="pwa">📱 PWA & Mobile</TabsTrigger>
              <TabsTrigger value="impersonate">Simulação</TabsTrigger>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>Monitoramento do Sistema</CardTitle>
                <CardDescription>Status das conexões e serviços externos</CardDescription>
              </CardHeader>
              <CardContent>
                <HealthBoard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flags">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciador de Funcionalidades</CardTitle>
                <CardDescription>Habilite ou desabilite módulos em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <FeatureFlagManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle>Comunicados em Tempo Real</CardTitle>
                <CardDescription>Envie mensagens instantâneas para todos os usuários logados</CardDescription>
              </CardHeader>
              <CardContent>
                <AnnouncementPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="presence">
            <Card>
              <CardHeader>
                <CardTitle>Usuários Online em Tempo Real</CardTitle>
                <CardDescription>Veja quem está com o sistema aberto agora e o que está fazendo</CardDescription>
              </CardHeader>
              <CardContent>
                <UserPresenceBoard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pwa">
            <PwaSettings />
          </TabsContent>

          <TabsContent value="impersonate">
            <Card>
              <CardHeader>
                <CardTitle>Simulador de Perfis</CardTitle>
                <CardDescription>Teste a interface com permissões de outros usuários</CardDescription>
              </CardHeader>
              <CardContent>
                <UserImpersonator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-impulse-gold" />
                  Logs de Auditoria
                </CardTitle>
                <CardDescription>
                  Acompanhe as ações realizadas pelos usuários no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogViewer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {CATEGORIES.map((category) => {
                const categorySettings = getSettingsByCategory(category.value);
                const Icon = category.icon;
                return (
                  <Card key={category.value}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-5 w-5 text-impulse-gold" />
                        {category.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categorySettings.length === 0 ? (
                        <p className="text-muted-foreground text-center py-2 text-sm">
                          Nenhuma configuração cadastrada
                        </p>
                      ) : (
                        categorySettings.map((setting) => (
                          <SettingRow
                            key={setting.id}
                            setting={setting}
                            isVisible={visibleSecrets.has(setting.id)}
                            onToggleVisibility={() => toggleSecretVisibility(setting.id)}
                            onEdit={() => handleOpenModal(setting)}
                            onDelete={() => {
                              setSettingToDelete(setting);
                              setDeleteDialogOpen(true);
                            }}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {CATEGORIES.map((category) => (
            <TabsContent key={category.value} value={category.value}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="h-5 w-5 text-impulse-gold" />
                    {category.label}
                  </CardTitle>
                  <CardDescription>
                    Configurações relacionadas a {category.label.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {getSettingsByCategory(category.value).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma configuração nesta categoria
                    </p>
                  ) : (
                    getSettingsByCategory(category.value).map((setting) => (
                      <SettingRow
                        key={setting.id}
                        setting={setting}
                        isVisible={visibleSecrets.has(setting.id)}
                        onToggleVisibility={() => toggleSecretVisibility(setting.id)}
                        onEdit={() => handleOpenModal(setting)}
                        onDelete={() => {
                          setSettingToDelete(setting);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? "Editar Configuração" : "Nova Configuração"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">Chave *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().replace(/\s/g, "_") })}
                placeholder="NOME_DA_CHAVE"
                disabled={!!editingSetting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                type={formData.is_secret ? "password" : "text"}
                value={formData.value || ""}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Valor da configuração"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da configuração"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_secret">Valor secreto (API Key)</Label>
              <Switch
                id="is_secret"
                checked={formData.is_secret}
                onCheckedChange={(checked) => setFormData({ ...formData, is_secret: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.key}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A configuração "{settingToDelete?.key}" será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

interface SettingRowProps {
  setting: ApiSetting;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SettingRow({ setting, isVisible, onToggleVisibility, onEdit, onDelete }: SettingRowProps) {
  const displayValue = setting.is_secret
    ? isVisible
      ? setting.value || "(vazio)"
      : "••••••••••••"
    : setting.value || "(vazio)";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
            {setting.key}
          </code>
          {setting.is_secret && (
            <Badge variant="outline" className="text-xs">
              <Key className="h-3 w-3 mr-1" />
              Secret
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{setting.description}</p>
        <p className="text-sm font-mono mt-1">
          {displayValue}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Atualizado em {format(new Date(setting.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {setting.is_secret && (
          <Button variant="ghost" size="icon" onClick={onToggleVisibility}>
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
