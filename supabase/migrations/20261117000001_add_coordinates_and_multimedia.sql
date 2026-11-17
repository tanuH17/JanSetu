-- ====================================================================
-- JanSetu Platform: Verified Migration for Geographical Coordinates & Multimedia Evidence
-- File: JanSetu/supabase/migrations/20261117000001_add_coordinates_and_multimedia.sql
-- ====================================================================

BEGIN;

-- 1. ADD GEOGRAPHICAL COORDINATES TO COMPLAINTS TABLE
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Index for geographical queries and heatmaps
CREATE INDEX IF NOT EXISTS idx_complaints_geo ON public.complaints(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. ADD GEOGRAPHICAL COORDINATES TO PUBLIC PROJECTS TABLE
ALTER TABLE public.public_projects
ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS project_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_geo ON public.public_projects(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. ENSURE PROTECT COMPLAINT TRIGGER MAINTAINS COORDINATE INTEGRITY
CREATE OR REPLACE FUNCTION public.protect_complaint_report_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_is_maintenance BOOLEAN := false;
BEGIN
  IF (session_user IN ('postgres', 'supabase_admin') AND (auth.role() IS NULL OR auth.role() = ''))
     OR (auth.role() = 'service_role' OR COALESCE(auth.jwt()->>'role', '') = 'service_role') THEN
    v_is_maintenance := true;
  END IF;

  IF NOT v_is_maintenance THEN
    IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
      RAISE EXCEPTION 'Access Denied: Caller identity cannot be verified for complaint updates.';
    END IF;

    v_role := public.current_user_role();

    IF v_role = 'citizen' THEN
      RAISE EXCEPTION 'Access Denied: Citizens are not permitted to update complaints.';
    END IF;

    IF v_role = 'representative' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'resolution_notes', 'department_id', 'resolved_at', 'updated_at'])
         IS DISTINCT FROM 
         (to_jsonb(OLD) - ARRAY['status', 'resolution_notes', 'department_id', 'resolved_at', 'updated_at']) THEN
        RAISE EXCEPTION 'Access Denied: Representatives may only update complaint status, department assignment, and resolution notes.';
      END IF;

      IF OLD.resolved_at IS DISTINCT FROM NEW.resolved_at AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Access Denied: resolved_at cannot be directly updated.';
      END IF;

    ELSIF v_role = 'department_official' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'resolution_notes', 'resolution_attachment_url', 'resolved_at', 'updated_at'])
         IS DISTINCT FROM 
         (to_jsonb(OLD) - ARRAY['status', 'resolution_notes', 'resolution_attachment_url', 'resolved_at', 'updated_at']) THEN
        RAISE EXCEPTION 'Department officials may only update complaint workflow fields and resolution evidence.';
      END IF;

      IF OLD.resolved_at IS DISTINCT FROM NEW.resolved_at AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Access Denied: resolved_at cannot be directly updated.';
      END IF;

    ELSE
      RAISE EXCEPTION 'Access Denied: Unauthorized role for complaint updates.';
    END IF;
  END IF;

  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at := now();
  ELSIF NEW.status IS DISTINCT FROM 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at := NULL;
  ELSE
    NEW.resolved_at := OLD.resolved_at;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
