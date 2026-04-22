-- Extend existing notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid;

ALTER TABLE public.notifications ALTER COLUMN client_id DROP NOT NULL;

-- Helper to create a notification (SECURITY DEFINER so any user can notify others via app flows)
CREATE OR REPLACE FUNCTION public.create_notification(
  _recipient_user_id uuid,
  _title text,
  _body text DEFAULT NULL,
  _category text DEFAULT 'general',
  _severity text DEFAULT 'info',
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _action_url text DEFAULT NULL,
  _client_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _recipient_user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (
    client_id, user_id, actor_user_id,
    title, body, category, severity,
    entity_type, entity_id, link
  ) VALUES (
    _client_id, _recipient_user_id, auth.uid(),
    _title, _body, _category, _severity,
    _entity_type, _entity_id, _action_url
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Notify all admins of a client
CREATE OR REPLACE FUNCTION public.notify_client_admins(
  _client_id uuid,
  _title text,
  _body text DEFAULT NULL,
  _category text DEFAULT 'general',
  _severity text DEFAULT 'info',
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _action_url text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_count integer := 0;
BEGIN
  IF _client_id IS NULL THEN RETURN 0; END IF;
  FOR v_user IN
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE client_id = _client_id AND role = 'admin'::public.app_role
  LOOP
    PERFORM public.create_notification(
      v_user.user_id, _title, _body, _category, _severity,
      _entity_type, _entity_id, _action_url, _client_id
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Allow recipients to delete their own notifications (dismiss)
DROP POLICY IF EXISTS "user delete own notifications" ON public.notifications;
CREATE POLICY "user delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;