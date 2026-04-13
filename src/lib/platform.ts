/**
 * Utilitário para detecção de plataforma
 * Ajuda a diferenciar se o app está rodando dentro do APK (Capacitor) 
 * ou em um navegador comum (PC/Mobile Browser).
 */

export const IS_NATIVE_APP = typeof window !== 'undefined' && 
                             (window as any).Capacitor?.isNativePlatform === true;

export const PLATFORM = IS_NATIVE_APP ? 'native' : 'web';

/**
 * Retorna true se estiver rodando em um dispositivo Android nativo
 */
export const isAndroid = () => {
  return IS_NATIVE_APP && (window as any).Capacitor?.getPlatform() === 'android';
};
