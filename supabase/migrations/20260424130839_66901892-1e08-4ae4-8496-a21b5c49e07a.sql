DROP POLICY IF EXISTS "client members read expense_categories" ON public.expense_categories;
CREATE POLICY "client members read expense_categories"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));

DROP POLICY IF EXISTS "client admins manage expense_categories" ON public.expense_categories;
CREATE POLICY "client admins manage expense_categories"
  ON public.expense_categories FOR ALL TO authenticated
  USING (public.is_admin_or_hr_in_client(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_hr_in_client(auth.uid(), client_id));

INSERT INTO public.expense_categories (client_id, name, is_active)
SELECT c.id, cat.name, true
FROM public.clients c
CROSS JOIN (VALUES ('Travel'), ('Meals'), ('Office Supplies'), ('Software'), ('Training'), ('Accommodation'), ('Client Entertainment'), ('Other')) AS cat(name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec WHERE ec.client_id = c.id
);

CREATE OR REPLACE FUNCTION public.seed_default_expense_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.expense_categories (client_id, name, is_active) VALUES
    (NEW.id, 'Travel', true),
    (NEW.id, 'Meals', true),
    (NEW.id, 'Office Supplies', true),
    (NEW.id, 'Software', true),
    (NEW.id, 'Training', true),
    (NEW.id, 'Accommodation', true),
    (NEW.id, 'Client Entertainment', true),
    (NEW.id, 'Other', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_expense_categories ON public.clients;
CREATE TRIGGER trg_seed_default_expense_categories
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.seed_default_expense_categories();