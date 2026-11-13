-- ====================================================================
-- JanSetu Platform: Complete Feature Integration & Database Stabilization
-- File: supabase/migrations/20261113000002_complete_jansetu_platform.sql
-- ====================================================================

BEGIN;

-- 1. EXTEND PROFILES TABLE WITH AVATAR, PREFERENCES & DEACTIVATION
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"email_notifications": true, "status_alerts": true, "announcements": true}'::jsonb,
ADD COLUMN IF NOT EXISTS deactivation_requested BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- 2. EXTEND COMPLAINTS TABLE WITH ATTACHMENT FIELDS
ALTER TABLE public.complaints
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS resolution_attachment_url TEXT;

-- 3. COMMUNITY GRIEVANCE UPVOTES TABLE
CREATE TABLE IF NOT EXISTS public.complaint_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_complaint_citizen_upvote UNIQUE (complaint_id, citizen_id)
);

CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_complaint ON public.complaint_upvotes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_citizen ON public.complaint_upvotes(citizen_id);

ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view complaint upvotes" ON public.complaint_upvotes;
CREATE POLICY "Authenticated users can view complaint upvotes"
    ON public.complaint_upvotes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Citizens can insert own upvotes" ON public.complaint_upvotes;
CREATE POLICY "Citizens can insert own upvotes"
    ON public.complaint_upvotes FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = citizen_id
        AND public.current_user_role() = 'citizen'
    );

DROP POLICY IF EXISTS "Citizens can remove own upvotes" ON public.complaint_upvotes;
CREATE POLICY "Citizens can remove own upvotes"
    ON public.complaint_upvotes FOR DELETE
    TO authenticated
    USING (
        auth.uid() = citizen_id
    );

-- 4. CONSTITUENCY SURVEYS & POLLS TABLE
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    constituency TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"id": 0, "text": "Option A"}, {"id": 1, "text": "Option B"}]
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_surveys_constituency ON public.surveys(constituency);
CREATE INDEX IF NOT EXISTS idx_surveys_author ON public.surveys(author_id);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view surveys in their constituency" ON public.surveys;
CREATE POLICY "Authenticated users can view surveys in their constituency"
    ON public.surveys FOR SELECT
    TO authenticated
    USING (
        constituency = public.current_user_constituency()
        OR public.current_user_role() = 'representative'
        OR public.current_user_constituency() IS NULL
    );

DROP POLICY IF EXISTS "Representatives can create surveys in their constituency" ON public.surveys;
CREATE POLICY "Representatives can create surveys in their constituency"
    ON public.surveys FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND public.current_user_role() = 'representative'
        AND constituency = public.current_user_constituency()
    );

DROP POLICY IF EXISTS "Representatives can update their own surveys" ON public.surveys;
CREATE POLICY "Representatives can update their own surveys"
    ON public.surveys FOR UPDATE
    TO authenticated
    USING (
        author_id = auth.uid()
        AND public.current_user_role() = 'representative'
    )
    WITH CHECK (
        author_id = auth.uid()
        AND public.current_user_role() = 'representative'
    );

