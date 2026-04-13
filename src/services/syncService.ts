import { queryClient } from '@/App'; // Precisa exportar o queryClient do App.tsx
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

      console.log('[SyncService] Pré-carregamento concluído com sucesso.');
    } catch (error) {
      console.error('[SyncService] Erro ao pré-carregar dados:', error);
    }
  }
};
