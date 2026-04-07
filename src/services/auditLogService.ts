import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  performed_by: string | null;
  performed_at: string;
  performer?: { name: string; email: string } | null;
}

export type ActionType = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'LOGIN' 
  | 'LOGOUT';

export type EntityType = 
  | 'CLIENT' 
  | 'PROJECT' 
  | 'QUOTE' 
  | 'SALE' 
  | 'PRODUCT' 
  | 'KIT' 
  | 'SUPPLIER' 
  | 'EMPLOYEE' 
  | 'ACTIVITY' 
  | 'TRANSACTION'
  | 'USER';

export const auditLogService = {
  async log(
    action: ActionType,
    entityType: EntityType,
    entityId?: string | null,
    entityName?: string | null,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Direct insert to audit_logs table (bypassing type checking for new table)
      await (supabase as any).from('audit_logs').insert({
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        entity_name: entityName || null,
        details: details || {},
        performed_by: user.id,
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  async getAll(limit = 100): Promise<AuditLog[]> {
    const { data: logs, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Fetch performer names
    const performerIds = [...new Set((logs || []).map((l: any) => l.performed_by).filter(Boolean))] as string[];
    
    let performers: Record<string, { name: string; email: string }> = {};
    if (performerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', performerIds);
      
      if (profiles) {
        performers = profiles.reduce((acc, p) => {
          acc[p.id] = { name: p.name, email: p.email };
          return acc;
        }, {} as Record<string, { name: string; email: string }>);
      }
    }

    return (logs || []).map(log => ({
      ...log,
      details: log.details as Record<string, unknown>,
      performer: log.performed_by ? performers[log.performed_by] || null : null,
    }));
  },

  async getByEntity(entityType: EntityType, entityId: string): Promise<AuditLog[]> {
    const { data: logs, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('performed_at', { ascending: false });

    if (error) throw error;
    return (logs || []).map(log => ({
      ...log,
      details: log.details as Record<string, unknown>,
    }));
  },
};
