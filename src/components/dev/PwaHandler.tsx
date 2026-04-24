import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * PwaHandler - Invisible global component.
 * Dynamically registers or unregisters the Service Worker based on the MODULE_PWA_ENABLED flag.
 */
export function PwaHandler() {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    // Initial fetch of the PWA flag
    const checkFlag = async () => {
      const { data } = await supabase
        .from('api_settings')
        .select('value')
        .eq('key', 'MODULE_PWA_ENABLED')
        .eq('category', 'feature_flag')
        .maybeSingle();
      
      setIsEnabled(data?.value === 'true');
    };

    checkFlag();

    // Subscribe to changes in api_settings to react in real-time
    const channel = supabase
      .channel('pwa-flag-monitor')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'api_settings',
          filter: "key=eq.MODULE_PWA_ENABLED",
        },
        (payload) => {
          const newValue = payload.new.value === 'true';
          setIsEnabled(newValue);
          
          if (newValue) {
            toast({
              title: "PWA Ativado",
              description: "O suporte offline e instalação foram habilitados.",
            });
          } else {
            toast({
              title: "PWA Desativado",
              description: "O suporte offline foi removido.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isEnabled === true) {
      console.log('PWA: Registering Service Worker...');
      const updateSW = registerSW({
        onNeedRefresh() {
          toast({
            title: "Nova Versão Disponível",
            description: "Clique para atualizar o sistema e receber as melhorias.",
            action: (
              <button 
                className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-xs font-bold"
                onClick={() => updateSW(true)}
              >
                Atualizar agora
              </button>
            ),
          });
        },
        onOfflineReady() {
          toast({
            title: "Pronto para usar Offline",
            description: "O sistema foi baixado e funcionará mesmo sem internet.",
          });
        },
      });
    } else if (isEnabled === false) {
      // Unregister service workers if PWA is disabled
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('PWA: Unregistered Service Worker');
          }
        });
      }
      
      // Force remove the manifest link to kill browser heuristics for installation
      const manifestNode = document.querySelector('link[rel="manifest"]');
      if (manifestNode) {
        manifestNode.parentNode?.removeChild(manifestNode);
        console.log('PWA: Removed manifest node to prevent installation prompt.');
      }
    }
  }, [isEnabled]);

  // Intercept the native install prompt event globally based on the flag
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // If it's explicitly disabled OR still loading, block the prompt
      if (isEnabled !== true) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isEnabled]);

  return null;
}
