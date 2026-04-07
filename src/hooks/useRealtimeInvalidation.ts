import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that subscribes to Supabase Realtime changes on a table
 * and invalidates the corresponding React Query cache when changes occur.
 *
 * @param table - The Supabase table name to listen to
 * @param queryKeys - Array of query keys to invalidate when a change is detected
 */
export function useRealtimeInvalidation(table: string, queryKeys: string[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient]); // queryKeys intentionally not in deps to avoid re-subscribing
}
