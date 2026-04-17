
-- ========== MAIN EMPLOYEES TABLE ==========
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  emp_id text NOT NULL,
  first_name text,
  last_name text,
  middle_name text,
  email text,
  personal_email text,
  phone text,
  personal_phone text,
  date_of_birth date,
  gender text,
  marital_status text,
  nationality text,
  religion text,
  department text,
  designation text,
  division text,
  category text,
  joining_date date,
  probation_end_date date,
  separation_date date,
  work_location_country text,
  work_location_city text,
  pay_currency text,
  payroll_setup_id uuid,
  reports_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, emp_id),
  UNIQUE (client_id, email)
);

CREATE INDEX idx_employees_client_status ON public.employees(client_id, status);
CREATE INDEX idx_employees_client_department ON public.employees(client_id, department);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- ========== ADDRESSES ==========
CREATE TABLE public.employee_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'current',
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  country text,
  postal_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addr_employee ON public.employee_addresses(employee_id);

-- ========== BANK DETAILS ==========
CREATE TABLE public.employee_bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  bank_name text,
  bank_country text,
  swift_code text,
  iban text,
  bank_currency text,
  beneficiary_name text,
  bank_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bank_employee ON public.employee_bank_details(employee_id);

-- ========== EMERGENCY CONTACTS ==========
CREATE TABLE public.employee_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text,
  relation text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ec_employee ON public.employee_emergency_contacts(employee_id);

-- ========== EDUCATION ==========
CREATE TABLE public.employee_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  institution text,
  degree text,
  field_of_study text,
  start_year int,
  end_year int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_edu_employee ON public.employee_education(employee_id);

-- ========== COMPENSATION ==========
CREATE TABLE public.employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  component_type text NOT NULL DEFAULT 'other',
  amount bigint NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comp_employee ON public.employee_compensation(employee_id);

-- ========== DOCUMENTS ==========
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  doc_number text,
  issue_date date,
  expiry_date date,
  file_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_doc_employee ON public.employee_documents(employee_id);
CREATE INDEX idx_doc_expiry ON public.employee_documents(client_id, expiry_date);

-- ========== DEPARTMENTS ==========
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  head_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
CREATE INDEX idx_dept_client ON public.departments(client_id);

-- ========== DESIGNATIONS ==========
CREATE TABLE public.designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  level int,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);
CREATE INDEX idx_desig_client ON public.designations(client_id);

-- ========== UPDATED_AT TRIGGERS ==========
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_addr_updated_at BEFORE UPDATE ON public.employee_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bank_updated_at BEFORE UPDATE ON public.employee_bank_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ec_updated_at BEFORE UPDATE ON public.employee_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comp_updated_at BEFORE UPDATE ON public.employee_compensation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_updated_at BEFORE UPDATE ON public.employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== ENABLE RLS ==========
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

-- ========== HELPER: is admin/hr in same client ==========
CREATE OR REPLACE FUNCTION public.is_admin_or_hr_in_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _client_id = public.get_user_client_id(_user_id)
    AND (public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'hr'));
$$;

-- ========== EMPLOYEES POLICIES ==========
CREATE POLICY "super admin all on employees" ON public.employees
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "admin/hr select employees in client" ON public.employees
  FOR SELECT TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin/hr insert employees in client" ON public.employees
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin/hr update employees in client" ON public.employees
  FOR UPDATE TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "admin/hr delete employees in client" ON public.employees
  FOR DELETE TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id));

-- Employees can view colleagues in the same client (basic directory)
CREATE POLICY "employees view colleagues in client" ON public.employees
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));

-- Employees can update only their own row (limited fields enforced at app level)
CREATE POLICY "employee update own row" ON public.employees
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== GENERIC POLICY HELPER MACRO PATTERN ==========
-- Apply same pattern to each related table

-- ADDRESSES
CREATE POLICY "super admin all addresses" ON public.employee_addresses
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all addresses in client" ON public.employee_addresses
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own addresses" ON public.employee_addresses
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
CREATE POLICY "employee insert own addresses" ON public.employee_addresses
  FOR INSERT TO authenticated WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
CREATE POLICY "employee update own addresses" ON public.employee_addresses
  FOR UPDATE TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  ) WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- BANK DETAILS (extra sensitive — no broad access)
CREATE POLICY "super admin all bank" ON public.employee_bank_details
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all bank in client" ON public.employee_bank_details
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own bank" ON public.employee_bank_details
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
CREATE POLICY "employee update own bank" ON public.employee_bank_details
  FOR UPDATE TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  ) WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- EMERGENCY CONTACTS
CREATE POLICY "super admin all ec" ON public.employee_emergency_contacts
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all ec in client" ON public.employee_emergency_contacts
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee manage own ec" ON public.employee_emergency_contacts
  FOR ALL TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  ) WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- EDUCATION
CREATE POLICY "super admin all edu" ON public.employee_education
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all edu in client" ON public.employee_education
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own edu" ON public.employee_education
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- COMPENSATION (sensitive — only employee + admin/hr)
CREATE POLICY "super admin all comp" ON public.employee_compensation
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all comp in client" ON public.employee_compensation
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own comp" ON public.employee_compensation
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- DOCUMENTS
CREATE POLICY "super admin all docs" ON public.employee_documents
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "admin/hr all docs in client" ON public.employee_documents
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
CREATE POLICY "employee select own docs" ON public.employee_documents
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
CREATE POLICY "employee insert own docs" ON public.employee_documents
  FOR INSERT TO authenticated WITH CHECK (
    employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

-- DEPARTMENTS
CREATE POLICY "super admin all departments" ON public.departments
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "users select departments in client" ON public.departments
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "admin/hr manage departments in client" ON public.departments
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

-- DESIGNATIONS
CREATE POLICY "super admin all designations" ON public.designations
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "users select designations in client" ON public.designations
  FOR SELECT TO authenticated USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "admin/hr manage designations in client" ON public.designations
  FOR ALL TO authenticated USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));
