-- Tighten the end-to-end V1 workflows added by the preceding feature migrations.
-- Apply after 20261117000001_add_coordinates_and_multimedia.sql.

BEGIN;

-- Project form fields and canonical values already used by the original schema.
ALTER TABLE public.public_projects
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS location_text TEXT,
  ADD COLUMN IF NOT EXISTS expected_completion DATE;

-- Keep complaint history append-only from the browser; rows are written by triggers.
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('submitted', 'status_change', 'assignment', 'priority_change', 'resolution_note')),
  old_status TEXT,
  new_status TEXT,
  old_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  new_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_created
  ON public.complaint_status_history(complaint_id, created_at DESC);
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View history for visible complaints" ON public.complaint_status_history;
CREATE POLICY "View history for visible complaints"
  ON public.complaint_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id
    )
  );

CREATE OR REPLACE FUNCTION public.record_complaint_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, new_status, new_department_id, note)
    VALUES
      (NEW.id, auth.uid(), 'submitted', NEW.status, NEW.department_id, 'Complaint submitted');
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, auth.uid(), 'status_change', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  ELSIF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, auth.uid(), 'assignment', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, auth.uid(), 'priority_change', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
  ELSIF OLD.resolution_notes IS DISTINCT FROM NEW.resolution_notes THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, auth.uid(), 'resolution_note', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS complaint_history_after_insert ON public.complaints;
CREATE TRIGGER complaint_history_after_insert
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_complaint_history();
DROP TRIGGER IF EXISTS complaint_history_after_update ON public.complaints;
CREATE TRIGGER complaint_history_after_update
  AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_complaint_history();

-- Enforce lifecycle transitions in PostgreSQL in addition to the route guards.
CREATE OR REPLACE FUNCTION public.enforce_complaint_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.current_user_role();
  v_allowed BOOLEAN := false;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Dashboard SQL Editor and service-role maintenance can repair records.
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'representative' THEN
    v_allowed := (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'assigned', 'rejected'))
      OR (OLD.status = 'under_review' AND NEW.status IN ('assigned', 'rejected'))
      OR (OLD.status = 'assigned' AND NEW.status IN ('under_review', 'rejected'));
  ELSIF v_role = 'department_official' THEN
    v_allowed := (OLD.status IN ('assigned', 'under_review') AND NEW.status IN ('in_progress', 'rejected'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('resolved', 'rejected'));
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'This role cannot make the requested complaint status transition.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_complaint_status_transition ON public.complaints;
CREATE TRIGGER enforce_complaint_status_transition
  BEFORE UPDATE OF status ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.enforce_complaint_status_transition();

-- Assignment notifications are delivered only to the assigned department and constituency representative.
CREATE OR REPLACE FUNCTION public.notify_complaint_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.department_id IS DISTINCT FROM OLD.department_id AND NEW.department_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT p.id, 'Complaint assigned to your department',
           'Complaint ' || COALESCE(NEW.tracking_id, NEW.id::text) || ' has been assigned to your department.',
           'complaint_assignment', '#department-complaints'
    FROM public.profiles p
    WHERE p.role = 'department_official' AND p.department_id = NEW.department_id;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT p.id, 'Complaint assigned to a department',
           'Complaint ' || COALESCE(NEW.tracking_id, NEW.id::text) || ' was assigned to a department.',
           'complaint_assignment', '#complaints-section'
    FROM public.profiles p
    WHERE p.role = 'representative' AND p.constituency = NEW.constituency;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS complaint_assignment_notifications ON public.complaints;
CREATE TRIGGER complaint_assignment_notifications
  AFTER UPDATE OF department_id ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.notify_complaint_assignment();

-- Notifications are written by trusted triggers/functions. A user can only mark their own as read.
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.protect_notification_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.user_id
     AND (to_jsonb(NEW) - 'is_read') IS DISTINCT FROM (to_jsonb(OLD) - 'is_read') THEN
    RAISE EXCEPTION 'Notification content is read-only.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_notification_content ON public.notifications;
CREATE TRIGGER protect_notification_content
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.protect_notification_content();

-- Hide individual survey votes; expose only aggregate counts through a scoped RPC.
DROP POLICY IF EXISTS "Authenticated users can view survey votes" ON public.survey_votes;
CREATE POLICY "Citizens can view own survey vote"
  ON public.survey_votes FOR SELECT
  TO authenticated
  USING (citizen_id = auth.uid());
DROP POLICY IF EXISTS "Citizens can insert survey votes" ON public.survey_votes;
DROP POLICY IF EXISTS "Citizens can vote in active surveys" ON public.survey_votes;
CREATE POLICY "Citizens can vote in active surveys"
  ON public.survey_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    citizen_id = auth.uid()
    AND public.current_user_role() = 'citizen'
    AND selected_option_index >= 0
    AND EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
        AND s.is_active = true
        AND s.constituency = public.current_user_constituency()
        AND selected_option_index < jsonb_array_length(s.options)
    )
  );

