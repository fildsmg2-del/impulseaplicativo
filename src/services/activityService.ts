import { supabase } from "@/integrations/supabase/client";

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  activity_type: string;
  client_id: string | null;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
  project?: { id: string } | null;
}

export interface ActivityInput {
  title: string;
  description?: string | null;
  activity_date: string;
  start_time?: string | null;
  end_time?: string | null;
  activity_type: string;
  client_id?: string | null;
  project_id?: string | null;
  assigned_to?: string | null;
  completed?: boolean;
}

export const activityService = {
  async getAll(): Promise<Activity[]> {
    const { data, error } = await supabase
      .from("activities")
      .select(`
        *,
        client:clients(name),
        project:projects(id)
      `)
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Activity[];
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from("activities")
      .select(`
        *,
        client:clients(name),
        project:projects(id)
      `)
      .gte("activity_date", startDate)
      .lte("activity_date", endDate)
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Activity[];
  },

  async getByDate(date: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from("activities")
      .select(`
        *,
        client:clients(name),
        project:projects(id)
      `)
      .eq("activity_date", date)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return data as Activity[];
  },

  async create(activity: ActivityInput): Promise<Activity> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("activities")
      .insert({
        ...activity,
        created_by: userData.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, activity: Partial<ActivityInput>): Promise<Activity> {
    const { data, error } = await supabase
      .from("activities")
      .update(activity)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async toggleComplete(id: string, completed: boolean): Promise<Activity> {
    const { data, error } = await supabase
      .from("activities")
      .update({ completed })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
