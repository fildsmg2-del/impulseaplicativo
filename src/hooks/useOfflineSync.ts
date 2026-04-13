import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/lib/offline-db';
import { toast } from 'sonner';
import { IS_NATIVE_APP } from '@/lib/platform';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  const processQueue = useCallback(async () => {
    if (!IS_NATIVE_APP || isSyncing) return;
    setIsSyncing(true);

    try {
      const queue = await offlineDB.getQueue();
      if (queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`[Sync] Starting synchronization of ${queue.length} items...`);

      // 1. Get fresh token natively from Supabase to prevent unauthorized drops
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 2. Process logically sorted by timestamp (FIFO)
      for (const req of queue) {
        if (req.retryCount > 5) {
          console.warn(`[Sync] Dropping request ${req.id} after 5 retries.`);
          await offlineDB.removeFromQueue(req.id);
          continue;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

          // Re-assemble Headers using the new FRESH Token
          const syncHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Override with any specific headers safely stored, except old Auth
          };

          const response = await fetch(req.url, {
            method: req.method,
            headers: syncHeaders,
            body: req.body,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok || response.status >= 400 && response.status < 500) {
            // Success or Client Error (like bad request), we want to remove from queue
            // to avoid infinite retry for bad payloads (unless 401/403, but token is fresh)
            if (response.status === 401 || response.status === 403) {
                // Keep to retry maybe user needs to log in
                await offlineDB.incrementRetry(req.id);
            } else {
                await offlineDB.removeFromQueue(req.id);
            }
          } else {
            // 500 or other server errors: Increment and retry later
            await offlineDB.incrementRetry(req.id);
          }
        } catch (error) {
          // Network errors, aborts
          console.error(`[Sync] Request ${req.id} failed:`, error);
          await offlineDB.incrementRetry(req.id);
        }
      }

      // Check if anything is left
      const remaining = await offlineDB.getQueue();
      if (remaining.length === 0) {
        toast.success("Todos os dados off-line foram sincronizados com sucesso!");
      }

    } catch (err) {
      console.error("[Sync] Error during offline sync process", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (!IS_NATIVE_APP) return;

    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check just in case we started online with pending items
    if (window.navigator.onLine) {
       processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processQueue]);

  return { isOnline, isSyncing };
}
