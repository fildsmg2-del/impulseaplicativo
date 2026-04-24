import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const useNotifications = () => {
  console.log('Push: useNotifications hook initialized');
  useEffect(() => {
    // Only run on native platforms
    if (Capacitor.isNativePlatform()) {
      registerPush();
    }
  }, []);

  const registerPush = async () => {
    try {
      console.log('Push: Checking permissions...');
      // Check for permission
      let permStatus = await PushNotifications.checkPermissions();
      console.log('Push: Current permission status:', JSON.stringify(permStatus));

      if (permStatus.receive === 'prompt') {
        console.log('Push: Requesting permissions in 2 seconds...');
        // Add a small delay to ensure WebView is fully rendered
        await new Promise(resolve => setTimeout(resolve, 2000));
        permStatus = await PushNotifications.requestPermissions();
        console.log('Push: New permission status:', JSON.stringify(permStatus));
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push: Permission not granted');
        return;
      }

      console.log('Push: Registering device...');
      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
      console.log('Push: Registration command sent');

      // On success, we should be able to receive notifications
      await addListeners();
    } catch (error) {
      console.error('Push: Error in registerPush:', error);
    }
  };

  const addListeners = async () => {
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      // You can copy this token from the console to test in Firebase
      // Future: Send this token to your backend/Supabase
    });

    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration:', JSON.stringify(error));
    });

    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push received:', notification);
        toast.success(notification.title || 'Nova Notificação', {
          description: notification.body,
        });
      },
    );

    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push action performed:', notification);
        // Handle redirect or logic when user clicks the notification
      },
    );
  };
};
