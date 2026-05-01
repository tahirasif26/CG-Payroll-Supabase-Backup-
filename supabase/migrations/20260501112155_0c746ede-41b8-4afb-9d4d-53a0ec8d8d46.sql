
-- BLE Doors table
CREATE TABLE public.ble_doors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ble_doors_client ON public.ble_doors(client_id);

ALTER TABLE public.ble_doors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read ble_doors"
  ON public.ble_doors FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage ble_doors"
  ON public.ble_doors FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super admin all ble_doors"
  ON public.ble_doors FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_ble_doors_updated
  BEFORE UPDATE ON public.ble_doors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BLE Access Grants table
CREATE TABLE public.ble_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  door_id uuid NOT NULL REFERENCES public.ble_doors(id) ON DELETE CASCADE,
  granted_at date NOT NULL DEFAULT CURRENT_DATE,
  revoked_at date,
  status text NOT NULL DEFAULT 'active',
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ble_grants_client ON public.ble_access_grants(client_id);
CREATE INDEX idx_ble_grants_employee ON public.ble_access_grants(employee_id);
CREATE INDEX idx_ble_grants_door ON public.ble_access_grants(door_id);

ALTER TABLE public.ble_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client members read ble_grants"
  ON public.ble_access_grants FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "client admins manage ble_grants"
  ON public.ble_access_grants FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

CREATE POLICY "super admin all ble_grants"
  ON public.ble_access_grants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_ble_grants_updated
  BEFORE UPDATE ON public.ble_access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
