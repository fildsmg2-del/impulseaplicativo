import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { Building2, Users, Save, Plus, Pencil, Trash2, Loader2, Calculator, Wrench, ClipboardList, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCompanySettings, updateCompanySettings, CompanySettings } from '@/services/companySettingsService';
import { getUsers, updateUserRole, deleteUser, createUser, UserWithRole, CreateUserData } from '@/services/userService';
import { quoteSettingsService } from '@/services/quoteSettingsService';
import { ServiceTypeManager } from '@/components/settings/ServiceTypeManager';
import { ProjectChecklistTemplateManager } from '@/components/settings/ProjectChecklistTemplateManager';
import { FinancialAccountManager } from '@/components/settings/FinancialAccountManager';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';

export default function Settings() {
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const isMaster = hasRole(['MASTER', 'DEV']);
  const isDev = hasRole(['DEV']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingQuoteSettings, setSavingQuoteSettings] = useState(false);
  
  // Quote settings state
  const [laborCostPerPanel, setLaborCostPerPanel] = useState(150);
  const [defaultTariff, setDefaultTariff] = useState(0.85);
  const [defaultFioB, setDefaultFioB] = useState(0.25721);
  
  // Company settings state
  const [companyData, setCompanyData] = useState<Partial<CompanySettings>>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    website: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
  // Users state
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS'>('VENDEDOR');
  
  // New user form state
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    name: '',
    role: 'VENDEDOR'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settings, usersData, quoteSettings] = await Promise.all([
        getCompanySettings(),
        getUsers(),
        quoteSettingsService.getSettings()
      ]);
      
      if (settings) {
        setCompanyData(settings);
      }
      setUsers(usersData);
      setLaborCostPerPanel(quoteSettings.laborCostPerPanel);
      setDefaultTariff(quoteSettings.defaultTariff);
      setDefaultFioB(quoteSettings.defaultFioB);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const handleCompanyChange = (field: keyof CompanySettings, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await updateCompanySettings(companyData);
      toast({
        title: 'Sucesso',
        description: 'Dados da empresa salvos com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar dados da empresa',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuoteSettings = async () => {
    setSavingQuoteSettings(true);
    try {
      await Promise.all([
        quoteSettingsService.setLaborCostPerPanel(laborCostPerPanel),
        quoteSettingsService.setDefaultTariff(defaultTariff),
        quoteSettingsService.setDefaultFioB(defaultFioB)
      ]);
      toast({
        title: 'Sucesso',
        description: 'Configurações de orçamento salvas com sucesso'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações de orçamento',
        variant: 'destructive'
      });
    } finally {
      setSavingQuoteSettings(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsUserDialogOpen(true);
  };

  const handleSaveUserRole = async () => {
    if (!editingUser) return;
    
    try {
      await updateUserRole(editingUser.id, selectedRole);
      toast({
        title: 'Sucesso',
        description: 'Nível de acesso atualizado'
      });
      setIsUserDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar nível de acesso',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast({
        title: 'Sucesso',
        description: 'Usuário removido'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover usuário',
        variant: 'destructive'
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password || !newUserData.name) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setSavingUser(true);
    try {
      await createUser(newUserData);
      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso. Um email de confirmação foi enviado.'
      });
      setIsNewUserDialogOpen(false);
      setNewUserData({ email: '', password: '', name: '', role: 'VENDEDOR' });
      loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar usuário';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSavingUser(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'MASTER': return 'bg-primary text-primary-foreground';
      case 'DEV': return 'bg-purple-600 text-white';
      case 'ENGENHEIRO': return 'bg-blue-600 text-white';
      case 'FINANCEIRO': return 'bg-emerald-600 text-white';
      case 'TECNICO': return 'bg-cyan-600 text-white';
      case 'VENDEDOR': return 'bg-amber-500 text-white';
      case 'POS_VENDA': return 'bg-indigo-600 text-white';
      case 'COMPRAS': return 'bg-orange-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-2">
            <Calculator className="h-4 w-4" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="checklists" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Checklists
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="h-4 w-4" />
            Serviços
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Landmark className="h-4 w-4" />
            Contas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Estas informações serão exibidas nos PDFs de orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Razão Social</Label>
                  <Input
                    id="name"
                    value={companyData.name || ''}
                    onChange={(e) => handleCompanyChange('name', e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={companyData.cnpj || ''}
                    onChange={(e) => handleCompanyChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyData.email || ''}
                    onChange={(e) => handleCompanyChange('email', e.target.value)}
                    placeholder="contato@empresa.com.br"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyData.phone || ''}
                    onChange={(e) => handleCompanyChange('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companyData.website || ''}
                    onChange={(e) => handleCompanyChange('website', e.target.value)}
                    placeholder="www.empresa.com.br"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={companyData.zip_code || ''}
                      onChange={(e) => handleCompanyChange('zip_code', e.target.value)}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input
                      id="street"
                      value={companyData.street || ''}
                      onChange={(e) => handleCompanyChange('street', e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={companyData.number || ''}
                      onChange={(e) => handleCompanyChange('number', e.target.value)}
                      placeholder="000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={companyData.complement || ''}
                      onChange={(e) => handleCompanyChange('complement', e.target.value)}
                      placeholder="Sala, Andar..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={companyData.neighborhood || ''}
                      onChange={(e) => handleCompanyChange('neighborhood', e.target.value)}
                      placeholder="Bairro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={companyData.city || ''}
                      onChange={(e) => handleCompanyChange('city', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={companyData.state || ''}
                      onChange={(e) => handleCompanyChange('state', e.target.value)}
                      placeholder="UF"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCompany} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Orçamentos</CardTitle>
              <CardDescription>
                Defina os parâmetros padrão para cálculos de orçamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="laborCostPerPanel">Custo de Mão de Obra por Módulo (R$)</Label>
                  <Input
                    id="laborCostPerPanel"
                    type="number"
                    step="0.01"
                    value={laborCostPerPanel}
                    onChange={(e) => setLaborCostPerPanel(parseFloat(e.target.value) || 0)}
                    placeholder="150.00"
                    disabled={!isMaster}
                  />
                  <p className="text-xs text-muted-foreground">
                    Este valor será multiplicado pela quantidade de módulos para calcular automaticamente o custo de mão de obra nos orçamentos.
                  </p>
                  {!isMaster && (
                    <p className="text-xs text-muted-foreground">
                      Apenas usuários MASTER podem alterar os parâmetros de tarifa/fio B.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultTariff">Tarifa Padrão (R$/kWh)</Label>
                  <Input
                    id="defaultTariff"
                    type="number"
                    step="0.0001"
                    value={defaultTariff}
                    onChange={(e) => setDefaultTariff(parseFloat(e.target.value) || 0)}
                    placeholder="0.85"
                  />
                  <p className="text-xs text-muted-foreground">
                    Defina a tarifa sugerida para novos orçamentos. Ela pode ser ajustada em cada projeto, mas entra pré-preenchida.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultFioB">Fio B Padrão (R$/kWh)</Label>
                  <Input
                    id="defaultFioB"
                    type="number"
                    step="0.00001"
                    value={defaultFioB}
                    onChange={(e) => setDefaultFioB(parseFloat(e.target.value) || 0)}
                    placeholder="0.25721"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use este valor como referência para o componente Fio B quando a concessionária aplica cobrança separada.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border border-border">
                  <h4 className="font-medium text-foreground mb-2">Exemplo de Cálculo</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo por módulo:</span>
                      <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laborCostPerPanel)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exemplo: 10 módulos</span>
                      <span className="font-medium text-secondary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laborCostPerPanel * 10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exemplo: 20 módulos</span>
                      <span className="font-medium text-secondary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(laborCostPerPanel * 20)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveQuoteSettings} disabled={!isMaster || savingQuoteSettings}>
                  {savingQuoteSettings ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklists">
          <Card>
            <CardHeader>
              <CardTitle>Template de Checklist</CardTitle>
              <CardDescription>
                Personalize os itens por etapa e tipo de instalação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectChecklistTemplateManager isMaster={isMaster} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Ordens de Serviço</CardTitle>
              <CardDescription>
                Defina os tipos de serviço e seus prazos de execução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceTypeManager isMaster={isMaster} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuários do Sistema</CardTitle>
                  <CardDescription>
                    Gerencie os usuários e seus níveis de acesso
                  </CardDescription>
                </div>
                <Button onClick={() => setIsNewUserDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter(u => {
                      if (user?.role === 'MASTER') return u.role !== 'DEV';
                      return true;
                    })
                    .map((user) => (
                      <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeClass(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {user.name}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Contas Financeiras</CardTitle>
              <CardDescription>
                Configure seus bancos e caixas para lançamentos financeiros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialAccountManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nível de Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <p className="text-sm text-muted-foreground">{editingUser?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                  <SelectItem value="ENGENHEIRO">Engenheiro</SelectItem>
                  <SelectItem value="TECNICO">Técnico</SelectItem>
                  <SelectItem value="POS_VENDA">Pós-venda</SelectItem>
                  <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                  <SelectItem value="COMPRAS">Compras</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                  {isDev && <SelectItem value="DEV">Desenvolvedor</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUserRole}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={newUserData.role} onValueChange={(v) => setNewUserData({ ...newUserData, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                  <SelectItem value="ENGENHEIRO">Engenheiro</SelectItem>
                  <SelectItem value="TECNICO">Técnico</SelectItem>
                  <SelectItem value="POS_VENDA">Pós-venda</SelectItem>
                  <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                  <SelectItem value="COMPRAS">Compras</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                  {isDev && <SelectItem value="DEV">Desenvolvedor</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={savingUser}>
              {savingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
