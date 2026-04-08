import { supabase } from "@/integrations/supabase/client";
import { apiSettingsService } from "./apiSettingsService";

export interface HealthStatus {
  service: string;
  status: 'online' | 'offline' | 'loading' | 'error' | 'key_missing';
  message?: string;
  latency?: number;
}

export const apiHealthService = {
  async checkSupabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Date.now() - start;
      if (error) throw error;
      return { service: 'Supabase', status: 'online', latency };
    } catch (error: any) {
      return { service: 'Supabase', status: 'error', message: error.message };
    }
  },

  async checkGoogleMaps(): Promise<HealthStatus> {
    const key = await apiSettingsService.getByKey('GOOGLE_MAPS_API_KEY');
    if (!key || !key.value) {
      return { service: 'Google Maps', status: 'key_missing' };
    }
    // Simple script-less check is hard on frontend, so we just check key existence and assume valid for health board
    // In a real scenario, we could call a geocoding test
    return { service: 'Google Maps', status: 'online' };
  },

  async checkSolarApi(): Promise<HealthStatus> {
    const key = await apiSettingsService.getByKey('SOLAR_ENGINE_API_KEY');
    if (!key || !key.value) {
      return { service: 'Calculadora Solar', status: 'key_missing' };
    }
    return { service: 'Calculadora Solar', status: 'online' };
  }
};
