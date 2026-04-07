import { supabase } from "@/integrations/supabase/client";

export interface ApiSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  category: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ApiSettingInput {
  key: string;
  value?: string | null;
  description?: string | null;
  category: string;
  is_secret?: boolean;
}

export const apiSettingsService = {
  async getAll(): Promise<ApiSetting[]> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });

    if (error) throw error;
    return data as ApiSetting[];
  },

  async getByCategory(category: string): Promise<ApiSetting[]> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("*")
      .eq("category", category)
      .order("key", { ascending: true });

    if (error) throw error;
    return data as ApiSetting[];
  },

  async getByKey(key: string): Promise<ApiSetting | null> {
    const { data, error } = await supabase
      .from("api_settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    return data as ApiSetting | null;
  },

  async create(setting: ApiSettingInput): Promise<ApiSetting> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("api_settings")
      .insert({
        ...setting,
        updated_by: userData.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, setting: Partial<ApiSettingInput>): Promise<ApiSetting> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("api_settings")
      .update({
        ...setting,
        updated_by: userData.user?.id
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("api_settings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};
