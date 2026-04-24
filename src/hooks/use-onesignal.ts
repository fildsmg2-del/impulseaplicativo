import { useEffect } from 'react';
import OneSignal from 'onesignal-cordova-plugin';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/use-auth';

// COLOQUE SEU ONESIGNAL APP ID AQUI
const ONESIGNAL_APP_ID = '999c9123-d911-4715-b49c-4d9814772dd5';

export const useOneSignal = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initOneSignal = async () => {
      try {
        console.log('OneSignal: Inicializando...');
        
        // Inicializa o OneSignal
        OneSignal.initialize(ONESIGNAL_APP_ID);

        // Pede permissão (no Android 13+ isso abre a janelinha)
        OneSignal.Notifications.requestPermission(true).then((success) => {
          console.log('OneSignal: Permissão de notificação:', success);
        });

        // Vincular Usuário e Cargo se estiver logado
        if (user) {
          console.log(`OneSignal: Vinculando usuário ${user.id} e cargo ${user.role}`);
          
          // No SDK v5+, usamos login para setar o external_id
          OneSignal.login(user.id);
          
          // Define a tag de cargo para envios em grupo
          OneSignal.User.addTag('cargo', user.role);
        }

        // Ouvinte para quando uma notificação é recebida (app aberto)
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
          console.log('OneSignal: Notificação em foreground:', event);
        });

        // Ouvinte para quando o usuário clica na notificação
        OneSignal.Notifications.addEventListener('click', (event) => {
          console.log('OneSignal: Notificação clicada:', event);
        });

        console.log('OneSignal: Pronto!');
      } catch (e) {
        console.error('OneSignal: Erro na inicialização:', e);
      }
    };

    initOneSignal();
  }, [user]); // Re-executa se o usuário mudar (login/logout)

  return {};
};
