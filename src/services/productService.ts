import { supabase } from '@/integrations/supabase/client';

export type ProductCategory = 'MODULO' | 'INVERSOR' | 'ESTRUTURA' | 'CABO' | 'CONECTOR' | 'OUTROS';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  sku?: string;
  brand?: string;
  model?: string;
  power_w?: number;
  unit: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  min_quantity: number;
  supplier_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  category: ProductCategory;
  sku?: string;
  brand?: string;
  model?: string;
  power_w?: number;
  unit?: string;
  cost_price: number;
  sale_price: number;
  quantity?: number;
  min_quantity?: number;
  supplier_id?: string;
  active?: boolean;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  reason?: string;
  project_id?: string;
  created_by?: string;
  created_at: string;
}

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as Product[];
  },

  async getById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Product | null;
  },

  async create(product: CreateProductData): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async update(id: string, product: Partial<CreateProductData>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addStock(productId: string, quantity: number, reason?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Add movement record
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        quantity,
        movement_type: 'entrada',
        reason,
        created_by: user?.id,
      });

    if (movementError) throw movementError;

    // Update product quantity
    const { data: product } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (product) {
      const { error } = await supabase
        .from('products')
        .update({ quantity: product.quantity + quantity })
        .eq('id', productId);

      if (error) throw error;
    }
  },

  async removeStock(productId: string, quantity: number, reason?: string, projectId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Add movement record
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        quantity: -quantity,
        movement_type: 'saida',
        reason,
        project_id: projectId,
        created_by: user?.id,
      });

    if (movementError) throw movementError;

    // Update product quantity
    const { data: product } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .single();

    if (product) {
      const { error } = await supabase
        .from('products')
        .update({ quantity: Math.max(0, product.quantity - quantity) })
        .eq('id', productId);

      if (error) throw error;
    }
  },

  async getMovements(productId?: string): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as StockMovement[];
  },

  async getLowStock(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .filter('quantity', 'lte', supabase.rpc ? 'min_quantity' : 10)
      .eq('active', true);

    if (error) throw error;
    // Filter low stock manually
    return ((data || []) as Product[]).filter(p => p.quantity <= p.min_quantity);
  },
};
