import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Lock, Save, Loader2, Camera, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { storageService } from '@/services/storageService';

export default function MyProfile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Nome atualizado com sucesso'
      });
    } catch (error) {
      console.error('Error updating name:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar nome',
        variant: 'destructive'
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos de senha',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive'
      });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso'
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao alterar senha';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor selecione uma imagem', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Faz o upload no R2 através da service
      const uploadResult = await storageService.upload(file, 'avatars');
      
      // Salva no supabase profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: uploadResult.url })
        .eq('id', user.id);

      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Foto de perfil atualizada! Recarregue a página para ver em todos os lugares.' });
      
      // Update local context just for visual trick (it requires a reload to full broadcast)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao enviar sua foto', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setUploadingAvatar(true);
    try {
      if (user.avatar_url) {
        // Remove old file from R2
        await storageService.delete(user.avatar_url).catch(e => console.error(e));
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;
      
      toast({ title: 'Sucesso', description: 'Foto de perfil removida com sucesso!' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Avatar removal failed:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao remover sua foto', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-impulse-gold" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Atualize seu nome de exibição
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-impulse-dark/10 dark:border-white/10 overflow-hidden shadow-lg flex items-center justify-center relative">
                  {user?.avatar_url ? (
                    <img src={user?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground opacity-50" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-impulse-gold animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 bg-impulse-gold text-impulse-dark p-2 rounded-xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                  <Camera className="h-4 w-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>
              <div className="text-center sm:text-left flex flex-col gap-2">
                <div>
                  <h3 className="text-sm font-bold">Foto de Exibição</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Formatos suportados: JPEG, PNG, WEBP. Clique no ícone da câmera para trocar.</p>
                </div>
                {user?.avatar_url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRemoveAvatar} 
                    disabled={uploadingAvatar} 
                    className="w-fit mt-1 h-8 text-xs text-destructive hover:bg-destructive/10 border-transparent shadow-none"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remover Foto
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Input
                value={user?.role || ''}
                disabled
                className="bg-muted"
              />
            </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveName} disabled={savingName}>
                  {savingName ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Nome
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-impulse-gold" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Defina uma nova senha para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
