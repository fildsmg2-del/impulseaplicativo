export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          assigned_to: string | null
          client_id: string | null
          completed: boolean | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          id: string
          project_id: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          activity_date: string
          activity_type?: string
          assigned_to?: string | null
          client_id?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          project_id?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          assigned_to?: string | null
          client_id?: string | null
          completed?: boolean | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          project_id?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          city: string | null
          complement: string | null
          cpf_rg_url: string | null
          created_at: string
          created_by: string | null
          document: string
          document_type: Database["public"]["Enums"]["document_type"]
          electricity_bills: Json | null
          email: string
          id: string
          name: string
          neighborhood: string | null
          number: string | null
          phone: string
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          cpf_rg_url?: string | null
          created_at?: string
          created_by?: string | null
          document: string
          document_type?: Database["public"]["Enums"]["document_type"]
          electricity_bills?: Json | null
          email: string
          id?: string
          name: string
          neighborhood?: string | null
          number?: string | null
          phone: string
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          cpf_rg_url?: string | null
          created_at?: string
          created_by?: string | null
          document?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          electricity_bills?: Json | null
          email?: string
          id?: string
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          city: string | null
          cnpj: string | null
          complement: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          project_checklist_template: Json | null
          state: string | null
          street: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          project_checklist_template?: Json | null
          state?: string | null
          street?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          project_checklist_template?: Json | null
          state?: string | null
          street?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean | null
          admission_date: string | null
          created_at: string
          email: string
          id: string
          name: string
          next_vacation_date: string | null
          phone: string | null
          position: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          admission_date?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          next_vacation_date?: string | null
          phone?: string | null
          position?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          admission_date?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          next_vacation_date?: string | null
          phone?: string | null
          position?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financing_banks: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          max_grace_period: number
          max_installments: number
          max_rate: number
          min_installments: number
          min_rate: number
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          max_grace_period?: number
          max_installments?: number
          max_rate?: number
          min_installments?: number
          min_rate?: number
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          max_grace_period?: number
          max_installments?: number
          max_rate?: number
          min_installments?: number
          min_rate?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kits: {
        Row: {
          active: boolean
          cost_price: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          items: Json
          max_area_m2: number | null
          max_consumption_kwh: number | null
          min_area_m2: number | null
          min_consumption_kwh: number | null
          name: string
          sale_price: number
          system_type: string
          total_power_kwp: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          max_area_m2?: number | null
          max_consumption_kwh?: number | null
          min_area_m2?: number | null
          min_consumption_kwh?: number | null
          name: string
          sale_price?: number
          system_type?: string
          total_power_kwp?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_price?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          items?: Json
          max_area_m2?: number | null
          max_consumption_kwh?: number | null
          min_area_m2?: number | null
          min_consumption_kwh?: number | null
          name?: string
          sale_price?: number
          system_type?: string
          total_power_kwp?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number
          created_at: string
          description: string | null
          id: string
          min_quantity: number | null
          model: string | null
          name: string
          power_w: number | null
          quantity: number
          sale_price: number
          sku: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          category: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number | null
          model?: string | null
          name: string
          power_w?: number | null
          quantity?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number | null
          model?: string | null
          name?: string
          power_w?: number | null
          quantity?: number
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_activity_logs: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          created_by_role: string | null
          description: string
          id: string
          project_id: string
          stage: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description: string
          id?: string
          project_id: string
          stage: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description?: string
          id?: string
          project_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          assigned_role: string | null
          assigned_to: string | null
          checklist: Json | null
          client_id: string | null
          created_at: string
          created_by: string | null
          estimated_end_date: string | null
          id: string
          installation_type: string
          notes: string | null
          power_kwp: number | null
          quote_id: string | null
          stage_documents: Json | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          checklist?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_end_date?: string | null
          id?: string
          installation_type?: string
          notes?: string | null
          power_kwp?: number | null
          quote_id?: string | null
          stage_documents?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          checklist?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          estimated_end_date?: string | null
          id?: string
          installation_type?: string
          notes?: string | null
          power_kwp?: number | null
          quote_id?: string | null
          stage_documents?: Json | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          additional_costs: number | null
          additional_cost_items: Json
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          availability_cost: number | null
          average_monthly_kwh: number | null
          cables_connectors: string | null
          client_id: string | null
          client_signature: string | null
          client_signed_at: string | null
          compensated_energy_tax: number | null
          created_at: string
          created_by: string | null
          discount: number | null
          energy_distributor: string | null
          equipment_cost: number | null
          estimated_generation_kwh: number | null
          financing_bank: string | null
          financing_down_payment: number | null
          financing_installment_value: number | null
          financing_installments: number | null
          financing_rate: number | null
          fio_b: number | null
          homologation: boolean | null
          id: string
          installation: boolean | null
          inverter: string | null
          inverter_power_kw: number | null
          labor_cost: number | null
          latitude: number | null
          longitude: number | null
          modules: string | null
          modules_quantity: number | null
          monitoring: boolean | null
          monthly_bills: Json | null
          monthly_savings: number | null
          payback_months: number | null
          payment_type: string | null
          phase_type: string | null
          recommended_power_kwp: number | null
          roi_25_years: number | null
          roof_type: Database["public"]["Enums"]["roof_type"] | null
          signature_token: string | null
          simultaneity_factor: number | null
          status: Database["public"]["Enums"]["quote_status"]
          structure: string | null
          tariff: number | null
          tariff_group: string | null
          tariff_subgroup: string | null
          total: number | null
          updated_at: string
        }
        Insert: {
          additional_costs?: number | null
          additional_cost_items?: Json
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          availability_cost?: number | null
          average_monthly_kwh?: number | null
          cables_connectors?: string | null
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          compensated_energy_tax?: number | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          energy_distributor?: string | null
          equipment_cost?: number | null
          estimated_generation_kwh?: number | null
          financing_bank?: string | null
          financing_down_payment?: number | null
          financing_installment_value?: number | null
          financing_installments?: number | null
          financing_rate?: number | null
          fio_b?: number | null
          homologation?: boolean | null
          id?: string
          installation?: boolean | null
          inverter?: string | null
          inverter_power_kw?: number | null
          labor_cost?: number | null
          latitude?: number | null
          longitude?: number | null
          modules?: string | null
          modules_quantity?: number | null
          monitoring?: boolean | null
          monthly_bills?: Json | null
          monthly_savings?: number | null
          payback_months?: number | null
          payment_type?: string | null
          phase_type?: string | null
          recommended_power_kwp?: number | null
          roi_25_years?: number | null
          roof_type?: Database["public"]["Enums"]["roof_type"] | null
          signature_token?: string | null
          simultaneity_factor?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          structure?: string | null
          tariff?: number | null
          tariff_group?: string | null
          tariff_subgroup?: string | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          additional_costs?: number | null
          additional_cost_items?: Json
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          availability_cost?: number | null
          average_monthly_kwh?: number | null
          cables_connectors?: string | null
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          compensated_energy_tax?: number | null
          created_at?: string
          created_by?: string | null
          discount?: number | null
          energy_distributor?: string | null
          equipment_cost?: number | null
          estimated_generation_kwh?: number | null
          financing_bank?: string | null
          financing_down_payment?: number | null
          financing_installment_value?: number | null
          financing_installments?: number | null
          financing_rate?: number | null
          fio_b?: number | null
          homologation?: boolean | null
          id?: string
          installation?: boolean | null
          inverter?: string | null
          inverter_power_kw?: number | null
          labor_cost?: number | null
          latitude?: number | null
          longitude?: number | null
          modules?: string | null
          modules_quantity?: number | null
          monitoring?: boolean | null
          monthly_bills?: Json | null
          monthly_savings?: number | null
          payback_months?: number | null
          payment_type?: string | null
          phase_type?: string | null
          recommended_power_kwp?: number | null
          roi_25_years?: number | null
          roof_type?: Database["public"]["Enums"]["roof_type"] | null
          signature_token?: string | null
          simultaneity_factor?: number | null
          status?: Database["public"]["Enums"]["quote_status"]
          structure?: string | null
          tariff?: number | null
          tariff_group?: string | null
          tariff_subgroup?: string | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          approval_status: string
          client_id: string | null
          client_signature: string | null
          client_signed_at: string | null
          company_signature: string | null
          company_signed_at: string | null
          created_at: string
          created_by: string | null
          discount: number
          estimated_completion_date: string | null
          id: string
          items: Json
          notes: string | null
          payment_details: Json | null
          payment_method: string | null
          payment_status: string
          project_id: string | null
          quote_id: string | null
          sale_date: string
          sale_number: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          approval_status?: string
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          company_signature?: string | null
          company_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          estimated_completion_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_status?: string
          project_id?: string | null
          quote_id?: string | null
          sale_date?: string
          sale_number: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          approval_status?: string
          client_id?: string | null
          client_signature?: string | null
          client_signed_at?: string | null
          company_signature?: string | null
          company_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          discount?: number
          estimated_completion_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_status?: string
          project_id?: string | null
          quote_id?: string | null
          sale_date?: string
          sale_number?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_logs: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          created_by_role: string | null
          description: string
          id: string
          service_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description: string
          id?: string
          service_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          created_by_role?: string | null
          description?: string
          id?: string
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_logs_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          checklist_state: Json | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deadline_date: string | null
          execution_date: string | null
          id: string
          notes: string | null
          opening_date: string | null
          service_type: string
          service_type_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist_state?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_date?: string | null
          execution_date?: string | null
          id?: string
          notes?: string | null
          opening_date?: string | null
          service_type: string
          service_type_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          checklist_state?: Json | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_date?: string | null
          execution_date?: string | null
          id?: string
          notes?: string | null
          opening_date?: string | null
          service_type?: string
          service_type_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          active: boolean
          checklist_template: Json | null
          created_at: string
          deadline_days: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          checklist_template?: Json | null
          created_at?: string
          deadline_days?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          checklist_template?: Json | null
          created_at?: string
          deadline_days?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          product_id: string
          project_id: string | null
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          product_id: string
          project_id?: string | null
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          product_id?: string
          project_id?: string | null
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean | null
          city: string | null
          complement: string | null
          contact_person: string | null
          created_at: string
          document: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          email: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean | null
          city?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean | null
          city?: string | null
          complement?: string | null
          contact_person?: string | null
          created_at?: string
          document?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          email?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      financial_accounts: {
        Row: {
          active: boolean | null
          agency: string | null
          account_number: string | null
          account_digit: string | null
          bank_code: string | null
          bank_name: string | null
          color: string | null
          created_at: string | null
          id: string
          initial_balance: number | null
          name: string
          person_type: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          agency?: string | null
          account_number?: string | null
          account_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          initial_balance?: number | null
          name: string
          person_type?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          agency?: string | null
          account_number?: string | null
          account_digit?: string | null
          bank_code?: string | null
          bank_name?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          initial_balance?: number | null
          name?: string
          person_type?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      },
      cost_centers: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      },
      transaction_splits: {
        Row: {
          id: string
          transaction_id: string
          cost_center_id: string
          percentage: number | null
          amount: number | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          cost_center_id: string
          percentage?: number | null
          amount?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          cost_center_id?: string
          percentage?: number | null
          amount?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          }
        ]
      },
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category: string | null
          client_id: string | null
          client_name_manual: string | null
          competence_date: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          installment_number: number | null
          notes: string | null
          nsu: string | null
          paid_date: string | null
          parent_id: string | null
          payment_method: string | null
          project_id: string | null
          recurrence: string | null
          reference_code: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          supplier_id: string | null
          supplier_name_manual: string | null
          total_installments: number | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category?: string | null
          client_id?: string | null
          client_name_manual?: string | null
          competence_date?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          nsu?: string | null
          paid_date?: string | null
          parent_id?: string | null
          payment_method?: string | null
          project_id?: string | null
          recurrence?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          supplier_id?: string | null
          supplier_name_manual?: string | null
          total_installments?: number | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category?: string | null
          client_id?: string | null
          client_name_manual?: string | null
          competence_date?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          installment_number?: number | null
          notes?: string | null
          nsu?: string | null
          paid_date?: string | null
          parent_id?: string | null
          payment_method?: string | null
          project_id?: string | null
          recurrence?: string | null
          reference_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          supplier_id?: string | null
          supplier_name_manual?: string | null
          total_installments?: number | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advance_project_stage: {
        Args: {
          _assigned_to?: string | null
          _checklist: Json
          _new_assigned_role: string
          _new_status: Database["public"]["Enums"]["project_status"]
          _project_id: string
          _stage_documents: Json
        }
        Returns: undefined
      }
      go_back_project_stage: {
        Args: {
          _checklist: Json
          _new_assigned_role: string
          _new_status: Database["public"]["Enums"]["project_status"]
          _project_id: string
          _stage_documents: Json
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "MASTER"
        | "ENGENHEIRO"
        | "VENDEDOR"
        | "DEV"
        | "FINANCEIRO"
        | "TECNICO"
        | "POS_VENDA"
        | "COMPRAS"
      document_type: "CPF" | "CNPJ"
      product_category:
        | "MODULO"
        | "INVERSOR"
        | "ESTRUTURA"
        | "CABO"
        | "CONECTOR"
        | "OUTROS"
      project_status:
        | "VENDAS"
        | "FINANCEIRO"
        | "COMPRAS"
        | "ENGENHEIRO"
        | "TECNICO"
        | "POS_VENDA"
      quote_status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED"
      roof_type: "CERAMICA" | "FIBROCIMENTO" | "METALICA" | "LAJE"
      transaction_status: "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO"
      transaction_type: "RECEITA" | "DESPESA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "MASTER",
        "ENGENHEIRO",
        "VENDEDOR",
        "DEV",
        "FINANCEIRO",
        "TECNICO",
        "POS_VENDA",
        "COMPRAS",
      ],
      document_type: ["CPF", "CNPJ"],
      product_category: [
        "MODULO",
        "INVERSOR",
        "ESTRUTURA",
        "CABO",
        "CONECTOR",
        "OUTROS",
      ],
      project_status: [
        "VENDAS",
        "FINANCEIRO",
        "COMPRAS",
        "ENGENHEIRO",
        "TECNICO",
        "POS_VENDA",
      ],
      quote_status: ["DRAFT", "SENT", "APPROVED", "REJECTED"],
      roof_type: ["CERAMICA", "FIBROCIMENTO", "METALICA", "LAJE"],
      transaction_status: ["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"],
      transaction_type: ["RECEITA", "DESPESA"],
    },
  },
} as const
