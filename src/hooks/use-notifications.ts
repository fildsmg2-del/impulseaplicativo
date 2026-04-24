import { useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export const useNotifications = () => {
  useEffect(() => {
    // Only run on native platforms
    if (Capacitor.isNativePlatform()) {
      registerPush();
    }
  }, []);

  const registerPush = async () => {
    try {
      // Check for permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();

      // On success, we should be able to receive notifications
      await addListeners();
    } catch (error) {
      console.error('Error registering push notifications:', error);
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
