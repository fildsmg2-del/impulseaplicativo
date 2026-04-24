import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Bell, Briefcase, DollarSign, Plane } from 'lucide-react';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    };

    // 1. Canal para Ordens de Serviço e Drone
    const osChannel = supabase
      .channel('realtime-os-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, (payload) => {
        const item = payload.new;
        if (item.assigned_to === user.id || item.assigned_role === user.role) {
          const isNew = payload.eventType === 'INSERT';
          toast.info(isNew ? 'Nova OS!' : 'OS Atualizada!', {
            description: `Uma nova OS de ${item.service_type || 'Serviço'} foi designada para você.`,
            icon: <Bell className="h-4 w-4" />,
            action: { label: 'Ver', onClick: () => window.location.href = '/service-orders' }
          });
          playNotificationSound();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drone_services' }, (payload) => {
        const item = payload.new;
        if (item.technician_id === user.id || item.assigned_role === user.role) {
          const isNew = payload.eventType === 'INSERT';
          toast.info(isNew ? 'Nova OS de Drone!' : 'OS de Drone Atualizada!', {
            description: 'Um novo serviço de drone foi designado para você.',
            icon: <Plane className="h-4 w-4" />,
            action: { label: 'Ver', onClick: () => window.location.href = '/drone' }
          });
          playNotificationSound();
        }
      })
      .subscribe();

    // 2. Canal para Projetos (Mudança de Setor)
    const projectChannel = supabase
      .channel('realtime-project-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        const item = payload.new;
        // Se o status (setor) do projeto coincide com o cargo do usuário
        if (item.status === user.role) {
          const action = payload.eventType === 'INSERT' ? 'chegou' : 'foi movido';
          toast.success('Projeto no seu Setor!', {
            description: `Um projeto ${action} para o setor ${item.status}.`,
            icon: <Briefcase className="h-4 w-4" />,
            action: { label: 'Ver Projeto', onClick: () => window.location.href = '/projects' }
          });
          playNotificationSound();
        }
      })
      .subscribe();

    // 3. Canal para Financeiro
    const financialChannel = supabase
      .channel('realtime-financial-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        const item = payload.new;
        // Se o usuário é do financeiro e houve alteração ou nova conta
        if (user.role === 'FINANCEIRO' || user.role === 'ADMIN' || user.role === 'DEV') {
          if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && item.status === 'ATRASADO')) {
            const title = item.status === 'ATRASADO' ? 'Conta Atrasada!' : 'Novo Lançamento!';
            toast.warning(title, {
              description: `${item.description}: R$ ${item.amount}`,
              icon: <DollarSign className="h-4 w-4" />,
              action: { label: 'Ver Financeiro', onClick: () => window.location.href = '/financial' }
            });
            playNotificationSound();
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(osChannel);
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(financialChannel);
    };
  }, [user]);
};
