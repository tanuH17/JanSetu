-- JanSetu V1: constrain dormant module policies to the user's trusted assignments.
-- Apply after migrations 20261027000001 and 20261027000002.

CREATE OR REPLACE FUNCTION public.prevent_privileged_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF OLD.role IS DISTINCT FROM NEW.role
       OR OLD.department_id IS DISTINCT FROM NEW.department_id
       OR OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      RAISE EXCEPTION 'Access denied: privileged profile fields cannot be changed by the account holder.';
    END IF;

    -- An elevated account cannot change the scope that grants its access.
    IF OLD.role IN ('representative', 'department_official')
       AND (OLD.state IS DISTINCT FROM NEW.state
         OR OLD.district IS DISTINCT FROM NEW.district
         OR OLD.constituency IS DISTINCT FROM NEW.constituency) THEN
      RAISE EXCEPTION 'Access denied: authorized jurisdiction is managed by an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Officials may see complaint records only for their assigned department.
DROP POLICY IF EXISTS "Citizens can view own complaints" ON public.complaints;
CREATE POLICY "Scoped users can view complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    auth.uid() = citizen_id
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

-- Representatives cannot broaden visibility by matching every complaint in their district.
DROP POLICY IF EXISTS "Representatives can view constituency citizen profiles" ON public.profiles;
CREATE POLICY "Representatives can view constituency citizen profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() = 'representative'
    AND public.current_user_constituency() IS NOT NULL
    AND public.current_user_constituency() = constituency
  );

-- Department officers do not get broad profile access from matching a citizen's department field.
DROP POLICY IF EXISTS "Officials can view assigned complainants" ON public.profiles;

-- When department status updates are enabled in a later phase, assigned officials
-- may change workflow fields without rewriting a citizen's original report.
CREATE OR REPLACE FUNCTION public.protect_complaint_report_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.current_user_role() = 'department_official'
     AND (
       OLD.citizen_id IS DISTINCT FROM NEW.citizen_id
       OR OLD.title IS DISTINCT FROM NEW.title
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.category IS DISTINCT FROM NEW.category
       OR OLD.department_id IS DISTINCT FROM NEW.department_id
       OR OLD.district IS DISTINCT FROM NEW.district
       OR OLD.constituency IS DISTINCT FROM NEW.constituency
       OR OLD.landmark IS DISTINCT FROM NEW.landmark
       OR OLD.priority IS DISTINCT FROM NEW.priority
       OR OLD.assigned_official_id IS DISTINCT FROM NEW.assigned_official_id
     ) THEN
    RAISE EXCEPTION 'Department officials may only update complaint workflow fields.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_complaint_report_fields ON public.complaints;
CREATE TRIGGER protect_complaint_report_fields
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.protect_complaint_report_fields();

-- Announcement creation is currently dormant; if enabled, representatives may only target
-- their own authorized constituency. Public announcements remain readable to authenticated users.
DROP POLICY IF EXISTS "Representatives can create announcements" ON public.announcements;
CREATE POLICY "Representatives can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.current_user_role() = 'representative'
    AND target_constituency IS NOT DISTINCT FROM public.current_user_constituency()
  );

-- Replace broad role-only project editing with assignment-scoped policies.
DROP POLICY IF EXISTS "Officials and Representatives can insert projects" ON public.public_projects;
DROP POLICY IF EXISTS "Officials and Representatives can update projects" ON public.public_projects;

CREATE POLICY "Authorized users can insert scoped projects"
  ON public.public_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.current_user_role() = 'representative'
      AND public.current_user_constituency() IS NOT NULL
      AND constituency = public.current_user_constituency()
    )
    OR (
      public.current_user_role() = 'department_official'
      AND public.current_user_department_id() IS NOT NULL
      AND department_id = public.current_user_department_id()
    )
  );

CREATE POLICY "Authorized users can update scoped projects"
  ON public.public_projects FOR UPDATE
  TO authenticated
  USING (
    (
      public.current_user_role() = 'representative'
      AND public.current_user_constituency() IS NOT NULL
      AND constituency = public.current_user_constituency()
    )
    OR (
      public.current_user_role() = 'department_official'
      AND public.current_user_department_id() IS NOT NULL
      AND department_id = public.current_user_department_id()
    )
  )
  WITH CHECK (
    (
      public.current_user_role() = 'representative'
      AND public.current_user_constituency() IS NOT NULL
      AND constituency = public.current_user_constituency()
    )
    OR (
      public.current_user_role() = 'department_official'
      AND public.current_user_department_id() IS NOT NULL
      AND department_id = public.current_user_department_id()
    )
  );

COMMENT ON TABLE public.role_assignments IS
  'Trusted administrative audit records for elevated access. Profile role and scope remain protected authorization inputs; users cannot write assignments.';
