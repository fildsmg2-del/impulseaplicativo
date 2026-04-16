import { queryClient } from '@/App';
import { IS_NATIVE_APP } from '@/lib/platform';
import { serviceOrderService } from '@/services/serviceOrderService';
import { droneService } from '@/services/droneService';
import { clientService } from '@/services/clientService';
import { supplierService } from '@/services/supplierService';
import { projectService } from '@/services/projectService';
import { serviceTypeService } from '@/services/serviceTypeService';
import { accountService } from '@/services/accountService';
import { costCenterService } from '@/services/costCenterService';
import { getUsers } from '@/services/userService';
import { Network } from '@capacitor/network';
import { offlineDB } from '@/lib/offline-db';
import { supabase } from '@/integrations/supabase/client';
import { fetchDashboardSummary } from '@/services/dashboardService';

/**
 * SyncService
 * Responsável por pré-carregar dados críticos no cache do Android
 * para garantir que estejam disponíveis offline.
 */
export const syncService = {
  isSyncing: false,

  async initSyncListener() {
    if (!IS_NATIVE_APP) return;

    console.log('[SyncService] Inicializando Network Listener...');
    
    // Process queue on startup
    this.processOfflineQueue();

    // Re-process on reconnection
    Network.addListener('networkStatusChange', (status) => {
      console.log('[SyncService] Status de rede alterado:', status);
      if (status.connected) {
        this.processOfflineQueue();
      }
    });
  },

  async processOfflineQueue() {
    if (this.isSyncing) return;
    
    const queue = await offlineDB.getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncService] Processando fila offline: ${queue.length} item(s)`);
    this.isSyncing = true;

    for (const item of queue) {
      try {
        console.log(`[SyncService] Sincronizando item ${item.id} (${item.method} ${item.url})`);
        
        // Use Supabase fetch to re-run the request
        // Since customOfflineFetch is global, we need a way to bypass it or ensure it sees us as online
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;

        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            ...item.headers,
            'Authorization': token ? `Bearer ${token}` : '',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: item.body
        });

        if (response.ok) {
          console.log(`[SyncService] Item ${item.id} sincronizado com sucesso.`);
          await offlineDB.removeFromQueue(item.id);
        } else {
          const errorText = await response.text();
          console.error(`[SyncService] Erro ao sincronizar item ${item.id}:`, errorText);
          await offlineDB.incrementRetry(item.id);
        }
      } catch (error) {
        console.error(`[SyncService] Falha na rede ao processar item ${item.id}:`, error);
        break; // Stop processing if we lost connection again
      }
    }

    // After syncing, invalidate queries to refresh UI
    await queryClient.invalidateQueries();
    
    this.isSyncing = false;
    console.log('[SyncService] Processamento de fila concluído.');
  },

  async prefetchCriticalData() {
    // Prefetch critical data to ensure lists are ready across all platforms
    // (Android uses local cache, Web uses memory cache)

    console.log('[SyncService] Iniciando pré-carregamento de dados críticos...');

    try {
      // 1. Carregar Ordens de Serviço (Geral)
      await queryClient.prefetchQuery({
        queryKey: ['service-orders'],
        queryFn: () => serviceOrderService.getAll(),
      });

      // 2. Carregar OS de Drone
      await queryClient.prefetchQuery({
        queryKey: ['drone-services'],
        queryFn: () => droneService.getAll(),
      });

      // 3. Carregar Clientes
      await queryClient.prefetchQuery({
        queryKey: ['clients'],
        queryFn: () => clientService.getAll(),
      });

      // 4. Carregar Fornecedores
      await queryClient.prefetchQuery({
        queryKey: ['suppliers'],
        queryFn: () => supplierService.getAll(),
      });

      // 5. Carregar Projetos
      await queryClient.prefetchQuery({
        queryKey: ['projects-all'],
        queryFn: () => projectService.getAll(),
      });

      // 6. Carregar Tipos de Serviço (OS)
      await queryClient.prefetchQuery({
        queryKey: ['service-types-active'],
        queryFn: () => serviceTypeService.getActive(),
      });

      // 7. Carregar Contas Bancárias
      await queryClient.prefetchQuery({
        queryKey: ['accounts-active'],
        queryFn: () => accountService.getActive(),
      });

      // 8. Carregar Centros de Custo
      await queryClient.prefetchQuery({
        queryKey: ['cost-centers'],
        queryFn: () => costCenterService.getAll(),
      });

      // 9. Carregar Usuários/Técnicos
      await queryClient.prefetchQuery({
        queryKey: ['users'],
        queryFn: () => getUsers(),
      });

      // 10. Carregar Resumo do Dashboard (Baseado no usuário logado)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Precisamos extrair o role do perfil cacheado ou do banco
        const { data: profile } = await supabase.from('profiles').select('id, email').eq('id', session.user.id).single();
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
        
        if (profile && roleData) {
          await queryClient.prefetchQuery({
            queryKey: ['dashboard-summary', profile.id, roleData.role],
            queryFn: () => fetchDashboardSummary(roleData.role, profile.id),
          });
        }
      }

      console.log('[SyncService] Pré-carregamento concluído com sucesso.');
    } catch (error) {
      console.error('[SyncService] Erro ao pré-carregar dados:', error);
    }
  }
};
