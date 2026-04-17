-- =========================================================
-- CLIENTS
-- =========================================================
DROP POLICY IF EXISTS "Super admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their own client" ON public.clients;
DROP POLICY IF EXISTS "Only super admins can create clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can update any client" ON public.clients;
DROP POLICY IF EXISTS "Admins can update their own client" ON public.clients;
DROP POLICY IF EXISTS "Only super admins can delete clients" ON public.clients;

CREATE POLICY "Super admins can view all clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own client"
  ON public.clients FOR SELECT TO authenticated
  USING (id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Only super admins can create clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any client"
  ON public.clients FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update their own client"
  ON public.clients FOR UPDATE TO authenticated
  USING (id = public.get_user_client_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = public.get_user_client_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only super admins can delete clients"
  ON public.clients FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- =========================================================
-- PROFILES (drop old policies first)
-- =========================================================
DROP POLICY IF EXISTS "Admins and HR can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins/HR can view profiles in their client" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view profiles in their client" ON public.profiles;
DROP POLICY IF EXISTS "Admins/HR can update profiles in their client" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins/HR can view profiles in their client"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  );

CREATE POLICY "Employees can view profiles in their client"
  ON public.profiles FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins/HR can update profiles in their client"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  )
  WITH CHECK (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  );

-- =========================================================
-- USER_ROLES (drop old policies first)
-- =========================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view roles in their client" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their client" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view roles in their client"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Admins can manage admin/hr/employee roles within their own client only.
-- Explicitly forbids assigning 'super_admin'.
CREATE POLICY "Admins can manage roles in their client"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
    AND role <> 'super_admin'
  )
  WITH CHECK (
    client_id = public.get_user_client_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
    AND role IN ('admin', 'hr', 'employee')
  );

-- =========================================================
-- FEATURE_DEFINITIONS
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read feature definitions" ON public.feature_definitions;
DROP POLICY IF EXISTS "Only super admins can manage feature definitions" ON public.feature_definitions;

CREATE POLICY "Authenticated users can read feature definitions"
  ON public.feature_definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only super admins can manage feature definitions"
  ON public.feature_definitions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================================================
-- FEATURE_TOGGLES
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own toggles" ON public.feature_toggles;
DROP POLICY IF EXISTS "Admins/HR can view toggles in their client" ON public.feature_toggles;
DROP POLICY IF EXISTS "Admins/HR can manage toggles in their client" ON public.feature_toggles;

CREATE POLICY "Users can view their own toggles"
  ON public.feature_toggles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins/HR can view toggles in their client"
  ON public.feature_toggles FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  );

CREATE POLICY "Admins/HR can manage toggles in their client"
  ON public.feature_toggles FOR ALL TO authenticated
  USING (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  )
  WITH CHECK (
    client_id = public.get_user_client_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
  );