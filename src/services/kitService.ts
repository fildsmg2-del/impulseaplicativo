import { supabase } from '@/integrations/supabase/client';

export type SystemType = 'on_grid' | 'hibrido' | 'off_grid';

export interface KitItem {
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  power_w?: number;
}

export interface Kit {
  id: string;
  name: string;
  description?: string;
  system_type: SystemType;
  total_power_kwp: number;
  min_consumption_kwh?: number;
  max_consumption_kwh?: number;
  min_area_m2?: number;
  max_area_m2?: number;
  cost_price: number;
  sale_price: number;
  items: KitItem[];
  active: boolean;
  distributor_name?: string;
  kit_code?: string;
  topology?: string;
  include_structures?: boolean;
  include_transformer?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKitData {
  name: string;
  description?: string;
  system_type: SystemType;
  total_power_kwp: number;
  min_consumption_kwh?: number;
  max_consumption_kwh?: number;
  min_area_m2?: number;
  max_area_m2?: number;
  cost_price: number;
  sale_price: number;
  items: KitItem[];
  active?: boolean;
  distributor_name?: string;
  kit_code?: string;
  topology?: string;
  include_structures?: boolean;
  include_transformer?: boolean;
}

const parseKitItems = (items: unknown): KitItem[] => {
  if (Array.isArray(items)) {
    return items as KitItem[];
  }
  return [];
};

export const kitService = {
  async getAll(): Promise<Kit[]> {
    const { data, error } = await supabase
      .from('kits')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(kit => ({
      ...kit,
      items: parseKitItems(kit.items),
    })) as Kit[];
  },

  async getById(id: string): Promise<Kit | null> {
    const { data, error } = await supabase
      .from('kits')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      items: parseKitItems(data.items),
    } as Kit;
  },

  async create(kit: CreateKitData): Promise<Kit> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('kits')
      .insert({
        name: kit.name,
        description: kit.description,
        system_type: kit.system_type,
        total_power_kwp: kit.total_power_kwp,
        min_consumption_kwh: kit.min_consumption_kwh,
        max_consumption_kwh: kit.max_consumption_kwh,
        min_area_m2: kit.min_area_m2,
        max_area_m2: kit.max_area_m2,
        cost_price: kit.cost_price,
        sale_price: kit.sale_price,
        items: JSON.parse(JSON.stringify(kit.items)),
        active: kit.active ?? true,
        distributor_name: kit.distributor_name,
        kit_code: kit.kit_code,
        topology: kit.topology,
        include_structures: kit.include_structures,
        include_transformer: kit.include_transformer,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      items: parseKitItems(data.items),
    } as Kit;
  },

  async update(id: string, kit: Partial<CreateKitData>): Promise<Kit> {
    const updateData: Record<string, unknown> = {};
    
    if (kit.name !== undefined) updateData.name = kit.name;
    if (kit.description !== undefined) updateData.description = kit.description;
    if (kit.system_type !== undefined) updateData.system_type = kit.system_type;
    if (kit.total_power_kwp !== undefined) updateData.total_power_kwp = kit.total_power_kwp;
    if (kit.min_consumption_kwh !== undefined) updateData.min_consumption_kwh = kit.min_consumption_kwh;
    if (kit.max_consumption_kwh !== undefined) updateData.max_consumption_kwh = kit.max_consumption_kwh;
    if (kit.min_area_m2 !== undefined) updateData.min_area_m2 = kit.min_area_m2;
    if (kit.max_area_m2 !== undefined) updateData.max_area_m2 = kit.max_area_m2;
    if (kit.cost_price !== undefined) updateData.cost_price = kit.cost_price;
    if (kit.sale_price !== undefined) updateData.sale_price = kit.sale_price;
    if (kit.items !== undefined) updateData.items = JSON.parse(JSON.stringify(kit.items));
    if (kit.active !== undefined) updateData.active = kit.active;
    if (kit.distributor_name !== undefined) updateData.distributor_name = kit.distributor_name;
    if (kit.kit_code !== undefined) updateData.kit_code = kit.kit_code;
    if (kit.topology !== undefined) updateData.topology = kit.topology;
    if (kit.include_structures !== undefined) updateData.include_structures = kit.include_structures;
    if (kit.include_transformer !== undefined) updateData.include_transformer = kit.include_transformer;
    
    const { data, error } = await supabase
      .from('kits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      items: parseKitItems(data.items),
    } as Kit;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('kits')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getActive(): Promise<Kit[]> {
    const { data, error } = await supabase
      .from('kits')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return (data || []).map(kit => ({
      ...kit,
      items: parseKitItems(kit.items),
    })) as Kit[];
  },

  // Filter kits by criteria
  filterKits(
    kits: Kit[],
    filters: {
      systemType?: SystemType;
      searchBy?: 'consumo' | 'potencia' | 'modulos' | 'area';
      searchValue?: number;
    }
  ): Kit[] {
    return kits.filter(kit => {
      // Filter by system type
      if (filters.systemType && kit.system_type !== filters.systemType) {
        return false;
      }

      // Filter by search criteria
      if (filters.searchBy && filters.searchValue) {
        const value = filters.searchValue;
        
        switch (filters.searchBy) {
          case 'consumo':
            if (kit.min_consumption_kwh && value < kit.min_consumption_kwh) return false;
            if (kit.max_consumption_kwh && value > kit.max_consumption_kwh) return false;
            break;
          case 'potencia': {
            // Allow 20% tolerance
            const minPower = kit.total_power_kwp * 0.8;
            const maxPower = kit.total_power_kwp * 1.2;
            if (value < minPower || value > maxPower) return false;
            break;
          }
          case 'modulos': {
            const moduleCount = kit.items.filter(i => i.category === 'MODULO').reduce((sum, i) => sum + i.quantity, 0);
            if (value !== moduleCount) return false;
            break;
          }
          case 'area':
            if (kit.min_area_m2 && value < kit.min_area_m2) return false;
            if (kit.max_area_m2 && value > kit.max_area_m2) return false;
            break;
        }
      }

      return true;
    });
  },
};
