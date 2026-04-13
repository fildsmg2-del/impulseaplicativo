import { queryClient } from '@/App'; // Precisa exportar o queryClient do App.tsx
import { IS_NATIVE_APP } from '@/lib/platform';
import { serviceOrderService } from '@/services/serviceOrderService';
import { droneService } from '@/services/droneService';
import { clientService } from '@/services/clientService';

/**
 * SyncService
 * Responsável por pré-carregar dados críticos no cache do Android
 * para garantir que estejam disponíveis offline.
 */
export const syncService = {
  async prefetchCriticalData() {
    if (!IS_NATIVE_APP) return;

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

      // 3. Carregar Clientes (Base básica)
      await queryClient.prefetchQuery({
        queryKey: ['clients'],
        queryFn: () => clientService.getAll(),
      });

      console.log('[SyncService] Pré-carregamento concluído com sucesso.');
    } catch (error) {
      console.error('[SyncService] Erro ao pré-carregar dados:', error);
    }
  }
};
