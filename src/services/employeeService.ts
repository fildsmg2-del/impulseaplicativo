import { supabase } from "@/integrations/supabase/client";

export interface Employee {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  admission_date: string | null;
  next_vacation_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  phone?: string;
  position: string;
  admission_date?: string;
  next_vacation_date?: string;
}

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }

  return data || [];
}

export async function createEmployee(employeeData: CreateEmployeeData): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: employeeData.name,
      email: employeeData.email,
      phone: employeeData.phone || null,
      position: employeeData.position,
      admission_date: employeeData.admission_date || null,
      next_vacation_date: employeeData.next_vacation_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    throw error;
  }

  return data;
}

export async function updateEmployee(id: string, employeeData: Partial<CreateEmployeeData>): Promise<void> {
  const updatePayload = {
    ...employeeData,
    admission_date:
      employeeData.admission_date === '' ? null : employeeData.admission_date,
    next_vacation_date:
      employeeData.next_vacation_date === '' ? null : employeeData.next_vacation_date,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('employees')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}
