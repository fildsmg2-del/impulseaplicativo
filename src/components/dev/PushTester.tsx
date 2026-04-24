import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, User, Shield, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OneSignal from 'onesignal-cordova-plugin';
import { Capacitor } from '@capacitor/core';

interface UserProfile {
  id: string;
  name: string;
  role: string;
}

export function PushTester() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [osStatus, setOsStatus] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [targetId, setTargetId] = useState("");
  const [targetCargo, setTargetCargo] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      const { data: profiles } = await supabase.from('profiles').select('id, name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      
      const combined = profiles?.map(p => ({
        id: p.id,
        name: p.name,
        role: roles?.find(r => r.user_id === p.id)?.role || 'VENDEDOR'
      })) || [];
      
      setUsers(combined);
      setLoadingUsers(false);

      if (Capacitor.isNativePlatform()) {
        try {
          const id = await OneSignal.User.getExternalId();
          setOsStatus(id ? 'ok' : 'fail');
        } catch (e) {
          setOsStatus('fail');
        }
      } else {
        setOsStatus('ok'); // Simular OK na web para teste de fluxo
      }
    }
    fetchUsers();
  }, []);

  const handleManualRegister = async () => {
    if (!Capacitor.isNativePlatform()) return;
    setRegistering(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        OneSignal.login(user.id);
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        if (roleData) OneSignal.User.addTag('cargo', roleData.role);
        
        toast({ title: "Registro solicitado", description: "Verificando status em 3 segundos..." });
        setTimeout(async () => {
          const id = await OneSignal.User.getExternalId();
          setOsStatus(id ? 'ok' : 'fail');
        }, 3000);
      }
    } catch (e: any) {
      toast({ title: "Erro no registro", description: e.message, variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  };

  const handleSend = async () => {
    if (!title || !message || (!targetId && !targetCargo)) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          type: 'MANUAL',
          table: 'manual',
          manual_data: {
            user_id: targetId || null,
            cargo: targetCargo || null,
            title,
            message
          }
        }
      });

      if (error) throw error;

      toast({ title: "Mensagem enviada!", description: "O OneSignal processou o envio." });
      setMessage("");
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status do OneSignal */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {osStatus === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {osStatus === 'ok' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {osStatus === 'fail' && <XCircle className="h-5 w-5 text-destructive" />}
            <div>
              <p className="font-medium text-sm">
                Status OneSignal: {osStatus === 'ok' ? 'Conectado' : osStatus === 'fail' ? 'Não Identificado' : 'Verificando...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {osStatus === 'ok' ? 'Seu dispositivo está pronto para receber push.' : 'Clique em Sincronizar para vincular seu celular.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleManualRegister} disabled={registering}>
            <RefreshCw className={`h-4 w-4 mr-2 ${registering ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Destinatário Específico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> Enviar para Pessoa
            </CardTitle>
            <CardDescription>Escolha um usuário específico pelo nome</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={targetId} onValueChange={(val) => { setTargetId(val); setTargetCargo(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o usuário" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Por Cargo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Enviar por Cargo
            </CardTitle>
            <CardDescription>Todos os usuários com este cargo receberão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={targetCargo} onValueChange={(val) => { setTargetCargo(val); setTargetId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administradores</SelectItem>
                <SelectItem value="VENDEDOR">Vendedores</SelectItem>
                <SelectItem value="ENGENHEIRO">Engenheiros</SelectItem>
                <SelectItem value="TECNICO">Técnicos</SelectItem>
                <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                <SelectItem value="COMPRAS">Compras</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo da Mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Conteúdo da Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input 
              placeholder="Ex: Reunião Geral" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea 
              placeholder="Digite o conteúdo do push aqui..." 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button 
            className="w-full bg-impulse-gold hover:bg-impulse-gold/90 text-impulse-dark"
            onClick={handleSend}
            disabled={sending || loadingUsers}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Disparar Push Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
