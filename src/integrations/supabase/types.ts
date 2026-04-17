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
          id: string
          status: Database["public"]["Enums"]["client_status"]
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          timezone: string
          updated_at: string
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
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string
          updated_at?: string
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
          id?: string
          status?: Database["public"]["Enums"]["client_status"]
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
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
          first_name: string | null
          gender: string | null
          id: string
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
          separation_date: string | null
          status: string
          updated_at: string
          user_id: string | null
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
          first_name?: string | null
          gender?: string | null
          id?: string
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
          separation_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
          first_name?: string | null
          gender?: string | null
          id?: string
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
          separation_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
          name: string
        }
        Insert: {
          created_at?: string
          default_enabled_for_roles?: string[]
          description?: string | null
          feature_key: string
          id?: string
          module: string
          name: string
        }
        Update: {
          created_at?: string
          default_enabled_for_roles?: string[]
          description?: string | null
          feature_key?: string
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
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
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
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
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "hr" | "employee" | "super_admin"
      client_status: "active" | "suspended" | "trial"
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
      app_role: ["admin", "hr", "employee", "super_admin"],
      client_status: ["active", "suspended", "trial"],
      subscription_plan: ["starter", "pro", "enterprise"],
    },
  },
} as const
