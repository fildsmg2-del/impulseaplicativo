import React, { useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { AuthContext, UserProfile } from '@/hooks/use-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [realUser, setRealUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    try {
      const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      if (profile) {
        const userRole = (roleData?.role as UserRole) || 'VENDEDOR';
        
        // Fetch permissions for this role and overrides for this user
        const [{ data: rolePerms }, { data: userPerms }] = await Promise.all([
          supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role', userRole),
          supabase
            .from('user_permissions_override')
            .select('permission_id, enabled')
            .eq('user_id', userId),
        ]);

        const effectivePermissions = new Set<string>();
        
        // 1. Add role defaults
        rolePerms?.forEach(p => effectivePermissions.add(p.permission_id));
        
        // 2. Apply overrides
        userPerms?.forEach(p => {
          if (p.enabled) {
            effectivePermissions.add(p.permission_id);
          } else {
            effectivePermissions.delete(p.permission_id);
          }
        });

        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: userRole,
          avatar_url: profile.avatar_url || undefined,
          created_at: profile.created_at,
          permissions: Array.from(effectivePermissions),
        });
      }
      setIsProfileLoaded(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setIsProfileLoaded(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id).then(() => {
              const savedImpersonation = sessionStorage.getItem('impersonated_user');
              const savedRealUser = sessionStorage.getItem('real_user');
              if (savedImpersonation && savedRealUser) {
                try {
                  const targetUser = JSON.parse(savedImpersonation);
                  const originalUser = JSON.parse(savedRealUser);
                  setUser(targetUser);
                  setRealUser(originalUser);
                } catch (e) {
                  console.error("Error restoring impersonation", e);
                }
              }
            });
          }, 0);
        } else {
          setUser(null);
          setRealUser(null);
          sessionStorage.removeItem('impersonated_user');
          sessionStorage.removeItem('real_user');
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error: Error | null }> => {
    try {
      setIsLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name: name },
        },
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRealUser(null);
    setSession(null);
    sessionStorage.removeItem('impersonated_user');
    sessionStorage.removeItem('real_user');
  };

  const impersonate = async (targetUser: UserProfile) => {
    if (!user || user.role !== 'DEV') return;
    
    // Guard checking if target user is valid
    if (!targetUser || !targetUser.id) {
      console.error("Invalid target user for impersonation");
      return;
    }

    const currentUser = realUser || user;
    
    try {
      // Fetch full profile including actual permissions from database for accurate simulation
      const [{ data: profile }, { data: roleData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUser.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUser.id)
          .maybeSingle(),
      ]);

      if (profile) {
        const userRole = (roleData?.role as UserRole) || 'VENDEDOR';
        
        const [{ data: rolePerms }, { data: userPerms }] = await Promise.all([
          supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role', userRole),
          supabase
            .from('user_permissions_override')
            .select('permission_id, enabled')
            .eq('user_id', targetUser.id),
        ]);

        const effectivePermissions = new Set<string>();
        rolePerms?.forEach(p => effectivePermissions.add(p.permission_id));
        userPerms?.forEach(p => {
          if (p.enabled) {
            effectivePermissions.add(p.permission_id);
          } else {
            effectivePermissions.delete(p.permission_id);
          }
        });

        const fullProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: userRole,
          avatar_url: profile.avatar_url || undefined,
          created_at: profile.created_at,
          permissions: Array.from(effectivePermissions),
        };

        setRealUser(currentUser);
        setUser(fullProfile);
        sessionStorage.setItem('real_user', JSON.stringify(currentUser));
        sessionStorage.setItem('impersonated_user', JSON.stringify(fullProfile));
      }
    } catch (error) {
      console.error("Error during impersonation fetch:", error);
      // Fallback: at least set the basic info if fetch fails to avoid breaking everything
      setRealUser(currentUser);
      const fallbackUser = { ...targetUser, permissions: targetUser.permissions || [] };
      setUser(fallbackUser);
      sessionStorage.setItem('real_user', JSON.stringify(currentUser));
      sessionStorage.setItem('impersonated_user', JSON.stringify(fallbackUser));
    }
  };

  const stopImpersonating = () => {
    if (realUser) {
      setUser(realUser);
      setRealUser(null);
      sessionStorage.removeItem('impersonated_user');
      sessionStorage.removeItem('real_user');
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const can = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'DEV') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser: realUser || user,
        isImpersonating: !!realUser,
        session,
        isLoading,
        isAuthenticated: !!session,
        isProfileLoaded,
        impersonate,
        stopImpersonating,
        login,
        signUp,
        logout,
        hasRole,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
