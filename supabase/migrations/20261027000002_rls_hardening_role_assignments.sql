-- JanSetu V1: RLS hardening, privileged-column protection, and role_assignments.
-- Safe to run after 20261027000001_initial_schema.sql.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'representative', 'department_official')),
  constituency TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON public.role_assignments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_assignments_unique_scope
  ON public.role_assignments (
    user_id,
    role,
    COALESCE(constituency, ''),
    COALESCE(department_id::text, '')
  );

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_constituency()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT constituency FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_constituency() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_department_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_constituency() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_department_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Access Denied: Users are not permitted to alter their own role.';
    END IF;
    IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
      RAISE EXCEPTION 'Access Denied: Users cannot change department assignment.';
    END IF;
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      RAISE EXCEPTION 'Access Denied: Users cannot change verification status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_protection ON public.profiles;
DROP TRIGGER IF EXISTS enforce_privileged_profile_fields ON public.profiles;
CREATE TRIGGER enforce_privileged_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_privileged_profile_changes();

DROP POLICY IF EXISTS "Representatives can view constituency citizen profiles" ON public.profiles;
CREATE POLICY "Representatives can view constituency citizen profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'representative'
    AND public.current_user_constituency() IS NOT NULL
    AND public.current_user_constituency() = constituency
  );

DROP POLICY IF EXISTS "Officials can view assigned complainants" ON public.profiles;
CREATE POLICY "Officials can view assigned complainants"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'department_official'
    AND public.current_user_department_id() IS NOT NULL
    AND public.current_user_department_id() = department_id
  );

DROP POLICY IF EXISTS "Users can view own role assignments" ON public.role_assignments;
CREATE POLICY "Users can view own role assignments"
  ON public.role_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Citizens can view own complaints" ON public.complaints;
CREATE POLICY "Citizens can view own complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    auth.uid() = citizen_id
    OR (
      public.current_user_role() = 'representative'
      AND (
        public.current_user_constituency() = constituency
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.district = public.complaints.district
        )
      )
    )
    OR (
      public.current_user_role() = 'department_official'
      AND public.current_user_department_id() = department_id
    )
  );

DROP POLICY IF EXISTS "Officials can update assigned complaints" ON public.complaints;
CREATE POLICY "Officials can update assigned complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'department_official'
    AND public.current_user_department_id() = department_id
  )
  WITH CHECK (
    public.current_user_role() = 'department_official'
    AND public.current_user_department_id() = department_id
  );

DROP POLICY IF EXISTS "Representatives can create announcements" ON public.announcements;
CREATE POLICY "Representatives can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.current_user_role() = 'representative'
  );

DROP POLICY IF EXISTS "Officials and Representatives can manage projects" ON public.public_projects;
DROP POLICY IF EXISTS "Officials and Representatives can insert projects" ON public.public_projects;
DROP POLICY IF EXISTS "Officials and Representatives can update projects" ON public.public_projects;

CREATE POLICY "Officials and Representatives can insert projects"
  ON public.public_projects FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() IN ('representative', 'department_official'));

CREATE POLICY "Officials and Representatives can update projects"
  ON public.public_projects FOR UPDATE
  TO authenticated
  USING (public.current_user_role() IN ('representative', 'department_official'))
  WITH CHECK (public.current_user_role() IN ('representative', 'department_official'));

COMMENT ON TABLE public.role_assignments IS
  'Trusted record of authorized roles. Client users cannot insert or update this table; administrators apply changes in the SQL editor or with the service role.';

COMMENT ON TABLE public.complaints IS
  'Foundation for Phase 2 complaint intake. Status history, upvotes, and attachments will be added later.';

-- Planned later-phase tables (not created in V1):
-- complaint_status_history, complaint_upvotes, surveys, survey_responses,
-- project_milestones, notifications, emergency_contacts.