CREATE OR REPLACE FUNCTION public.get_survey_vote_counts(p_survey_ids UUID[])
RETURNS TABLE(survey_id UUID, selected_option_index INT, vote_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[] := COALESCE(p_survey_ids, ARRAY[]::UUID[]);
BEGIN
  IF auth.uid() IS NULL OR cardinality(v_ids) > 20 THEN
    RAISE EXCEPTION 'Invalid or unauthorized survey query.';
  END IF;
  RETURN QUERY
  SELECT v.survey_id, v.selected_option_index, count(*)
  FROM public.survey_votes v
  JOIN public.surveys s ON s.id = v.survey_id
  WHERE v.survey_id = ANY(v_ids)
    AND s.constituency = public.current_user_constituency()
  GROUP BY v.survey_id, v.selected_option_index;
END;
$$;
REVOKE ALL ON FUNCTION public.get_survey_vote_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_survey_vote_counts(UUID[]) TO authenticated;

-- Community vote counts never return the identities of voters.
DROP POLICY IF EXISTS "Authenticated users can view complaint upvotes" ON public.complaint_upvotes;
CREATE POLICY "Citizens can view own complaint upvotes"
  ON public.complaint_upvotes FOR SELECT
  TO authenticated
  USING (citizen_id = auth.uid());
DROP POLICY IF EXISTS "Citizens can insert own upvotes" ON public.complaint_upvotes;
CREATE POLICY "Citizens can upvote visible public complaints"
  ON public.complaint_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (
    citizen_id = auth.uid()
    AND public.current_user_role() = 'citizen'
    AND EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_id AND c.citizen_id <> auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.get_complaint_upvote_counts(p_complaint_ids UUID[])
RETURNS TABLE(complaint_id UUID, vote_count BIGINT, viewer_has_voted BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[] := COALESCE(p_complaint_ids, ARRAY[]::UUID[]);
  v_role TEXT := public.current_user_role();
  v_constituency TEXT := public.current_user_constituency();
  v_department UUID := public.current_user_department_id();
  v_district TEXT;
BEGIN
  IF auth.uid() IS NULL OR cardinality(v_ids) > 100 THEN
    RAISE EXCEPTION 'Invalid or unauthorized complaint query.';
  END IF;
  SELECT p.district INTO v_district FROM public.profiles p WHERE p.id = auth.uid();
  RETURN QUERY
  SELECT c.id, count(u.id), COALESCE(bool_or(u.citizen_id = auth.uid()), false)
  FROM public.complaints c
  LEFT JOIN public.complaint_upvotes u ON u.complaint_id = c.id
  WHERE c.id = ANY(v_ids)
    AND (
      (v_role = 'citizen' AND (c.citizen_id = auth.uid() OR c.constituency = v_constituency OR c.district = v_district))
      OR (v_role = 'representative' AND c.constituency = v_constituency)
      OR (v_role = 'department_official' AND c.department_id = v_department)
    )
  GROUP BY c.id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_complaint_upvote_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_complaint_upvote_counts(UUID[]) TO authenticated;

-- Public citizens get a privacy-filtered feed. The view runs with its owner privileges,
-- so the jurisdiction predicate is explicit and sensitive complaint fields are omitted.
CREATE OR REPLACE VIEW public.public_complaint_feed
WITH (security_barrier = true)
AS
SELECT
  c.id, c.tracking_id, c.title, c.category, c.priority, c.status,
  c.district, c.constituency, c.latitude, c.longitude,
  c.department_id, d.name AS department_name, d.code AS department_code,
  c.created_at, c.updated_at, c.resolved_at
FROM public.complaints c
LEFT JOIN public.departments d ON d.id = c.department_id
WHERE
  (public.current_user_role() = 'citizen' AND (
    c.citizen_id = auth.uid()
    OR c.constituency = public.current_user_constituency()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.district = c.district)
  ))
  OR (public.current_user_role() = 'representative' AND c.constituency = public.current_user_constituency())
  OR (public.current_user_role() = 'department_official' AND c.department_id = public.current_user_department_id());
REVOKE ALL ON public.public_complaint_feed FROM PUBLIC;
GRANT SELECT ON public.public_complaint_feed TO authenticated;

-- Private media buckets. Object paths start with the uploader's auth UUID.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('complaint-attachments', 'complaint-attachments', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('project-media', 'project-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can read authorized avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Public can view complaint attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload complaint attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own complaint attachments" ON storage.objects;
CREATE POLICY "Users can read complaint attachments they can access"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'complaint-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.complaints c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND (c.attachment_url = name OR c.resolution_attachment_url = name)
      )
    )
  );
CREATE POLICY "Users can upload own complaint attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own complaint attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own complaint attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'complaint-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read project media" ON storage.objects;
CREATE POLICY "Users can read project media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.public_projects p
        WHERE p.id::text = (storage.foldername(name))[2]
          AND (p.project_image_url = name OR p.video_url = name)
      )
    )
  );
CREATE POLICY "Users can upload own project media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own project media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'project-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'project-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own project media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-media' AND (storage.foldername(name))[1] = auth.uid()::text);

COMMIT;
