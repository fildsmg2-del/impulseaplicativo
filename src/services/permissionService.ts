import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

export interface AppPermission {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

export interface PermissionService {
  getAllPermissions: () => Promise<AppPermission[]>;
  getRolePermissions: (role: UserRole) => Promise<string[]>;
  updateRolePermission: (role: UserRole, permissionId: string, enabled: boolean) => Promise<void>;
  getUserOverrides: (userId: string) => Promise<{ permission_id: string; enabled: boolean }[]>;
  updateUserOverride: (userId: string, permissionId: string, enabled: boolean | null) => Promise<void>;
}

export const permissionService: PermissionService = {
  async getAllPermissions() {
    const { data, error } = await supabase
      .from('app_permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getRolePermissions(role: UserRole) {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role', role);
    
    if (error) throw error;
    return (data || []).map(p => p.permission_id);
  },

  async updateRolePermission(role: UserRole, permissionId: string, enabled: boolean) {
    if (enabled) {
      const { error } = await supabase
        .from('role_permissions')
        .insert({ role, permission_id: permissionId });
      if (error && error.code !== '23505') throw error; // Ignore unique constraint error
    } else {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', role)
        .eq('permission_id', permissionId);
      if (error) throw error;
    }
  },

  async getUserOverrides(userId: string) {
    const { data, error } = await supabase
      .from('user_permissions_override')
      .select('permission_id, enabled')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  },

  async updateUserOverride(userId: string, permissionId: string, enabled: boolean | null) {
    if (enabled === null) {
      // Remove override
      const { error } = await supabase
        .from('user_permissions_override')
        .delete()
        .eq('user_id', userId)
        .eq('permission_id', permissionId);
      if (error) throw error;
    } else {
      // Upsert override
      const { error } = await supabase
        .from('user_permissions_override')
        .upsert({ user_id: userId, permission_id: permissionId, enabled });
      if (error) throw error;
    }
  }
};
