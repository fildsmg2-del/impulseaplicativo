// User & Auth Types
export type UserRole = 'MASTER' | 'ENGENHEIRO' | 'VENDEDOR' | 'DEV' | 'FINANCEIRO' | 'TECNICO' | 'POS_VENDA' | 'COMPRAS';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// Client Types
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string; // CPF or CNPJ
  document_type: 'CPF' | 'CNPJ';
  address: Address;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

// Project Types
export type ProjectStatus = 
  | 'VENDAS'
  | 'FINANCEIRO'
  | 'COMPRAS'
  | 'ENGENHEIRO'
  | 'TECNICO'
  | 'POS_VENDA';

export type InstallationType = 'URBANO' | 'RURAL' | 'CNPJ';

export interface Project {
  id: string;
  client_id: string;
  quote_id: string;
  status: ProjectStatus;
  installation_type: InstallationType;
  power_kwp: number;
  checklist: Record<string, boolean>;
  notes: string;
  start_date: string;
  estimated_end_date: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
}

// Quote Types
export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export interface Quote {
  id: string;
  client_id: string;
  status: QuoteStatus;
  location: QuoteLocation;
  consumption: QuoteConsumption;
  dimensioning: QuoteDimensioning;
  kit: QuoteKit;
  services: QuoteServices;
  pricing: QuotePricing;
  payback: QuotePayback;
  created_at: string;
  updated_at: string;
}

export interface QuoteLocation {
  address: Address;
  latitude: number;
  longitude: number;
  roof_type: 'CERAMICA' | 'FIBROCIMENTO' | 'METALICA' | 'LAJE';
}

export interface QuoteConsumption {
  average_monthly_kwh: number;
  tariff: number;
  monthly_bills: number[];
}

export interface QuoteDimensioning {
  recommended_power_kwp: number;
  estimated_generation_kwh: number;
  modules_quantity: number;
  inverter_power_kw: number;
}

export interface QuoteKit {
  modules: string;
  inverter: string;
  structure: string;
  cables_connectors: string;
}

export interface QuoteServices {
  installation: boolean;
  homologation: boolean;
  monitoring: boolean;
}

export interface QuotePricing {
  equipment_cost: number;
  labor_cost: number;
  additional_costs: number;
  discount: number;
  total: number;
}

export interface QuotePayback {
  monthly_savings: number;
  payback_months: number;
  roi_25_years: number;
}

// Dashboard KPIs
export interface DashboardKPIs {
  total_sales: number;
  total_power_kwp: number;
  active_projects: number;
  pending_quotes: number;
  monthly_revenue: number;
  conversion_rate: number;
}

// Chat Message
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
