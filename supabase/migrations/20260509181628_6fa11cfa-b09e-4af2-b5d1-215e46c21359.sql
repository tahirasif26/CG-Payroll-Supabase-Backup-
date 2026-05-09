-- loans: admin/HR manage; employee can insert own
DROP POLICY IF EXISTS "admin/hr manage loans" ON public.loans;
CREATE POLICY "admin/hr manage loans" ON public.loans
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "employee insert own loans" ON public.loans;
CREATE POLICY "employee insert own loans" ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = get_user_client_id(auth.uid())
    AND employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- loan_transactions: admin/HR manage; employee can insert for own loans
DROP POLICY IF EXISTS "admin/hr manage loan_transactions" ON public.loan_transactions;
CREATE POLICY "admin/hr manage loan_transactions" ON public.loan_transactions
  FOR ALL TO authenticated
  USING (is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (is_admin_or_hr_in_client(auth.uid(), client_id));

DROP POLICY IF EXISTS "employee insert own loan_transactions" ON public.loan_transactions;
CREATE POLICY "employee insert own loan_transactions" ON public.loan_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = get_user_client_id(auth.uid())
    AND loan_id IN (
      SELECT l.id FROM public.loans l
      JOIN public.employees e ON e.id = l.employee_id
      WHERE e.user_id = auth.uid()
    )
  );