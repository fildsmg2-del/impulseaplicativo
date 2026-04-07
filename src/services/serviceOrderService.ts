import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

export interface ServiceOrder {
  id: string;
  client_id: string | null;
  service_type: string;
  service_type_id: string | null;
  execution_date: string | null;
  opening_date: string | null;
  deadline_date: string | null;
  status: string;
  attachments: ServiceOrderAttachmentSummary[];
  notes: string | null;
  created_by: string | null;
  assigned_to: string | null;
  checklist_state: ServiceOrderChecklistItem[];
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
    phone: string;
  };
  service_type_info?: {
    name: string;
    deadline_days: number;
  };
}

export interface ServiceOrderChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface CreateServiceOrderData {
  client_id?: string | null;
  service_type: string;
  service_type_id?: string | null;
  execution_date?: string | null;
  opening_date?: string | null;
  deadline_date?: string | null;
  status?: string;
  attachments?: ServiceOrderAttachmentDraft[];
  notes?: string | null;
  assigned_to?: string | null;
  checklist_state?: ServiceOrderChecklistItem[];
}

export interface UpdateServiceOrderData extends Partial<CreateServiceOrderData> {
  id: string;
}

interface ServiceOrderUser {
  id: string;
  role: UserRole;
}

export interface ServiceOrderAttachmentSummary {
  id?: string;
  name: string;
  url: string;
  path?: string | null;
  type?: string | null;
  uploadedAt: string;
  sector: string;
}

export interface ServiceOrderAttachmentDraft extends ServiceOrderAttachmentInput {
  id?: string;
}

export interface ServiceOrderAttachmentInput {
  name: string;
  url: string;
  path?: string | null;
  type?: string | null;
  uploadedAt?: string;
  sector: string;
}

interface ServiceOrderAttachmentRow {
  id: string;
  service_order_id: string;
  name: string;
  url: string;
  path: string | null;
  type: string | null;
  uploaded_at: string;
  sector: string;
  created_by: string | null;
}

const mapAttachmentRow = (row: ServiceOrderAttachmentRow): ServiceOrderAttachmentSummary => ({
  id: row.id,
  name: row.name,
  url: row.url,
  path: row.path,
  type: row.type,
  uploadedAt: row.uploaded_at,
  sector: row.sector,
});

interface RawServiceOrder extends Omit<ServiceOrder, 'attachments' | 'checklist_state'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checklist_state: any;
  service_order_attachments?: ServiceOrderAttachmentRow[];
}

const parseServiceOrder = (row: Record<string, unknown>): ServiceOrder => {
  const raw = row as unknown as RawServiceOrder;
  const attachments = Array.isArray(raw.service_order_attachments)
    ? raw.service_order_attachments.map(mapAttachmentRow)
    : [];

  return {
    ...raw,
    attachments,
    checklist_state: Array.isArray(raw.checklist_state) ? raw.checklist_state : [],
  };
};

const attachmentSelect = 'service_order_attachments(*)';

export const serviceOrderService = {
  async getAll(): Promise<ServiceOrder[]> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(name, phone),
        service_type_info:service_types(name, deadline_days),
        ${attachmentSelect}
      `)
      .order('deadline_date', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data || []).map(parseServiceOrder);
  },

  async getForUser(user: ServiceOrderUser): Promise<ServiceOrder[]> {
    let query = supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(name, phone),
        service_type_info:service_types(name, deadline_days),
        ${attachmentSelect}
      `)
      .order('deadline_date', { ascending: true, nullsFirst: false });

    const { data, error } = await query;
    if (error) {
      console.error('ServiceOrder fetch error:', error);
      throw error;
    }

    if (!data?.length) {
      console.log('ServiceOrder fetch returned 0 results for user:', user.id, 'role:', user.role);
    }
    
    return (data || []).map(parseServiceOrder);
  },

  async getById(id: string): Promise<ServiceOrder | null> {
    const { data, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        client:clients(name, phone),
        service_type_info:service_types(name, deadline_days),
        ${attachmentSelect}
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? parseServiceOrder(data) : null;
  },

  async create(serviceOrder: CreateServiceOrderData): Promise<ServiceOrder> {
    const { data: userData } = await supabase.auth.getUser();
    
    const openingDate = serviceOrder.opening_date || new Date().toISOString().split('T')[0];
    const { attachments, ...serviceOrderData } = serviceOrder;

    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        ...serviceOrderData,
        opening_date: openingDate,
        created_by: userData.user?.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checklist_state: serviceOrderData.checklist_state as any,
      })
      .select(`
        *,
        client:clients(name, phone),
        service_type_info:service_types(name, deadline_days),
        ${attachmentSelect}
      `)
      .single();

    if (error) throw error;
    const parsed = parseServiceOrder(data);

    if (attachments?.length) {
      const inserted = await serviceOrderService.addAttachments(data.id, attachments);
      parsed.attachments = [...parsed.attachments, ...inserted];
    }

    return parsed;
  },

  async update(serviceOrder: UpdateServiceOrderData): Promise<ServiceOrder> {
    const { id, checklist_state, attachments, ...updateData } = serviceOrder;
    
    const { data, error } = await supabase
      .from('service_orders')
      .update({
        ...updateData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        checklist_state: checklist_state as any,
      })
      .eq('id', id)
      .select(`
        *,
        client:clients(name, phone),
        service_type_info:service_types(name, deadline_days),
        ${attachmentSelect}
      `)
      .single();

    if (error) throw error;
    const parsed = parseServiceOrder(data);

    if (attachments?.length) {
      const pending = attachments.filter((attachment) => !attachment.id);
      if (pending.length) {
        const inserted = await serviceOrderService.addAttachments(id, pending);
        parsed.attachments = [...parsed.attachments, ...inserted];
      }
    }

    return parsed;
  },

  async addAttachments(
    serviceOrderId: string,
    attachments: ServiceOrderAttachmentInput[],
  ): Promise<ServiceOrderAttachmentSummary[]> {
    if (attachments.length === 0) return [];
    const { data: userData } = await supabase.auth.getUser();

    const payload = attachments.map((attachment) => ({
      service_order_id: serviceOrderId,
      name: attachment.name,
      url: attachment.url,
      path: attachment.path ?? null,
      type: attachment.type ?? null,
      uploaded_at: attachment.uploadedAt ?? new Date().toISOString(),
      sector: attachment.sector,
      created_by: userData.user?.id,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('service_order_attachments')
      .insert(payload)
      .select();

    if (error) throw error;
    return (data ?? []).map(mapAttachmentRow);
  },

  async deleteAttachment(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('service_order_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!userData.user) {
      throw new Error('Usuário não autenticado');
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (roleError) throw roleError;

    const userRole = roleData?.role as UserRole | undefined;

    if (userRole === 'TECNICO') {
      const { data: orderData, error: orderError } = await supabase
        .from('service_orders')
        .select('assigned_to')
        .eq('id', id)
        .maybeSingle();

      if (orderError) throw orderError;

      if (!orderData || orderData.assigned_to !== userData.user.id) {
        throw new Error('Você não tem permissão para excluir esta OS');
      }
    }

    const { error } = await supabase
      .from('service_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
