CREATE OR REPLACE FUNCTION public.sync_request_status_to_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Map request status → entity status
  v_status := CASE NEW.status
    WHEN 'approved' THEN 'approved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'paid'     THEN 'paid'
    WHEN 'pending'  THEN 'pending'
    ELSE NULL
  END;

  IF v_status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.module = 'expense' THEN
    UPDATE public.expenses
       SET status = v_status,
           approved_at = CASE WHEN v_status = 'approved' THEN now() ELSE approved_at END,
           updated_at = now()
     WHERE id = NEW.entity_id;
  ELSIF NEW.module = 'advance' THEN
    UPDATE public.advances
       SET status = v_status,
           updated_at = now()
     WHERE id = NEW.entity_id;
  ELSIF NEW.module = 'loan' THEN
    UPDATE public.loans
       SET status = CASE WHEN v_status = 'approved' THEN 'active' ELSE v_status END,
           updated_at = now()
     WHERE id = NEW.entity_id;
  ELSIF NEW.module = 'leave' THEN
    UPDATE public.leave_requests
       SET status = v_status,
           updated_at = now()
     WHERE id = NEW.entity_id;
  ELSIF NEW.module = 'asset' THEN
    UPDATE public.asset_requests
       SET status = CASE WHEN v_status = 'approved' THEN 'approved' WHEN v_status = 'rejected' THEN 'rejected' ELSE status END,
           updated_at = now()
     WHERE id = NEW.entity_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_status ON public.request_approvals;
CREATE TRIGGER trg_sync_request_status
AFTER UPDATE OF status ON public.request_approvals
FOR EACH ROW
EXECUTE FUNCTION public.sync_request_status_to_entity();