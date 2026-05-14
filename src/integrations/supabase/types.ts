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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advances: {
        Row: {
          advance_name: string | null
          amount: number
          amount_used: number
          approved_by: string | null
          attachments: Json
          client_id: string
          created_at: string
          currency: string
          employee_id: string
          expected_spend_date: string | null
          id: string
          last_reminder_sent: string | null
          notes: string | null
          payroll_run_id: string | null
          purpose: string | null
          reason: string | null
          reminder_history: Json
          repayment_schedule: Json
          request_date: string
          settlement_due_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advance_name?: string | null
          amount?: number
          amount_used?: number
          approved_by?: string | null
          attachments?: Json
          client_id: string
          created_at?: string
          currency?: string
          employee_id: string
          expected_spend_date?: string | null
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payroll_run_id?: string | null
          purpose?: string | null
          reason?: string | null
          reminder_history?: Json
          repayment_schedule?: Json
          request_date?: string
          settlement_due_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advance_name?: string | null
          amount?: number
          amount_used?: number
          approved_by?: string | null
          attachments?: Json
          client_id?: string
          created_at?: string
          currency?: string
          employee_id?: string
          expected_spend_date?: string | null
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          payroll_run_id?: string | null
          purpose?: string | null
          reason?: string | null
          reminder_history?: Json
          repayment_schedule?: Json
          request_date?: string
          settlement_due_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_delegations: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          end_date: string
          fallback_employee_id: string | null
          from_employee_id: string
          id: string
          is_active: boolean
          reason: string | null
          start_date: string
          to_employee_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          fallback_employee_id?: string | null
          from_employee_id: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date: string
          to_employee_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          fallback_employee_id?: string | null
          from_employee_id?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date?: string
          to_employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_fallback_employee_id_fkey"
            columns: ["fallback_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_group_members: {
        Row: {
          created_at: string
          employee_id: string
          group_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          group_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_group_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "approval_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_groups: {
        Row: {
          approval_type: string
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          escalate_after_days: number | null
          escalate_to_group_id: string | null
          id: string
          is_active: boolean
          max_limit_halalas: number | null
          min_limit_halalas: number | null
          name: string
          updated_at: string
        }
        Insert: {
          approval_type?: string
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          escalate_after_days?: number | null
          escalate_to_group_id?: string | null
          id?: string
          is_active?: boolean
          max_limit_halalas?: number | null
          min_limit_halalas?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          approval_type?: string
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          escalate_after_days?: number | null
          escalate_to_group_id?: string | null
          id?: string
          is_active?: boolean
          max_limit_halalas?: number | null
          min_limit_halalas?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_groups_escalate_to_group_id_fkey"
            columns: ["escalate_to_group_id"]
            isOneToOne: false
            referencedRelation: "approval_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_policies: {
        Row: {
          approval_type_override: string | null
          category: string
          client_id: string
          created_at: string
          group_id: string | null
          id: string
          is_active: boolean
          max_value: number | null
          min_value: number
          policy_type: string
          sort_order: number
        }
        Insert: {
          approval_type_override?: string | null
          category: string
          client_id: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number
          policy_type?: string
          sort_order?: number
        }
        Update: {
          approval_type_override?: string | null
          category?: string
          client_id?: string
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean
          max_value?: number | null
          min_value?: number
          policy_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_policies_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "approval_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_policy_levels: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          level_order: number
          mode: string
          policy_id: string
          sla_hours: number | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          level_order: number
          mode?: string
          policy_id: string
          sla_hours?: number | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          level_order?: number
          mode?: string
          policy_id?: string
          sla_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_policy_levels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "approval_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_policy_levels_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "approval_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_roles: {
        Row: {
          can_approve_hr: boolean
          can_approve_payroll: boolean
          client_id: string
          created_at: string
          expense_approval_limit: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          can_approve_hr?: boolean
          can_approve_payroll?: boolean
          client_id: string
          created_at?: string
          expense_approval_limit?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          can_approve_hr?: boolean
          can_approve_payroll?: boolean
          client_id?: string
          created_at?: string
          expense_approval_limit?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_ratings: {
        Row: {
          client_id: string
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          value: number
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          value?: number
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      asset_audit_entries: {
        Row: {
          asset_id: string | null
          audit_id: string
          client_id: string
          id: string
          notes: string | null
          verification: string
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          asset_id?: string | null
          audit_id: string
          client_id: string
          id?: string
          notes?: string | null
          verification?: string
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          asset_id?: string | null
          audit_id?: string
          client_id?: string
          id?: string
          notes?: string | null
          verification?: string
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_audit_entries_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audit_entries_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "asset_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audit_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audit_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_audits: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          scope: string
          scope_value: string | null
          start_date: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          scope?: string
          scope_value?: string | null
          start_date?: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          scope?: string
          scope_value?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_audits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_conditions: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_conditions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_conditions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_history: {
        Row: {
          action: string
          asset_id: string
          client_id: string
          created_at: string
          date: string
          from_employee_id: string | null
          id: string
          note: string | null
          performed_by: string | null
          to_employee_id: string | null
        }
        Insert: {
          action: string
          asset_id: string
          client_id: string
          created_at?: string
          date?: string
          from_employee_id?: string | null
          id?: string
          note?: string | null
          performed_by?: string | null
          to_employee_id?: string | null
        }
        Update: {
          action?: string
          asset_id?: string
          client_id?: string
          created_at?: string
          date?: string
          from_employee_id?: string | null
          id?: string
          note?: string | null
          performed_by?: string | null
          to_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_history_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_locations: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_requests: {
        Row: {
          client_id: string
          created_at: string
          employee_id: string
          id: string
          priority: string
          reason: string | null
          request_date: string
          status: string
          store_item_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          priority?: string
          reason?: string | null
          request_date?: string
          status?: string
          store_item_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          priority?: string
          reason?: string | null
          request_date?: string
          status?: string
          store_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_store_item_id_fkey"
            columns: ["store_item_id"]
            isOneToOne: false
            referencedRelation: "asset_store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_store_items: {
        Row: {
          brand: string | null
          category_id: string | null
          client_id: string
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          image_url: string | null
          model: string | null
          name: string
          publish_to_store: boolean
          sku: string | null
          specifications: string | null
          status: string
          warranty_period: string | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          publish_to_store?: boolean
          sku?: string | null
          specifications?: string | null
          status?: string
          warranty_period?: string | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          publish_to_store?: boolean
          sku?: string | null
          specifications?: string | null
          status?: string
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_store_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_store_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_store_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_tag: string
          assigned_date: string | null
          brand: string | null
          category_id: string | null
          client_id: string
          condition_id: string | null
          created_at: string
          employee_id: string | null
          id: string
          image_url: string | null
          location_id: string | null
          model: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          service_due_date: string | null
          status: string
          updated_at: string
          warranty_expiry: string | null
        }
        Insert: {
          asset_tag: string
          assigned_date?: string | null
          brand?: string | null
          category_id?: string | null
          client_id: string
          condition_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          model?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          service_due_date?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Update: {
          asset_tag?: string
          assigned_date?: string | null
          brand?: string | null
          category_id?: string | null
          client_id?: string
          condition_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          image_url?: string | null
          location_id?: string | null
          model?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          service_due_date?: string | null
          status?: string
          updated_at?: string
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_condition_id_fkey"
            columns: ["condition_id"]
            isOneToOne: false
            referencedRelation: "asset_conditions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_value: Json | null
          before_value: Json | null
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          before_value?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          before_value?: Json | null
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ble_access_grants: {
        Row: {
          client_id: string
          created_at: string
          door_id: string
          employee_id: string
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          door_id: string
          employee_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          door_id?: string
          employee_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ble_access_grants_door_id_fkey"
            columns: ["door_id"]
            isOneToOne: false
            referencedRelation: "ble_doors"
            referencedColumns: ["id"]
          },
        ]
      }
      ble_doors: {
        Row: {
          client_id: string
          created_at: string
          id: string
          location: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          base_currency: string
          company_email: string | null
          company_name: string
          company_phone: string | null
          company_slug: string | null
          country: string | null
          created_at: string
          created_by: string | null
          enabled_features: string[] | null
          enabled_modules: string[]
          id: string
          setup_completed_at: string | null
          setup_completed_steps: string[]
          setup_dismissed_at: string | null
          status: Database["public"]["Enums"]["client_status"]
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          theme_color: string
          timezone: string
          updated_at: string
          year_end_date: string
        }
        Insert: {
          base_currency?: string
          company_email?: string | null
          company_name: string
          company_phone?: string | null
          company_slug?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          enabled_features?: string[] | null
          enabled_modules?: string[]
          id?: string
          setup_completed_at?: string | null
          setup_completed_steps?: string[]
          setup_dismissed_at?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          theme_color?: string
          timezone?: string
          updated_at?: string
          year_end_date?: string
        }
        Update: {
          base_currency?: string
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_slug?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          enabled_features?: string[] | null
          enabled_modules?: string[]
          id?: string
          setup_completed_at?: string | null
          setup_completed_steps?: string[]
          setup_dismissed_at?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          theme_color?: string
          timezone?: string
          updated_at?: string
          year_end_date?: string
        }
        Relationships: []
      }
      company_policies: {
        Row: {
          category: string
          client_id: string
          created_at: string
          description: string | null
          effective_date: string
          expiry_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          requires_ack: boolean
          status: string
          title: string
          updated_at: string
          version: number
          versions: Json
        }
        Insert: {
          category?: string
          client_id: string
          created_at?: string
          description?: string | null
          effective_date?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          requires_ack?: boolean
          status?: string
          title: string
          updated_at?: string
          version?: number
          versions?: Json
        }
        Update: {
          category?: string
          client_id?: string
          created_at?: string
          description?: string | null
          effective_date?: string
          expiry_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          requires_ack?: boolean
          status?: string
          title?: string
          updated_at?: string
          version?: number
          versions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "company_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_allocations: {
        Row: {
          allocation: number
          client_id: string
          created_at: string
          employee_id: string
          id: string
          month: string
          project_id: string | null
          year: number
        }
        Insert: {
          allocation?: number
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          month: string
          project_id?: string | null
          year: number
        }
        Update: {
          allocation?: number
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          month?: string
          project_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          head_employee_id: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          head_employee_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          head_employee_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_employee_id_fkey"
            columns: ["head_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      designations: {
        Row: {
          client_id: string
          created_at: string
          department_id: string | null
          id: string
          level: number | null
          name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number | null
          name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "designations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "divisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          employee_id: string
          id: string
          postal_code: string | null
          state: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          client_id: string
          country?: string | null
          created_at?: string
          employee_id: string
          id?: string
          postal_code?: string | null
          state?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          postal_code?: string | null
          state?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_addresses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_bank_details: {
        Row: {
          bank_address: string | null
          bank_country: string | null
          bank_currency: string | null
          bank_name: string | null
          beneficiary_name: string | null
          client_id: string
          created_at: string
          employee_id: string
          iban: string | null
          id: string
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          bank_address?: string | null
          bank_country?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          client_id: string
          created_at?: string
          employee_id: string
          iban?: string | null
          id?: string
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          bank_address?: string | null
          bank_country?: string | null
          bank_currency?: string | null
          bank_name?: string | null
          beneficiary_name?: string | null
          client_id?: string
          created_at?: string
          employee_id?: string
          iban?: string | null
          id?: string
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_bank_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_details_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bank_details_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compensation: {
        Row: {
          amount: number
          client_id: string
          component_name: string
          component_type: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          component_name: string
          component_type?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          component_name?: string
          component_type?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_compensation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          client_id: string
          created_at: string
          doc_number: string | null
          doc_type: string
          employee_id: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          status: string
          updated_at: string
          uploaded_by_self: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          doc_number?: string | null
          doc_type: string
          employee_id: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          status?: string
          updated_at?: string
          uploaded_by_self?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          employee_id?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          status?: string
          updated_at?: string
          uploaded_by_self?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_education: {
        Row: {
          client_id: string
          created_at: string
          degree: string | null
          employee_id: string
          end_year: number | null
          field_of_study: string | null
          id: string
          institution: string | null
          start_year: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          degree?: string | null
          employee_id: string
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          start_year?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          degree?: string | null
          employee_id?: string
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          institution?: string | null
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_education_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_education_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_education_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_emergency_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          employee_id: string
          id: string
          name: string | null
          phone: string | null
          relation: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          employee_id: string
          id?: string
          name?: string | null
          phone?: string | null
          relation?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          employee_id?: string
          id?: string
          name?: string | null
          phone?: string | null
          relation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_emergency_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_emergency_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_emergency_contacts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_types: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          avatar_url: string | null
          category: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          department: string | null
          designation: string | null
          division: string | null
          email: string | null
          emp_id: string
          enabled_features: string[] | null
          first_name: string | null
          gender: string | null
          id: string
          is_verified: boolean
          joining_date: string | null
          last_name: string | null
          marital_status: string | null
          middle_name: string | null
          nationality: string | null
          pay_currency: string | null
          payroll_setup_id: string | null
          personal_email: string | null
          personal_phone: string | null
          phone: string | null
          probation_end_date: string | null
          religion: string | null
          reports_to: string | null
          role_id: string | null
          separation_date: string | null
          status: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          work_location_city: string | null
          work_location_country: string | null
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          division?: string | null
          email?: string | null
          emp_id: string
          enabled_features?: string[] | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_verified?: boolean
          joining_date?: string | null
          last_name?: string | null
          marital_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          pay_currency?: string | null
          payroll_setup_id?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          phone?: string | null
          probation_end_date?: string | null
          religion?: string | null
          reports_to?: string | null
          role_id?: string | null
          separation_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          work_location_city?: string | null
          work_location_country?: string | null
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          division?: string | null
          email?: string | null
          emp_id?: string
          enabled_features?: string[] | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_verified?: boolean
          joining_date?: string | null
          last_name?: string | null
          marital_status?: string | null
          middle_name?: string | null
          nationality?: string | null
          pay_currency?: string | null
          payroll_setup_id?: string | null
          personal_email?: string | null
          personal_phone?: string | null
          phone?: string | null
          probation_end_date?: string | null
          religion?: string | null
          reports_to?: string | null
          role_id?: string | null
          separation_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          work_location_city?: string | null
          work_location_country?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      eos_benefit_configs: {
        Row: {
          applies_to: string[]
          applies_to_countries: string[]
          calculation_basis: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          tiers: Json
          type: string
          updated_at: string
        }
        Insert: {
          applies_to?: string[]
          applies_to_countries?: string[]
          calculation_basis?: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          tiers?: Json
          type: string
          updated_at?: string
        }
        Update: {
          applies_to?: string[]
          applies_to_countries?: string[]
          calculation_basis?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          tiers?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eos_benefit_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eos_benefit_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_approvals: {
        Row: {
          approver_id: string
          comments: string | null
          decided_at: string
          expense_id: string
          id: string
          status: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          decided_at?: string
          expense_id: string
          id?: string
          status: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          decided_at?: string
          expense_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_approvals_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          client_id: string
          code: string | null
          created_at: string
          gl_code: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string
          gl_code?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string
          gl_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          advance_id: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          category_id: string | null
          client_id: string
          created_at: string
          currency: string
          description: string | null
          employee_id: string
          exchange_rate: number | null
          expense_date: string
          id: string
          original_amount: number | null
          original_currency: string | null
          paid_date: string | null
          payment_method: string | null
          payroll_run_id: string | null
          project_id: string | null
          receipt_url: string | null
          rejection_reason: string | null
          status: string
          submission_date: string
          updated_at: string
        }
        Insert: {
          advance_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          client_id: string
          created_at?: string
          currency?: string
          description?: string | null
          employee_id: string
          exchange_rate?: number | null
          expense_date?: string
          id?: string
          original_amount?: number | null
          original_currency?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payroll_run_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          submission_date?: string
          updated_at?: string
        }
        Update: {
          advance_id?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          employee_id?: string
          exchange_rate?: number | null
          expense_date?: string
          id?: string
          original_amount?: number | null
          original_currency?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payroll_run_id?: string | null
          project_id?: string | null
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          submission_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_definitions: {
        Row: {
          created_at: string
          default_enabled_for_roles: string[]
          description: string | null
          feature_key: string
          id: string
          module: string
          module_key: string
          name: string
        }
        Insert: {
          created_at?: string
          default_enabled_for_roles?: string[]
          description?: string | null
          feature_key: string
          id?: string
          module: string
          module_key: string
          name: string
        }
        Update: {
          created_at?: string
          default_enabled_for_roles?: string[]
          description?: string | null
          feature_key?: string
          id?: string
          module?: string
          module_key?: string
          name?: string
        }
        Relationships: []
      }
      feature_presets: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          toggles: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          toggles?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          toggles?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_presets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_presets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_toggles: {
        Row: {
          access_level: Database["public"]["Enums"]["feature_access_level"]
          client_id: string
          created_at: string
          enabled_by: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["feature_access_level"]
          client_id: string
          created_at?: string
          enabled_by?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["feature_access_level"]
          client_id?: string
          created_at?: string
          enabled_by?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_toggles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_toggles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_code_mappings: {
        Row: {
          client_id: string
          created_at: string
          entry_name: string
          gl_code: string
          id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          entry_name: string
          gl_code: string
          id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          entry_name?: string
          gl_code?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_code_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_code_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          applies_to_locations: string[]
          client_id: string
          created_at: string
          date: string
          id: string
          is_optional: boolean
          name: string
        }
        Insert: {
          applies_to_locations?: string[]
          client_id: string
          created_at?: string
          date: string
          id?: string
          is_optional?: boolean
          name: string
        }
        Update: {
          applies_to_locations?: string[]
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          is_optional?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holidays_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_allocations: {
        Row: {
          allocated_days: number
          client_id: string
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          updated_at: string
        }
        Insert: {
          allocated_days?: number
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          updated_at?: string
        }
        Update: {
          allocated_days?: number
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          allocated: number
          carried_forward: number
          carryforward_in: number
          client_id: string
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allocated?: number
          carried_forward?: number
          carryforward_in?: number
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allocated?: number
          carried_forward?: number
          carryforward_in?: number
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          accrual_type: string
          client_id: string
          code: string | null
          created_at: string
          days_per_year: number
          gender_specific: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          max_carryforward: number
          name: string
          requires_approval: boolean
        }
        Insert: {
          accrual_type?: string
          client_id: string
          code?: string | null
          created_at?: string
          days_per_year?: number
          gender_specific?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_carryforward?: number
          name: string
          requires_approval?: boolean
        }
        Update: {
          accrual_type?: string
          client_id?: string
          code?: string | null
          created_at?: string
          days_per_year?: number
          gender_specific?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_carryforward?: number
          name?: string
          requires_approval?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_transactions: {
        Row: {
          amount: number
          balance_after: number
          client_id: string
          created_at: string
          date: string
          emi_at_time: number
          id: string
          loan_id: string
          note: string | null
          payroll_run_id: string | null
          type: string
        }
        Insert: {
          amount?: number
          balance_after?: number
          client_id: string
          created_at?: string
          date?: string
          emi_at_time?: number
          id?: string
          loan_id: string
          note?: string | null
          payroll_run_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          client_id?: string
          created_at?: string
          date?: string
          emi_at_time?: number
          id?: string
          loan_id?: string
          note?: string | null
          payroll_run_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_transactions_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          approved_by: string | null
          client_id: string
          created_at: string
          employee_id: string
          end_date: string | null
          id: string
          interest_rate: number
          monthly_deduction: number
          paused_until: string | null
          pre_pause_emi: number | null
          principal: number
          reason: string | null
          remaining_balance: number
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          client_id: string
          created_at?: string
          employee_id: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          monthly_deduction?: number
          paused_until?: string | null
          pre_pause_emi?: number | null
          principal?: number
          reason?: string | null
          remaining_balance?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          client_id?: string
          created_at?: string
          employee_id?: string
          end_date?: string | null
          id?: string
          interest_rate?: number
          monthly_deduction?: number
          paused_until?: string | null
          pre_pause_emi?: number | null
          principal?: number
          reason?: string | null
          remaining_balance?: number
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_entries: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          date: string
          distance_km: number
          employee_id: string
          from_address: string | null
          id: string
          notes: string | null
          rate_per_km: number
          status: string
          to_address: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          date?: string
          distance_km?: number
          employee_id: string
          from_address?: string | null
          id?: string
          notes?: string | null
          rate_per_km?: number
          status?: string
          to_address?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          date?: string
          distance_km?: number
          employee_id?: string
          from_address?: string | null
          id?: string
          notes?: string | null
          rate_per_km?: number
          status?: string
          to_address?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mileage_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          body: string | null
          category: string
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          body?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_lines: {
        Row: {
          advance_given: number
          allowances: number
          basic: number
          client_id: string
          created_at: string
          employee_id: string
          exchange_rate: number
          expense_reimbursement: number
          gross: number
          id: string
          loan_deduction: number
          net_in_reporting_currency: number
          net_pay: number
          one_off_benefits: number
          one_off_deductions: number
          other_deductions: number
          pay_currency: string
          payroll_run_id: string
          separation_settlement: number
          snapshot_data: Json
          statutory_deduction: number
          tax_deduction: number
          total_deductions: number
        }
        Insert: {
          advance_given?: number
          allowances?: number
          basic?: number
          client_id: string
          created_at?: string
          employee_id: string
          exchange_rate?: number
          expense_reimbursement?: number
          gross?: number
          id?: string
          loan_deduction?: number
          net_in_reporting_currency?: number
          net_pay?: number
          one_off_benefits?: number
          one_off_deductions?: number
          other_deductions?: number
          pay_currency?: string
          payroll_run_id: string
          separation_settlement?: number
          snapshot_data?: Json
          statutory_deduction?: number
          tax_deduction?: number
          total_deductions?: number
        }
        Update: {
          advance_given?: number
          allowances?: number
          basic?: number
          client_id?: string
          created_at?: string
          employee_id?: string
          exchange_rate?: number
          expense_reimbursement?: number
          gross?: number
          id?: string
          loan_deduction?: number
          net_in_reporting_currency?: number
          net_pay?: number
          one_off_benefits?: number
          one_off_deductions?: number
          other_deductions?: number
          pay_currency?: string
          payroll_run_id?: string
          separation_settlement?: number
          snapshot_data?: Json
          statutory_deduction?: number
          tax_deduction?: number
          total_deductions?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_one_off_adjustments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          name: string
          payroll_run_id: string
          type: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          name: string
          payroll_run_id: string
          type: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          name?: string
          payroll_run_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_one_off_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_one_off_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_one_off_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_one_off_adjustments_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payment_status: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: string
          entity_id: string
          id: string
          module: string
          paid_at: string | null
          paid_by: string | null
          payroll_run_id: string | null
          request_approval_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          currency?: string
          entity_id: string
          id?: string
          module: string
          paid_at?: string | null
          paid_by?: string | null
          payroll_run_id?: string | null
          request_approval_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: string
          entity_id?: string
          id?: string
          module?: string
          paid_at?: string | null
          paid_by?: string | null
          payroll_run_id?: string | null
          request_approval_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payment_status_request_approval_id_fkey"
            columns: ["request_approval_id"]
            isOneToOne: true
            referencedRelation: "request_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          employee_count: number
          id: string
          locked: boolean
          locked_at: string | null
          locked_by: string | null
          month: string
          payroll_setup_id: string | null
          run_date: string
          status: string
          total_deductions: number
          total_gross: number
          total_net: number
          updated_at: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          employee_count?: number
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          month: string
          payroll_setup_id?: string | null
          run_date?: string
          status?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          employee_count?: number
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          month?: string
          payroll_setup_id?: string | null
          run_date?: string
          status?: string
          total_deductions?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_payroll_setup_id_fkey"
            columns: ["payroll_setup_id"]
            isOneToOne: false
            referencedRelation: "payroll_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_setup_components: {
        Row: {
          calculation_type: string
          client_id: string
          created_at: string
          formula: string | null
          id: string
          name: string
          order_index: number
          payroll_setup_id: string
          status: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          calculation_type?: string
          client_id: string
          created_at?: string
          formula?: string | null
          id?: string
          name: string
          order_index?: number
          payroll_setup_id: string
          status?: string
          type: string
          updated_at?: string
          value?: number
        }
        Update: {
          calculation_type?: string
          client_id?: string
          created_at?: string
          formula?: string | null
          id?: string
          name?: string
          order_index?: number
          payroll_setup_id?: string
          status?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_setup_components_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_setup_components_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_setup_components_payroll_setup_id_fkey"
            columns: ["payroll_setup_id"]
            isOneToOne: false
            referencedRelation: "payroll_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_setup_tax_rules: {
        Row: {
          client_id: string
          created_at: string
          id: string
          income_from: number
          income_to: number
          order_index: number
          payroll_setup_id: string
          percentage: number
          slab_name: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          income_from?: number
          income_to?: number
          order_index?: number
          payroll_setup_id: string
          percentage?: number
          slab_name: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          income_from?: number
          income_to?: number
          order_index?: number
          payroll_setup_id?: string
          percentage?: number
          slab_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_setup_tax_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_setup_tax_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_setup_tax_rules_payroll_setup_id_fkey"
            columns: ["payroll_setup_id"]
            isOneToOne: false
            referencedRelation: "payroll_setups"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_setups: {
        Row: {
          client_id: string
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          name: string
          options: Json
          pay_frequency: string
          status: string
          updated_at: string
          year_end_date: string | null
        }
        Insert: {
          client_id: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          name: string
          options?: Json
          pay_frequency?: string
          status?: string
          updated_at?: string
          year_end_date?: string | null
        }
        Update: {
          client_id?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          name?: string
          options?: Json
          pay_frequency?: string
          status?: string
          updated_at?: string
          year_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_setups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_setups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          client_id: string
          created_at: string
          emailed_at: string | null
          employee_id: string
          id: string
          issued_at: string | null
          payroll_line_id: string
          pdf_url: string | null
          viewed_by_employee_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          emailed_at?: string | null
          employee_id: string
          id?: string
          issued_at?: string | null
          payroll_line_id: string
          pdf_url?: string | null
          viewed_by_employee_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          emailed_at?: string | null
          employee_id?: string
          id?: string
          issued_at?: string | null
          payroll_line_id?: string
          pdf_url?: string | null
          viewed_by_employee_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_payroll_line_id_fkey"
            columns: ["payroll_line_id"]
            isOneToOne: false
            referencedRelation: "payroll_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_assessments: {
        Row: {
          client_id: string
          created_at: string
          cycle_id: string | null
          employee_id: string
          id: string
          rating: number | null
          responses: Json
          reviewer_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          cycle_id?: string | null
          employee_id: string
          id?: string
          rating?: number | null
          responses?: Json
          reviewer_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          cycle_id?: string | null
          employee_id?: string
          id?: string
          rating?: number | null
          responses?: Json
          reviewer_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_assessments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_assessments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_calibrations: {
        Row: {
          calibrated_by: string | null
          calibrated_rating: number | null
          client_id: string
          created_at: string
          cycle_id: string | null
          employee_id: string
          id: string
          notes: string | null
          original_rating: number | null
          status: string
        }
        Insert: {
          calibrated_by?: string | null
          calibrated_rating?: number | null
          client_id: string
          created_at?: string
          cycle_id?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          original_rating?: number | null
          status?: string
        }
        Update: {
          calibrated_by?: string | null
          calibrated_rating?: number | null
          client_id?: string
          created_at?: string
          cycle_id?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          original_rating?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_calibrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_calibrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_calibrations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_calibrations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_cycles: {
        Row: {
          client_id: string
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_questionnaires: {
        Row: {
          audience: string
          client_id: string
          created_at: string
          cycle_id: string | null
          id: string
          name: string
          questions: Json
        }
        Insert: {
          audience?: string
          client_id: string
          created_at?: string
          cycle_id?: string | null
          id?: string
          name: string
          questions?: Json
        }
        Update: {
          audience?: string
          client_id?: string
          created_at?: string
          cycle_id?: string | null
          id?: string
          name?: string
          questions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "performance_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_questionnaires_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acknowledgements: {
        Row: {
          acknowledged_at: string
          client_id: string
          employee_id: string
          id: string
          policy_id: string
        }
        Insert: {
          acknowledged_at?: string
          client_id: string
          employee_id: string
          id?: string
          policy_id: string
        }
        Update: {
          acknowledged_at?: string
          client_id?: string
          employee_id?: string
          id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "company_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          employee_id: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          client_id: string
          created_at: string
          employee_id: string
          id: string
          project_id: string
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          project_id: string
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          client_id: string
          client_name: string | null
          code: string
          completion: number
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number
          client_id: string
          client_name?: string | null
          code: string
          completion?: number
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number
          client_id?: string
          client_name?: string | null
          code?: string
          completion?: number
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reminder_dispatches: {
        Row: {
          client_id: string
          dispatch_key: string
          entity_id: string | null
          entity_type: string
          id: string
          lead_days_used: number
          notification_id: string | null
          recipient_user_id: string
          rule_id: string
          sent_at: string
        }
        Insert: {
          client_id: string
          dispatch_key: string
          entity_id?: string | null
          entity_type: string
          id?: string
          lead_days_used?: number
          notification_id?: string | null
          recipient_user_id: string
          rule_id: string
          sent_at?: string
        }
        Update: {
          client_id?: string
          dispatch_key?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          lead_days_used?: number
          notification_id?: string | null
          recipient_user_id?: string
          rule_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_dispatches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_dispatches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_dispatches_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "reminder_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          category: string
          client_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          reminder_key: string
          sent_at: string
        }
        Insert: {
          category: string
          client_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          reminder_key: string
          sent_at?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          reminder_key?: string
          sent_at?: string
        }
        Relationships: []
      }
      reminder_rules: {
        Row: {
          category: Database["public"]["Enums"]["reminder_category"]
          client_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_enabled: boolean
          last_run_at: string | null
          lead_days_before: number[]
          name: string
          priority: Database["public"]["Enums"]["reminder_priority"]
          recipients: string[]
          repeat_frequency: Database["public"]["Enums"]["reminder_frequency"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["reminder_category"]
          client_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          lead_days_before?: number[]
          name: string
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recipients?: string[]
          repeat_frequency?: Database["public"]["Enums"]["reminder_frequency"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["reminder_category"]
          client_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          lead_days_before?: number[]
          name?: string
          priority?: Database["public"]["Enums"]["reminder_priority"]
          recipients?: string[]
          repeat_frequency?: Database["public"]["Enums"]["reminder_frequency"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_rules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      request_approval_history: {
        Row: {
          action: string
          actor_employee_id: string | null
          actor_user_id: string | null
          comment: string | null
          created_at: string
          group_id: string | null
          id: string
          level_order: number | null
          on_behalf_of_employee_id: string | null
          request_approval_id: string
        }
        Insert: {
          action: string
          actor_employee_id?: string | null
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          level_order?: number | null
          on_behalf_of_employee_id?: string | null
          request_approval_id: string
        }
        Update: {
          action?: string
          actor_employee_id?: string | null
          actor_user_id?: string | null
          comment?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          level_order?: number | null
          on_behalf_of_employee_id?: string | null
          request_approval_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_approval_history_request_approval_id_fkey"
            columns: ["request_approval_id"]
            isOneToOne: false
            referencedRelation: "request_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      request_approvals: {
        Row: {
          client_id: string
          created_at: string
          current_group_id: string | null
          current_level: number
          entity_id: string
          finalized_at: string | null
          id: string
          module: string
          policy_id: string | null
          requester_employee_id: string
          status: string
          updated_at: string
          value_amount: number
          value_unit: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_group_id?: string | null
          current_level?: number
          entity_id: string
          finalized_at?: string | null
          id?: string
          module: string
          policy_id?: string | null
          requester_employee_id: string
          status?: string
          updated_at?: string
          value_amount?: number
          value_unit?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_group_id?: string | null
          current_level?: number
          entity_id?: string
          finalized_at?: string | null
          id?: string
          module?: string
          policy_id?: string | null
          requester_employee_id?: string
          status?: string
          updated_at?: string
          value_amount?: number
          value_unit?: string
        }
        Relationships: []
      }
      request_assignments: {
        Row: {
          acted_at: string | null
          created_at: string
          employee_id: string
          group_id: string | null
          id: string
          level_order: number
          request_approval_id: string
          status: string
          via_delegation: boolean
        }
        Insert: {
          acted_at?: string | null
          created_at?: string
          employee_id: string
          group_id?: string | null
          id?: string
          level_order?: number
          request_approval_id: string
          status?: string
          via_delegation?: boolean
        }
        Update: {
          acted_at?: string | null
          created_at?: string
          employee_id?: string
          group_id?: string | null
          id?: string
          level_order?: number
          request_approval_id?: string
          status?: string
          via_delegation?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "request_assignments_request_approval_id_fkey"
            columns: ["request_approval_id"]
            isOneToOne: false
            referencedRelation: "request_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      role_features: {
        Row: {
          created_at: string
          feature_key: string
          people_enabled: boolean
          role_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          people_enabled?: boolean
          role_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          people_enabled?: boolean
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_features_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          client_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      separations: {
        Row: {
          approved_by: string | null
          client_id: string
          created_at: string
          employee_id: string
          eosb_amount: number
          eosb_breakdown: Json
          id: string
          last_working_date: string
          leave_encashment: number
          loan_deduction: number
          metadata: Json
          notice_period_days: number
          notice_period_pay: number
          notice_period_served: boolean
          payroll_run_id: string | null
          processed_date: string | null
          reason: string | null
          status: string
          total_settlement: number
          type: string
          unpaid_salary: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          client_id: string
          created_at?: string
          employee_id: string
          eosb_amount?: number
          eosb_breakdown?: Json
          id?: string
          last_working_date: string
          leave_encashment?: number
          loan_deduction?: number
          metadata?: Json
          notice_period_days?: number
          notice_period_pay?: number
          notice_period_served?: boolean
          payroll_run_id?: string | null
          processed_date?: string | null
          reason?: string | null
          status?: string
          total_settlement?: number
          type?: string
          unpaid_salary?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          client_id?: string
          created_at?: string
          employee_id?: string
          eosb_amount?: number
          eosb_breakdown?: Json
          id?: string
          last_working_date?: string
          leave_encashment?: number
          loan_deduction?: number
          metadata?: Json
          notice_period_days?: number
          notice_period_pay?: number
          notice_period_served?: boolean
          payroll_run_id?: string | null
          processed_date?: string | null
          reason?: string | null
          status?: string
          total_settlement?: number
          type?: string
          unpaid_salary?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "separations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separations_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_configs: {
        Row: {
          applies_to: string[]
          applies_to_countries: string[]
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          rate: number
          updated_at: string
        }
        Insert: {
          applies_to?: string[]
          applies_to_countries?: string[]
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rate?: number
          updated_at?: string
        }
        Update: {
          applies_to?: string[]
          applies_to_countries?: string[]
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      timesheets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          employee_id: string
          hours: number
          id: string
          project_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          week_starting: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          employee_id: string
          hours?: number
          id?: string
          project_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          week_starting: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          project_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          week_starting?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_approval_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_approval_role_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_approval_role_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_approval_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "approval_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          client_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          from_state: string | null
          id: string
          metadata: Json
          to_state: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          client_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          from_state?: string | null
          id?: string
          metadata?: Json
          to_state?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          client_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          from_state?: string | null
          id?: string
          metadata?: Json
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      client_stats: {
        Row: {
          base_currency: string | null
          company_email: string | null
          company_name: string | null
          company_phone: string | null
          company_slug: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          last_activity: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          timezone: string | null
          updated_at: string | null
          user_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      act_on_request: {
        Args: {
          _action: string
          _comment?: string
          _request_approval_id: string
        }
        Returns: {
          client_id: string
          created_at: string
          current_group_id: string | null
          current_level: number
          entity_id: string
          finalized_at: string | null
          id: string
          module: string
          policy_id: string | null
          requester_employee_id: string
          status: string
          updated_at: string
          value_amount: number
          value_unit: string
        }
        SetofOptions: {
          from: "*"
          to: "request_approvals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_act_on_request: {
        Args: { _request_approval_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      client_has_module: {
        Args: { _client_id: string; _module_key: string }
        Returns: boolean
      }
      client_module_to_feature_modules: {
        Args: { _nav_key: string }
        Returns: string[]
      }
      create_notification: {
        Args: {
          _action_url?: string
          _body?: string
          _category?: string
          _client_id?: string
          _entity_id?: string
          _entity_type?: string
          _recipient_user_id: string
          _severity?: string
          _title: string
        }
        Returns: string
      }
      expire_approval_delegations: { Args: never; Returns: number }
      generate_emp_id: { Args: { _client_id: string }; Returns: string }
      generate_emp_id_prefix: {
        Args: { _company_name: string }
        Returns: string
      }
      generate_next_emp_id: { Args: { _client_id: string }; Returns: string }
      get_active_approvers: {
        Args: { _group_id: string }
        Returns: {
          employee_id: string
          via_delegation: boolean
        }[]
      }
      get_eligible_approvers: {
        Args: { _exclude_employee_id?: string; _group_id: string }
        Returns: {
          employee_id: string
          via_delegation: boolean
        }[]
      }
      get_employee_role_id: { Args: { _user_id: string }; Returns: string }
      get_role_features: {
        Args: { _user_id: string }
        Returns: {
          feature_key: string
          people_enabled: boolean
        }[]
      }
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      get_user_enabled_features: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_enabled_modules: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_feature_access: {
        Args: { _user_id: string }
        Returns: {
          access_level: Database["public"]["Enums"]["feature_access_level"]
          feature_key: string
          module_key: string
        }[]
      }
      get_user_features: {
        Args: { _user_id: string }
        Returns: {
          enabled: boolean
          feature_key: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_feature: {
        Args: { _feature_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_hr_in_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_client_staff: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_pending_request_assignee: {
        Args: { _entity_id: string; _module: string; _user_id: string }
        Returns: boolean
      }
      is_request_assignee: {
        Args: { _entity_id: string; _module: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_request_paid: {
        Args: {
          _paid?: boolean
          _payroll_run_id?: string
          _request_approval_id: string
        }
        Returns: undefined
      }
      mark_self_verified: {
        Args: never
        Returns: {
          avatar_url: string | null
          category: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          department: string | null
          designation: string | null
          division: string | null
          email: string | null
          emp_id: string
          enabled_features: string[] | null
          first_name: string | null
          gender: string | null
          id: string
          is_verified: boolean
          joining_date: string | null
          last_name: string | null
          marital_status: string | null
          middle_name: string | null
          nationality: string | null
          pay_currency: string | null
          payroll_setup_id: string | null
          personal_email: string | null
          personal_phone: string | null
          phone: string | null
          probation_end_date: string | null
          religion: string | null
          reports_to: string | null
          role_id: string | null
          separation_date: string | null
          status: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          work_location_city: string | null
          work_location_country: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employees"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notify_client_admins: {
        Args: {
          _action_url?: string
          _body?: string
          _category?: string
          _client_id: string
          _entity_id?: string
          _entity_type?: string
          _severity?: string
          _title: string
        }
        Returns: number
      }
      resolve_approval_group: {
        Args: { _category: string; _client_id: string; _value?: number }
        Returns: string
      }
      start_request_workflow: {
        Args: {
          _category?: string
          _client_id: string
          _entity_id: string
          _module: string
          _requester_employee_id: string
          _value?: number
          _value_unit?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "employee" | "hr"
      client_status: "active" | "suspended" | "trial"
      feature_access_level: "none" | "view" | "edit"
      reminder_category:
        | "document_expiry"
        | "asset_warranty"
        | "asset_service"
        | "advance_settlement"
        | "probation_end"
        | "birthday"
        | "work_anniversary"
        | "policy_ack"
        | "approval_pending"
        | "payroll_due"
        | "performance_assessment"
        | "visa_expiry"
        | "iqama_expiry"
        | "contract_expiry"
        | "medical_insurance"
        | "loan_instalment"
        | "leave_balance_lapse"
      reminder_frequency: "once" | "daily" | "weekly" | "monthly"
      reminder_priority: "info" | "warning" | "urgent"
      subscription_plan: "starter" | "pro" | "enterprise"
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
      app_role: ["super_admin", "admin", "employee", "hr"],
      client_status: ["active", "suspended", "trial"],
      feature_access_level: ["none", "view", "edit"],
      reminder_category: [
        "document_expiry",
        "asset_warranty",
        "asset_service",
        "advance_settlement",
        "probation_end",
        "birthday",
        "work_anniversary",
        "policy_ack",
        "approval_pending",
        "payroll_due",
        "performance_assessment",
        "visa_expiry",
        "iqama_expiry",
        "contract_expiry",
        "medical_insurance",
        "loan_instalment",
        "leave_balance_lapse",
      ],
      reminder_frequency: ["once", "daily", "weekly", "monthly"],
      reminder_priority: ["info", "warning", "urgent"],
      subscription_plan: ["starter", "pro", "enterprise"],
    },
  },
} as const
