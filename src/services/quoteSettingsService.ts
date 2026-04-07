import { supabase } from "@/integrations/supabase/client";

const LABOR_COST_PER_PANEL_KEY = 'LABOR_COST_PER_PANEL';
const DEFAULT_TARIFF_KEY = 'DEFAULT_TARIFF';
const DEFAULT_FIO_B_KEY = 'DEFAULT_FIO_B';

const DEFAULT_LABOR_COST_PER_PANEL = 150;
const DEFAULT_TARIFF = 0.85;
const DEFAULT_FIO_B = 0.25721;

export interface QuoteSettings {
  laborCostPerPanel: number;
  defaultTariff: number;
  defaultFioB: number;
}

const upsertSetting = async (key: string, value: number, description: string) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user) {
    console.error('User not authenticated:', userError);
    throw new Error('Usuário não autenticado');
  }

  const { data: existing, error: selectError } = await supabase
    .from("api_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (selectError) {
    console.error('Error checking existing setting:', selectError);
    throw selectError;
  }

  if (existing) {
    const { error } = await supabase
      .from("api_settings")
      .update({
        value: value.toString(),
        updated_by: userData.user.id
      })
      .eq("key", key);

    if (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
    return;
  }

  const { error } = await supabase
    .from("api_settings")
    .insert({
      key,
      value: value.toString(),
      description,
      category: 'orcamento',
      is_secret: false,
      updated_by: userData.user.id
    });

  if (error) {
    console.error('Error inserting setting:', error);
    throw error;
  }
};

export const quoteSettingsService = {
  async getLaborCostPerPanel(): Promise<number> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("value")
      .eq("key", LABOR_COST_PER_PANEL_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching labor cost per panel:', error);
      return DEFAULT_LABOR_COST_PER_PANEL;
    }
    
    return data?.value ? parseFloat(data.value) : DEFAULT_LABOR_COST_PER_PANEL;
  },

  async getDefaultTariff(): Promise<number> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("value")
      .eq("key", DEFAULT_TARIFF_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default tariff:', error);
      return DEFAULT_TARIFF;
    }

    return data?.value ? parseFloat(data.value) : DEFAULT_TARIFF;
  },

  async getDefaultFioB(): Promise<number> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("value")
      .eq("key", DEFAULT_FIO_B_KEY)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default fio b:', error);
      return DEFAULT_FIO_B;
    }

    return data?.value ? parseFloat(data.value) : DEFAULT_FIO_B;
  },

  async setLaborCostPerPanel(value: number): Promise<void> {
    await upsertSetting(
      LABOR_COST_PER_PANEL_KEY,
      value,
      'Custo de mão de obra por placa/módulo solar'
    );
  },

  async setDefaultTariff(value: number): Promise<void> {
    await upsertSetting(
      DEFAULT_TARIFF_KEY,
      value,
      'Tarifa padrão de energia (R$/kWh)'
    );
  },

  async setDefaultFioB(value: number): Promise<void> {
    await upsertSetting(
      DEFAULT_FIO_B_KEY,
      value,
      'Parcela Fio B padrão (R$/kWh)'
    );
  },

  async getSettings(): Promise<QuoteSettings> {
    const [laborCostPerPanel, defaultTariff, defaultFioB] = await Promise.all([
      this.getLaborCostPerPanel(),
      this.getDefaultTariff(),
      this.getDefaultFioB()
    ]);

    return { laborCostPerPanel, defaultTariff, defaultFioB };
  }
};
