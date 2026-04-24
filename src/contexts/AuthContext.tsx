import React, { useState, useEffect, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';
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

        // 3. Apply hardcoded role-based permissions for core system roles
        if (userRole === 'ENGENHEIRO') {
          ['projects.view', 'quotes.view', 'funnel.view', 'clients.view', 'service_orders.view', 'inventory.view', 'drone.view'].forEach(p => effectivePermissions.add(p));
        } else if (userRole === 'TECNICO') {
          ['service_orders.view', 'drone.view'].forEach(p => effectivePermissions.add(p));
        } else if (userRole === 'FINANCEIRO') {
          ['financial.view', 'projects.view', 'clients.view', 'sales.view', 'quotes.view'].forEach(p => effectivePermissions.add(p));
        }

        const fullProfile: UserProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: userRole,
          avatar_url: profile.avatar_url || undefined,
          created_at: profile.created_at,
          permissions: Array.from(effectivePermissions),
        };

        setUser(fullProfile);
        
        // Cache profile for offline access
        localStorage.setItem('cached_user_profile', JSON.stringify(fullProfile));
      }
      setIsProfileLoaded(true);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // Try to hydrate from cache if offline
      const cached = localStorage.getItem('cached_user_profile');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          console.log('[Auth] Profile hydrated from offline cache');
        } catch (e) {
          console.error('[Auth] Failed to parse cached profile', e);
        }
      }
      
      setIsProfileLoaded(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Evento de autenticação:', event);
        setSession(session);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRealUser(null);
          sessionStorage.removeItem('impersonated_user');
          sessionStorage.removeItem('real_user');
          localStorage.removeItem('cached_user_profile');
        }
        
        setIsLoading(false);
      }
    );

    // CRITICAL: Try to hydrate profile from cache IMMEDIATELY on boot
    const hydrateOffline = () => {
      const cached = localStorage.getItem('cached_user_profile');
      if (cached) {
        try {
          const profile = JSON.parse(cached);
          console.log('[Auth] Pré-hidratando perfil do cache offline:', profile.id);
          setUser(profile);
          setIsProfileLoaded(true);
        } catch (e) {
          console.error('[Auth] Erro ao carregar cache de perfil inicial', e);
        }
      }
    };
    
    hydrateOffline();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync user role with OneSignal tags for push targeting
  useEffect(() => {
    if (user?.role && Capacitor.isNativePlatform()) {
      try {
        console.log(`[OneSignal] Sincronizando tag de cargo: ${user.role}`);
        OneSignal.User.addTag('cargo', user.role);
        
        // Também vamos associar o ID do usuário para facilitar o rastreio
        if (user.id) {
          OneSignal.User.setExternalId(user.id);
        }
      } catch (e) {
        console.error('[OneSignal] Erro ao sincronizar tags:', e);
      }
    }
  }, [user?.role, user?.id]);

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
    localStorage.removeItem('cached_user_profile');
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
    
    // Safety check: ensure permissions is an array to avoid crashes if data is malformed
    if (!Array.isArray(user.permissions)) {
      console.warn("User permissions is not an array:", user.permissions);
      return false;
    }
    
    return user.permissions.includes(permission);
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