-- 5. SURVEY / POLL VOTES TABLE
CREATE TABLE IF NOT EXISTS public.survey_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_option_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_survey_citizen_vote UNIQUE (survey_id, citizen_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_votes_survey ON public.survey_votes(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_votes_citizen ON public.survey_votes(citizen_id);

ALTER TABLE public.survey_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view survey votes" ON public.survey_votes;
CREATE POLICY "Authenticated users can view survey votes"
    ON public.survey_votes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Citizens can cast vote in constituency survey" ON public.survey_votes;
CREATE POLICY "Citizens can cast vote in constituency survey"
    ON public.survey_votes FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = citizen_id
        AND public.current_user_role() = 'citizen'
    );

-- 6. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('complaint_status', 'complaint_assignment', 'announcement', 'poll', 'system', 'project')),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- System functions or authenticated users can insert notifications for recipients
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 7. AUTOMATED NOTIFICATION TRIGGERS
-- A. Trigger for Complaint Submissions (Citizen Confirmation)
CREATE OR REPLACE FUNCTION public.handle_complaint_submission_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        link
    )
    VALUES (
        NEW.citizen_id,
        'Grievance Registered Successfully',
        'Your complaint "' || SUBSTRING(NEW.title FROM 1 FOR 50) || '" has been submitted under tracking reference ' || COALESCE(NEW.tracking_id, 'JS-PENDING') || '.',
        'complaint_status',
        '#my-complaints'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_complaint_submitted_notification ON public.complaints;
CREATE TRIGGER trigger_complaint_submitted_notification
    AFTER INSERT ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_complaint_submission_notification();

-- B. Trigger for Complaint Status Updates & Resolution Notes
CREATE OR REPLACE FUNCTION public.handle_complaint_status_update_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status_label TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.resolution_notes IS DISTINCT FROM NEW.resolution_notes THEN
        v_status_label := REPLACE(INITCAP(REPLACE(NEW.status, '_', ' ')), 'In Progress', 'In Progress');
        
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            link
        )
        VALUES (
            NEW.citizen_id,
            'Grievance Status Updated: ' || v_status_label,
            'Your complaint "' || SUBSTRING(NEW.title FROM 1 FOR 50) || '" (Tracking ID: ' || COALESCE(NEW.tracking_id, 'JS-COMPLAINT') || ') status has been updated to ' || v_status_label || '.' ||
            CASE WHEN NEW.resolution_notes IS NOT NULL AND NEW.resolution_notes <> '' THEN ' Note: ' || SUBSTRING(NEW.resolution_notes FROM 1 FOR 100) ELSE '' END,
            'complaint_status',
            '#my-complaints'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_complaint_status_update_notification ON public.complaints;
CREATE TRIGGER trigger_complaint_status_update_notification
    AFTER UPDATE ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_complaint_status_update_notification();

-- C. Trigger for Announcements: Notify constituents
CREATE OR REPLACE FUNCTION public.handle_announcement_broadcast_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT
        p.id,
        'Official Bulletin: ' || SUBSTRING(NEW.title FROM 1 FOR 50),
        SUBSTRING(NEW.content FROM 1 FOR 140) || '...',
        'announcement',
        '#announcements'
    FROM public.profiles p
    WHERE p.role = 'citizen'
      AND (NEW.target_constituency IS NULL OR p.constituency = NEW.target_constituency)
    LIMIT 200; -- Guard rail for batch size
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_announcement_notification ON public.announcements;
CREATE TRIGGER trigger_announcement_notification
    AFTER INSERT ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_announcement_broadcast_notification();

-- 8. UPDATE COMPLAINT PERMISSIONS TO ALLOW REPRESENTATIVE FORWARDING & DEPT RESOLUTION PROOF
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

    -- A. CITIZEN EXPLICIT REJECTION
    IF v_role = 'citizen' THEN
      RAISE EXCEPTION 'Access Denied: Citizens are not permitted to update complaints.';
    END IF;

    -- B. REPRESENTATIVE STRICT WHITELIST
    -- Permitted to update status, resolution_notes, and assign/forward department_id
    IF v_role = 'representative' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'resolution_notes', 'department_id', 'resolved_at', 'updated_at'])
         IS DISTINCT FROM 
         (to_jsonb(OLD) - ARRAY['status', 'resolution_notes', 'department_id', 'resolved_at', 'updated_at']) THEN
        RAISE EXCEPTION 'Access Denied: Representatives may only update complaint status, department assignment, and resolution notes.';
      END IF;

      IF OLD.resolved_at IS DISTINCT FROM NEW.resolved_at AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Access Denied: resolved_at cannot be directly updated.';
      END IF;

    -- C. DEPARTMENT OFFICIAL STRICT WHITELIST
    -- Permitted to update workflow fields (status, resolution_notes, resolution_attachment_url)
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

  -- Lifecycle management for resolved_at
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

-- 9. ALLOW CITIZENS TO VIEW COMMUNITY COMPLAINTS IN THEIR CONSTITUENCY / DISTRICT
-- This allows upvoting and civic transparency
DROP POLICY IF EXISTS "Scoped users can view complaints" ON public.complaints;
CREATE POLICY "Scoped users can view complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    -- Citizen views own complaints OR complaints in their district/constituency (for community transparency)
    (
      public.current_user_role() = 'citizen'
      AND (
        auth.uid() = citizen_id
        OR constituency = public.current_user_constituency()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.district = public.complaints.district
        )
      )
    )
    OR (
      public.current_user_role() = 'representative'
      AND public.current_user_constituency() IS NOT NULL
      AND public.current_user_constituency() = constituency
    )
    OR (
      public.current_user_role() = 'department_official'
      AND public.current_user_department_id() IS NOT NULL
      AND public.current_user_department_id() = department_id
    )
  );

-- 10. SEED CORE DEPARTMENTS (IDEMPOTENT)
INSERT INTO public.departments (name, code, description, jurisdiction)
VALUES
    ('Public Works Department (PWD)', 'PWD', 'Responsible for roads, bridges, public buildings, and civic structural infrastructure.', 'State & District PWD Division'),
    ('Jal Sansthan / Water Supply Board', 'WATER', 'Responsible for potable water distribution, pipeline maintenance, and sewage control.', 'Municipal Water Authority'),
    ('Municipal Corporation & Sanitation', 'MUNICIPAL', 'Solid waste management, garbage collection, street lighting, and urban cleanliness.', 'City Municipal Council'),
    ('Electricity Distribution Board', 'POWER', 'Power distribution, transformer maintenance, load management, and electrical safety.', 'Discom Urban & Rural Sub-division'),
    ('Public Health & Community Medicine', 'HEALTH', 'Primary healthcare centers, disease prevention, immunization, and community hygiene.', 'District Chief Medical Office'),
    ('Education & School Infrastructure', 'EDUCATION', 'Government school maintenance, student amenities, and public library services.', 'District Basic Education Office')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    jurisdiction = EXCLUDED.jurisdiction;

COMMIT;
