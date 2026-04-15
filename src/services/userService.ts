import { supabase } from "@/integrations/supabase/client";

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS' | 'CONSULTOR_TEC_DRONE' | 'PILOTO';
  created_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS' | 'CONSULTOR_TEC_DRONE' | 'PILOTO';
}

export async function getUsers(): Promise<UserWithRole[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    throw profilesError;
  }

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    throw rolesError;
  }

  const usersWithRoles: UserWithRole[] = profiles.map(profile => {
    const userRole = roles.find(r => r.user_id === profile.id);
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatar_url,
      role: (userRole?.role || 'VENDEDOR') as 'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS' | 'CONSULTOR_TEC_DRONE' | 'PILOTO',
      created_at: profile.created_at
    };
  });

  return usersWithRoles;
}

export async function createUser(userData: CreateUserData): Promise<void> {
  // Get current session token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  // Call edge function to create user (uses admin API, won't affect current session)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/create-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to create user');
  }
}

export async function updateUserRole(userId: string, role: 'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS' | 'CONSULTOR_TEC_DRONE' | 'PILOTO'): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function updateUserPassword(targetUserId: string, password: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/update-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        targetUserId,
        password,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to update user password');
  }
}

export async function deleteUser(userId: string): Promise<void> {
  // Delete user role first
  const { error: roleError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (roleError) {
    console.error('Error deleting user role:', roleError);
    throw roleError;
  }

  // Delete user profile
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    console.error('Error deleting user profile:', profileError);
    throw profileError;
  }
}
