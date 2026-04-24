import { useEffect } from 'react';
import OneSignal from 'onesignal-cordova-plugin';
import { Capacitor } from '@capacitor/core';

// COLOQUE SEU ONESIGNAL APP ID AQUI
const ONESIGNAL_APP_ID = 'SEU_ID_AQUI';

export const useOneSignal = () => {
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

        // Ouvinte para quando uma notificação é recebida (app aberto)
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
          console.log('OneSignal: Notificação em foreground:', event);
          // O OneSignal já mostra a notificação automaticamente se configurado
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
  }, []);

  // Função para associar o cargo do usuário (Tags)
  const setCargoTag = (cargo: string) => {
    if (!Capacitor.isNativePlatform()) return;
    console.log(`OneSignal: Definindo tag de cargo: ${cargo}`);
    OneSignal.User.addTag('cargo', cargo);
  };

  return { setCargoTag };
};
