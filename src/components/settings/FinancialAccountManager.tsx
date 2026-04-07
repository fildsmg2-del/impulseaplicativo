import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { accountService, FinancialAccount, CreateAccountData } from '@/services/accountService';
import { bankService } from '@/services/bankService';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export function FinancialAccountManager() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);
  const [formData, setFormData] = useState<CreateAccountData>({
    name: '',
    type: 'CORRENTE',
    initial_balance: 0,
    active: true,
    color: '#000000',
    bank_code: '',
    bank_name: '',
    agency: '',
    account_number: '',
    account_digit: '',
    person_type: 'PJ'
  });

  const loadAccounts = useCallback(async () => {
    try {
      const data = await accountService.getAll();
      setAccounts(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar contas financeiras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleOpenDialog = (account?: FinancialAccount) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type || 'CORRENTE',
        initial_balance: account.initial_balance || 0,
        active: account.active ?? true,
        color: account.color || '#000000',
        bank_code: account.bank_code || '',
        bank_name: account.bank_name || '',
        agency: account.agency || '',
        account_number: account.account_number || '',
        account_digit: account.account_digit || '',
        person_type: account.person_type || 'PJ'
      });
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        type: 'CORRENTE',
        initial_balance: 0,
        active: true,
        color: '#000000',
        bank_code: '',
        bank_name: '',
        agency: '',
        account_number: '',
        account_digit: '',
        person_type: 'PJ'
      });
    }
    setIsDialogOpen(true);
  };

  const handleBankLookup = async (code: string) => {
    if (!code) return;
    try {
      const bank = await bankService.getBankByCode(code);
      if (bank) {
        setFormData(prev => ({ ...prev, bank_name: bank.fullName || bank.name }));
        toast({ title: 'Banco Encontrado', description: bank.fullName || bank.name });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Aviso',
        description: 'O nome da conta é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        await accountService.update(editingAccount.id, formData);
        toast({ title: 'Sucesso', description: 'Conta atualizada com sucesso' });
      } else {
        await accountService.create(formData);
        toast({ title: 'Sucesso', description: 'Conta criada com sucesso' });
      }
      setIsDialogOpen(false);
      loadAccounts();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar conta',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account: FinancialAccount) => {
    setAccountToDelete(account);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      await accountService.delete(accountToDelete.id);
      toast({ title: 'Sucesso', description: 'Conta excluída com sucesso' });
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir conta',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-impulse-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Contas e Caixas</h3>
          <p className="text-sm text-muted-foreground">Gerencie seus bancos e caixas para lançamentos financeiros</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Saldo Inicial</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-impulse-gold" />
                {account.name}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{account.type}</Badge>
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.initial_balance || 0)}
              </TableCell>
              <TableCell>
                <Badge className={account.active ? 'bg-success' : 'bg-muted'}>
                  {account.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(account)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(account)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhuma conta cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Nome da Conta *</Label>
              <Input
                id="account-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Banco Itaú, Caixa Geral"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bank-code">Cód. Banco</Label>
                <Input
                  id="bank-code"
                  maxLength={3}
                  value={formData.bank_code || ''}
                  onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                  onBlur={(e) => handleBankLookup(e.target.value)}
                  placeholder="001, 237..."
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="bank-name">Nome do Banco</Label>
                <Input
                  id="bank-name"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Nome do banco preenchido auto."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-agency">Agência</Label>
                <Input
                  id="account-agency"
                  value={formData.agency || ''}
                  onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                  placeholder="Ex: 0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Conta e Dígito</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={formData.account_number || ''}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Conta"
                  />
                  <Input
                    className="w-16"
                    value={formData.account_digit || ''}
                    maxLength={2}
                    onChange={(e) => setFormData({ ...formData, account_digit: e.target.value })}
                    placeholder="D"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-type">Tipo de Conta</Label>
                <select
                  id="account-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.type || 'CORRENTE'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="CORRENTE">Conta Corrente</option>
                  <option value="POUPANCA">Poupança</option>
                  <option value="CAIXA">Caixa Físico</option>
                  <option value="INVESTIMENTO">Investimento</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="person-type">Tipo de Pessoa</Label>
                <select
                  id="person-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.person_type || 'PJ'}
                  onChange={(e) => setFormData({ ...formData, person_type: e.target.value })}
                >
                  <option value="PJ">Pessoa Jurídica (PJ)</option>
                  <option value="PF">Pessoa Física (PF)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-balance">Saldo Inicial (R$)</Label>
              <Input
                id="initial-balance"
                type="number"
                step="0.01"
                value={formData.initial_balance || 0}
                onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="account-active"
                checked={formData.active ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="account-active">Conta Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!accountToDelete} onOpenChange={(open) => !open && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "{accountToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
