-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('MASTER', 'ENGENHEIRO', 'VENDEDOR');

-- Create enum for document types
CREATE TYPE public.document_type AS ENUM ('CPF', 'CNPJ');

-- Create enum for roof types
CREATE TYPE public.roof_type AS ENUM ('CERAMICA', 'FIBROCIMENTO', 'METALICA', 'LAJE');

-- Create enum for project status
CREATE TYPE public.project_status AS ENUM ('DOCUMENTACAO', 'HOMOLOGACAO', 'INSTALACAO', 'VISTORIA', 'CONEXAO', 'MONITORAMENTO', 'CONCLUIDO');

-- Create enum for quote status
CREATE TYPE public.quote_status AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('RECEITA', 'DESPESA');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- Create enum for product category
CREATE TYPE public.product_category AS ENUM ('MODULO', 'INVERSOR', 'ESTRUTURA', 'CABO', 'CONECTOR', 'OUTROS');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'VENDEDOR',
  UNIQUE(user_id, role)
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  document TEXT NOT NULL,
  document_type document_type NOT NULL DEFAULT 'CPF',
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,
  document_type document_type DEFAULT 'CNPJ',
  contact_person TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products/Inventory table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,
  sku TEXT UNIQUE,
  brand TEXT,
  model TEXT,
  power_w INTEGER,
  unit TEXT DEFAULT 'un',
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status quote_status NOT NULL DEFAULT 'DRAFT',
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip_code TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  roof_type roof_type,
  average_monthly_kwh DECIMAL(10,2),
  tariff DECIMAL(10,4),
  monthly_bills JSONB DEFAULT '[]',
  recommended_power_kwp DECIMAL(10,3),
  estimated_generation_kwh DECIMAL(10,2),
  modules_quantity INTEGER,
  inverter_power_kw DECIMAL(10,2),
  modules TEXT,
  inverter TEXT,
  structure TEXT,
  cables_connectors TEXT,
  installation BOOLEAN DEFAULT true,
  homologation BOOLEAN DEFAULT true,
  monitoring BOOLEAN DEFAULT true,
  equipment_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  additional_costs DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  monthly_savings DECIMAL(12,2),
  payback_months INTEGER,
  roi_25_years DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  status project_status NOT NULL DEFAULT 'DOCUMENTACAO',
  power_kwp DECIMAL(10,3),
  checklist JSONB DEFAULT '{}',
  notes TEXT,
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'PENDENTE',
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  category TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  reason TEXT,
  project_id UUID REFERENCES public.projects(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Masters can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'MASTER'));

-- User roles policies  
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Masters can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Clients policies (all authenticated can view and manage)
CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Masters can delete clients" ON public.clients FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Suppliers policies (MASTER only)
CREATE POLICY "Masters can view suppliers" ON public.suppliers FOR SELECT USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can update suppliers" ON public.suppliers FOR UPDATE USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can delete suppliers" ON public.suppliers FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Products policies (MASTER only for management, all can view)
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Masters can insert products" ON public.products FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can update products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can delete products" ON public.products FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Quotes policies (all authenticated)
CREATE POLICY "Authenticated users can view quotes" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quotes" ON public.quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Masters can delete quotes" ON public.quotes FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Projects policies (all authenticated)
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Masters can delete projects" ON public.projects FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Transactions policies (MASTER only)
CREATE POLICY "Masters can view transactions" ON public.transactions FOR SELECT USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can update transactions" ON public.transactions FOR UPDATE USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can delete transactions" ON public.transactions FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Stock movements policies (MASTER only)
CREATE POLICY "Masters can view stock movements" ON public.stock_movements FOR SELECT USING (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can insert stock movements" ON public.stock_movements FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'MASTER'));
CREATE POLICY "Masters can delete stock movements" ON public.stock_movements FOR DELETE USING (public.has_role(auth.uid(), 'MASTER'));

-- Chat messages policies
CREATE POLICY "Users can view their messages" ON public.chat_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can mark messages as read" ON public.chat_messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'VENDEDOR');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;