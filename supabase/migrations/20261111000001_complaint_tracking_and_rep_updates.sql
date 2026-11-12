-- ====================================================================
-- JanSetu Platform: Verified Migration for Complaint Tracking & Representative Updates
-- File: supabase/migrations/20261111000001_complaint_tracking_and_rep_updates.sql
-- ====================================================================

BEGIN;

-- 1. ACQUIRE EXCLUSIVE TABLE LOCK TO BLOCK CONCURRENT INSERTS DURING MIGRATION
-- Permits concurrent SELECT queries; blocks concurrent INSERT/UPDATE/DELETE until COMMIT
LOCK TABLE public.complaints IN EXCLUSIVE MODE;


-- 2. ADD TRACKING_ID COLUMN IF NOT PRESENT (NON-DESTRUCTIVE)
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS tracking_id TEXT;


-- 3. CREATE DEDICATED SEQUENCE FOR MONOTONIC ZERO-COLLISION TRACKING IDS
CREATE SEQUENCE IF NOT EXISTS public.complaint_tracking_seq START WITH 10001;


-- 4. RERUN-SAFE CALIBRATION (STARTS AT 10001 IF CLEAN, NEVER MOVES BACKWARDS)
DO $$
DECLARE
  v_seq_last BIGINT;
  v_seq_called BOOLEAN;
  v_max_found BIGINT := 10000;
  v_has_existing_ids BOOLEAN := false;
  v_rec RECORD;
BEGIN
  -- Read current sequence state
  SELECT last_value, is_called INTO v_seq_last, v_seq_called 
  FROM public.complaint_tracking_seq;

  -- Scan existing non-empty tracking IDs for numeric suffixes
  FOR v_rec IN 
    SELECT SUBSTRING(tracking_id FROM '([0-9]+)$')::BIGINT AS num
    FROM public.complaints
    WHERE tracking_id IS NOT NULL 
      AND TRIM(tracking_id) <> ''
      AND tracking_id ~ '([0-9]+)$'
  LOOP
    v_has_existing_ids := true;
    IF v_rec.num > v_max_found THEN
      v_max_found := v_rec.num;
    END IF;
  END LOOP;

  -- Safe sequence position configuration:
  IF v_has_existing_ids THEN
    -- If existing tracking IDs exist, sequence must be at least v_max_found
    IF v_seq_called THEN
      v_max_found := GREATEST(v_max_found, v_seq_last);
    ELSE
      v_max_found := GREATEST(v_max_found, v_seq_last - 1);
    END IF;
    PERFORM setval('public.complaint_tracking_seq', v_max_found, true);
  ELSE
    -- No existing tracking IDs in the table:
    -- If sequence was never called and is at 10001, leave it ready to yield 10001 on first nextval()
    IF NOT v_seq_called AND v_seq_last = 10001 THEN
      NULL; -- Pristine: first nextval() yields exactly 10001
    ELSE
      -- On rerun where sequence was already called, do not rewind below 10000
      IF v_seq_last < 10000 THEN
        PERFORM setval('public.complaint_tracking_seq', 10000, true);
      END IF;
    END IF;
  END IF;
END $$;


-- 5. CAPTURE ORIGINAL TRIGGER STATES AND TEMPORARILY DISABLE FOR BACKFILL
CREATE TEMP TABLE IF NOT EXISTS _migration_trigger_state (
  tgname TEXT PRIMARY KEY,
  tgenabled TEXT NOT NULL
) ON COMMIT DROP;
TRUNCATE _migration_trigger_state;

DO $$
DECLARE
  v_updated_at_state TEXT;
  v_protect_state TEXT;
BEGIN
  -- 1. Verify set_complaints_updated_at exists and record its original tgenabled state
  SELECT tgenabled::TEXT INTO v_updated_at_state
  FROM pg_trigger 
  WHERE tgname = 'set_complaints_updated_at' 
    AND tgrelid = 'public.complaints'::regclass;

  IF v_updated_at_state IS NULL THEN
    RAISE EXCEPTION 'Safety check failed: Trigger set_complaints_updated_at is missing from public.complaints.';
  END IF;

  INSERT INTO _migration_trigger_state (tgname, tgenabled)
  VALUES ('set_complaints_updated_at', v_updated_at_state);

  -- Only disable if currently active (not already disabled 'D')
  IF v_updated_at_state <> 'D' THEN
    ALTER TABLE public.complaints DISABLE TRIGGER set_complaints_updated_at;
  END IF;

  -- 2. Check protect_complaint_report_fields if present and record its original state
  SELECT tgenabled::TEXT INTO v_protect_state
  FROM pg_trigger 
  WHERE tgname = 'protect_complaint_report_fields' 
    AND tgrelid = 'public.complaints'::regclass;

  IF v_protect_state IS NOT NULL THEN
    INSERT INTO _migration_trigger_state (tgname, tgenabled)
    VALUES ('protect_complaint_report_fields', v_protect_state);

    -- Only disable if currently active (not already disabled 'D')
    IF v_protect_state <> 'D' THEN
      ALTER TABLE public.complaints DISABLE TRIGGER protect_complaint_report_fields;
    END IF;
  END IF;
END $$;


-- 6. CONVERT EMPTY STRINGS TO NULL TO PREVENT UNIQUE CONFLICTS
UPDATE public.complaints
SET tracking_id = NULL
WHERE tracking_id IS NOT NULL AND TRIM(tracking_id) = '';


-- 7. DETERMINISTIC DEDUPLICATION (NEXTVAL CALLED EXACTLY ONCE PER ROW VIA CTE)
WITH ranked_duplicates AS (
  SELECT id, created_at,
         ROW_NUMBER() OVER (PARTITION BY tracking_id ORDER BY created_at ASC, id ASC) as rn
  FROM public.complaints
  WHERE tracking_id IS NOT NULL
),
duplicates_to_update AS (
  SELECT id, created_at, nextval('public.complaint_tracking_seq') AS seq_num
  FROM ranked_duplicates
  WHERE rn > 1
)
UPDATE public.complaints c
SET tracking_id = 'JS-' || TO_CHAR(dtu.created_at, 'YYYY') || '-' || 
                  CASE 
                    WHEN dtu.seq_num < 1000000 THEN LPAD(dtu.seq_num::TEXT, 6, '0')
                    ELSE dtu.seq_num::TEXT 
                  END
FROM duplicates_to_update dtu
WHERE c.id = dtu.id;


-- 8. SAFE BACKFILL FOR ALL NULL TRACKING IDS (NEXTVAL CALLED EXACTLY ONCE PER ROW VIA CTE)
WITH null_rows AS (
  SELECT id, created_at, nextval('public.complaint_tracking_seq') AS seq_num
  FROM public.complaints
  WHERE tracking_id IS NULL
)
UPDATE public.complaints c
SET tracking_id = 'JS-' || TO_CHAR(nr.created_at, 'YYYY') || '-' || 
                  CASE 
                    WHEN nr.seq_num < 1000000 THEN LPAD(nr.seq_num::TEXT, 6, '0')
                    ELSE nr.seq_num::TEXT 
                  END
FROM null_rows nr
WHERE c.id = nr.id;


-- 9. RESTORE ORIGINAL TRIGGER STATES IMMEDIATELY AFTER BACKFILL
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Verify set_complaints_updated_at was recorded
  IF NOT EXISTS (
    SELECT 1 FROM _migration_trigger_state WHERE tgname = 'set_complaints_updated_at'
  ) THEN
    RAISE EXCEPTION 'Safety check failed: Original state for set_complaints_updated_at was not recorded.';
  END IF;

  -- Restore each recorded trigger to its exact original state
  FOR v_rec IN SELECT tgname, tgenabled FROM _migration_trigger_state LOOP
    -- Verify the trigger still exists on public.complaints
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = v_rec.tgname 
        AND tgrelid = 'public.complaints'::regclass
    ) THEN
      RAISE EXCEPTION 'Safety check failed: Trigger % could not be found to restore.', v_rec.tgname;
    END IF;

    -- Restore to exact captured state:
    -- 'O' = origin/local (default enable)
    -- 'A' = always
    -- 'R' = replica
    -- 'D' = disabled
    IF v_rec.tgenabled = 'O' THEN
      EXECUTE format('ALTER TABLE public.complaints ENABLE TRIGGER %I;', v_rec.tgname);
    ELSIF v_rec.tgenabled = 'A' THEN
      EXECUTE format('ALTER TABLE public.complaints ENABLE ALWAYS TRIGGER %I;', v_rec.tgname);
    ELSIF v_rec.tgenabled = 'R' THEN
      EXECUTE format('ALTER TABLE public.complaints ENABLE REPLICA TRIGGER %I;', v_rec.tgname);
    ELSIF v_rec.tgenabled = 'D' THEN
      EXECUTE format('ALTER TABLE public.complaints DISABLE TRIGGER %I;', v_rec.tgname);
    ELSE
      RAISE EXCEPTION 'Safety check failed: Unexpected trigger state "%" for trigger %.', v_rec.tgenabled, v_rec.tgname;
    END IF;
  END LOOP;
END $$;


-- 10. ENFORCE NOT NULL ON TRACKING_ID (GUARANTEED SAFE AFTER COMPLETE BACKFILL)
ALTER TABLE public.complaints 
ALTER COLUMN tracking_id SET NOT NULL;


-- 11. DEEP INSPECTION & VERIFICATION OF TRACKING ID UNIQUE INDEX
DO $$
DECLARE
  v_idx RECORD;
  v_tracking_attnum SMALLINT;
  v_valid_index_exists BOOLEAN := false;
BEGIN
  SELECT attnum INTO v_tracking_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.complaints'::regclass AND attname = 'tracking_id';

  IF v_tracking_attnum IS NULL THEN
    RAISE EXCEPTION 'Internal error: column tracking_id not found on public.complaints.';
  END IF;

  FOR v_idx IN
    SELECT 
      c.relname AS index_name,
      nsp.nspname AS schema_name,
      t.relname AS table_name,
      i.indisunique,
      i.indisvalid,
      i.indisready,
      i.indnatts,
      i.indkey[0] AS col_attnum,
      i.indpred,
      i.indexprs
    FROM pg_class c
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    JOIN pg_index i ON i.indexrelid = c.oid
    JOIN pg_class t ON t.oid = i.indrelid
    WHERE c.relname = 'idx_complaints_tracking_id'
  LOOP
    IF v_idx.schema_name <> 'public' OR v_idx.table_name <> 'complaints' THEN
      RAISE EXCEPTION 'Conflicting index: idx_complaints_tracking_id exists on %.% instead of public.complaints.', 
        v_idx.schema_name, v_idx.table_name;
    END IF;

    IF NOT v_idx.indisunique THEN
      RAISE EXCEPTION 'Conflicting index: idx_complaints_tracking_id exists on public.complaints but is NOT unique.';
    END IF;

    IF NOT (v_idx.indisvalid AND v_idx.indisready) THEN
      RAISE EXCEPTION 'Invalid index: idx_complaints_tracking_id exists on public.complaints but is invalid or not ready.';
    END IF;

    IF v_idx.indnatts <> 1 OR v_idx.col_attnum <> v_tracking_attnum OR v_idx.indpred IS NOT NULL OR v_idx.indexprs IS NOT NULL THEN
      RAISE EXCEPTION 'Conflicting index: idx_complaints_tracking_id exists on public.complaints but does not index solely (tracking_id).';
    END IF;

    v_valid_index_exists := true;
  END LOOP;

  IF NOT v_valid_index_exists THEN
    CREATE UNIQUE INDEX idx_complaints_tracking_id ON public.complaints(tracking_id);
  END IF;
END $$;


-- 12. VERIFY AND ENFORCE STATUS COLUMN NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute 
    WHERE attrelid = 'public.complaints'::regclass 
      AND attname = 'status' 
      AND NOT attnotnull
  ) THEN
    UPDATE public.complaints SET status = 'submitted' WHERE status IS NULL;
    ALTER TABLE public.complaints ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;


-- 13. DATA-VALIDATED REPLACEMENT OF STATUS CHECK CONSTRAINT & MULTI-COLUMN INSPECTION
DO $$
DECLARE
  v_status_attnum SMALLINT;
  v_invalid_statuses TEXT;
  v_con RECORD;
BEGIN
  SELECT attnum INTO v_status_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.complaints'::regclass AND attname = 'status';

  IF v_status_attnum IS NULL THEN
    RAISE EXCEPTION 'Internal error: column status not found on public.complaints.';
  END IF;

  -- 1. Validate all existing records: must only contain approved values
  SELECT string_agg(DISTINCT status, ', ') INTO v_invalid_statuses
  FROM public.complaints
  WHERE status NOT IN ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected');

  IF v_invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Safety check failed: public.complaints contains unauthorized status values: "%". Aborting migration.', v_invalid_statuses;
  END IF;

  -- 2. Inspect any multi-column check constraints that touch status
  FOR v_con IN
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.complaints'::regclass 
      AND contype = 'c'
      AND v_status_attnum = ANY(conkey)
      AND cardinality(conkey) > 1
  LOOP
    RAISE EXCEPTION 'Conflicting constraint: Found unexpected multi-column check constraint "%": %', v_con.conname, v_con.def;
  END LOOP;

  -- 3. Safely drop any existing single-column CHECK constraint solely governing status
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.complaints'::regclass 
      AND contype = 'c'
      AND conkey = ARRAY[v_status_attnum]
  LOOP
    EXECUTE format('ALTER TABLE public.complaints DROP CONSTRAINT %I;', v_con.conname);
  END LOOP;

  -- 4. Apply the authoritative, canonical six-value constraint
  ALTER TABLE public.complaints 
  ADD CONSTRAINT complaints_status_check 
  CHECK (status IN ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected'));
END $$;


-- 14. TRIGGER FUNCTION: MANDATORY AUTOMATIC ID GENERATOR (MINIMUM 6 DIGITS, ZERO TRUNCATION)
CREATE OR REPLACE FUNCTION public.set_complaint_tracking_id()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
  v_seq_str TEXT;
BEGIN
  v_seq := nextval('public.complaint_tracking_seq');
  
  -- Pad with leading zeros up to 6 digits; never truncate numbers >= 1,000,000
  IF v_seq < 1000000 THEN
    v_seq_str := LPAD(v_seq::TEXT, 6, '0');
  ELSE
    v_seq_str := v_seq::TEXT;
  END IF;

  NEW.tracking_id := 'JS-' || TO_CHAR(NOW(), 'YYYY') || '-' || v_seq_str;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_complaint_tracking_id ON public.complaints;
CREATE TRIGGER trigger_set_complaint_tracking_id
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_complaint_tracking_id();


-- 15. HARDENED TRIGGER: EXPLICIT CITIZEN REJECTION, STRICT ROLE WHITELISTS, AND SECURE IDENTITY HANDLING
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
  -- 1. IDENTIFY TRUSTED DATABASE SESSIONS OR SERVICE ROLE MAINTENANCE
  -- session_user preserves the true connection initiator across SECURITY DEFINER calls
  IF (session_user IN ('postgres', 'supabase_admin') AND (auth.role() IS NULL OR auth.role() = ''))
     OR (auth.role() = 'service_role' OR COALESCE(auth.jwt()->>'role', '') = 'service_role') THEN
    v_is_maintenance := true;
  END IF;

  -- 2. ENFORCE ACCESS CONTROLS ON NON-MAINTENANCE CALLERS
  IF NOT v_is_maintenance THEN
    -- If caller identity cannot be verified (e.g. unauthenticated / anon), abort immediately
    IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
      RAISE EXCEPTION 'Access Denied: Caller identity cannot be verified for complaint updates.';
    END IF;

    v_role := public.current_user_role();

    -- A. CITIZEN EXPLICIT REJECTION
    -- Authenticated citizens are strictly prohibited from updating complaint records
    IF v_role = 'citizen' THEN
      RAISE EXCEPTION 'Access Denied: Citizens are not permitted to update complaints.';
    END IF;

    -- B. REPRESENTATIVE STRICT WHITELIST
    -- Permitted to update ONLY status and resolution_notes
    IF v_role = 'representative' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'resolution_notes', 'resolved_at', 'updated_at'])
         IS DISTINCT FROM 
         (to_jsonb(OLD) - ARRAY['status', 'resolution_notes', 'resolved_at', 'updated_at']) THEN
        RAISE EXCEPTION 'Access Denied: Representatives may only update complaint status and resolution notes.';
      END IF;

      -- Block direct modification of resolved_at when status did not transition
      IF OLD.resolved_at IS DISTINCT FROM NEW.resolved_at AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Access Denied: resolved_at cannot be directly updated.';
      END IF;

    -- C. DEPARTMENT OFFICIAL STRICT WHITELIST
    -- Permitted to update ONLY workflow fields (status and resolution_notes)
    ELSIF v_role = 'department_official' THEN
      IF (to_jsonb(NEW) - ARRAY['status', 'resolution_notes', 'resolved_at', 'updated_at'])
         IS DISTINCT FROM 
         (to_jsonb(OLD) - ARRAY['status', 'resolution_notes', 'resolved_at', 'updated_at']) THEN
        RAISE EXCEPTION 'Department officials may only update complaint workflow fields.';
      END IF;

      -- Block direct modification of resolved_at when status did not transition
      IF OLD.resolved_at IS DISTINCT FROM NEW.resolved_at AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Access Denied: resolved_at cannot be directly updated.';
      END IF;

    -- D. UNKNOWN / UNPERMITTED ROLE
    ELSE
      RAISE EXCEPTION 'Access Denied: Unauthorized role for complaint updates.';
    END IF;
  END IF;

  -- 3. AUTHORITATIVE LIFECYCLE MANAGEMENT FOR RESOLVED_AT (UTC-SAFE VIA NOW())
  -- Only this trigger can assign or clear resolved_at
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at := now();
  ELSIF NEW.status IS DISTINCT FROM 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at := NULL;
  ELSE
    -- Lock resolved_at to existing database value
    NEW.resolved_at := OLD.resolved_at;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists without dropping the original trigger object
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'protect_complaint_report_fields' 
      AND tgrelid = 'public.complaints'::regclass
  ) THEN
    CREATE TRIGGER protect_complaint_report_fields
      BEFORE UPDATE ON public.complaints
      FOR EACH ROW EXECUTE FUNCTION public.protect_complaint_report_fields();
  END IF;
END $$;


-- 16. CANONICAL RLS POLICIES FOR REPRESENTATIVES AND DEPARTMENT OFFICIALS
-- Re-applies both policies with exact canonical definitions
DROP POLICY IF EXISTS "Representatives can update constituency complaints" ON public.complaints;
CREATE POLICY "Representatives can update constituency complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (
    public.current_user_role() = 'representative'
    AND public.current_user_constituency() IS NOT NULL
    AND public.current_user_constituency() = constituency
  )
  WITH CHECK (
    public.current_user_role() = 'representative'
    AND public.current_user_constituency() IS NOT NULL
    AND public.current_user_constituency() = constituency
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


-- 17. PRECEDENCE-PRESERVING STRUCTURAL AUDIT OF UPDATE POLICIES (CASE-SENSITIVE)
DO $$
DECLARE
  v_auth_oid OID;
  v_total_update_policies INT;
  v_pol RECORD;
  v_raw_using TEXT;
  v_raw_check TEXT;
  v_clean_using TEXT;
  v_clean_check TEXT;
  v_dept_regex TEXT := '^\s*\(+\s*(\(?public\.)?current_user_role\(\)\s*=\s*''department_official''(::text)?\)?\s+AND\s+\(?(\(?public\.)?current_user_department_id\(\)\s*=\s*department_id\)?\s*\)+\s*$';
  v_rep_regex TEXT := '^\s*\(+\s*(\(?public\.)?current_user_role\(\)\s*=\s*''representative''(::text)?\)?\s+AND\s+\(?(\(?public\.)?current_user_constituency\(\)\s+IS\s+NOT\s+NULL\)?\s+AND\s+\(?(\(?public\.)?current_user_constituency\(\)\s*=\s*constituency\)?\s*\)+\s*$';
  v_has_dept_policy BOOLEAN := false;
  v_has_rep_policy BOOLEAN := false;
BEGIN
  -- 1. Retrieve OID of 'authenticated' role
  SELECT oid INTO v_auth_oid FROM pg_roles WHERE rolname = 'authenticated';
  IF v_auth_oid IS NULL THEN
    RAISE EXCEPTION 'Internal error: role "authenticated" not found in pg_roles.';
  END IF;

  -- 2. Verify total count of UPDATE and ALL policies on public.complaints
  -- Must be strictly 2. Any additional policy grants unauthorized access.
  SELECT COUNT(*) INTO v_total_update_policies
  FROM pg_policy
  WHERE polrelid = 'public.complaints'::regclass
    AND polcmd IN ('w', '*');

  IF v_total_update_policies <> 2 THEN
    RAISE EXCEPTION 'Security audit failure: Expected exactly 2 UPDATE policies on public.complaints, found %. Unauthorized update access may exist.',
      v_total_update_policies;
  END IF;

  -- 3. Detailed inspection of each policy preserving precedence and grouping
  FOR v_pol IN
    SELECT 
      polname,
      polcmd,
      polpermissive,
      polroles,
      polqual,
      polwithcheck
    FROM pg_policy
    WHERE polrelid = 'public.complaints'::regclass
      AND polcmd IN ('w', '*')
  LOOP
    -- Command must be strictly 'w' (UPDATE), never '*' (ALL)
    IF v_pol.polcmd <> 'w' THEN
      RAISE EXCEPTION 'Security audit failure: Policy "%" has command "%" instead of "w" (UPDATE).',
        v_pol.polname, v_pol.polcmd;
    END IF;

    -- Must be PERMISSIVE mode
    IF NOT v_pol.polpermissive THEN
      RAISE EXCEPTION 'Security audit failure: Policy "%" is not PERMISSIVE.', v_pol.polname;
    END IF;

    -- Target role must be strictly 'authenticated' (excludes anon and public)
    IF v_pol.polroles <> ARRAY[v_auth_oid] THEN
      RAISE EXCEPTION 'Security audit failure: Policy "%" target roles do not match "authenticated". Citizens or public may be exposed.',
        v_pol.polname;
    END IF;

    v_raw_using := COALESCE(pg_get_expr(v_pol.polqual, 'public.complaints'::regclass), '');
    v_raw_check := COALESCE(pg_get_expr(v_pol.polwithcheck, 'public.complaints'::regclass), '');

    -- Whitespace normalization only: preserves all parentheses and operator precedence
    v_clean_using := trim(regexp_replace(v_raw_using, '\s+', ' ', 'g'));
    v_clean_check := trim(regexp_replace(v_raw_check, '\s+', ' ', 'g'));

    -- Verify Department Official Policy: structural precedence match (strictly case-sensitive)
    IF v_pol.polname = 'Officials can update assigned complaints' THEN
      IF NOT (v_clean_using ~ v_dept_regex) THEN
        RAISE EXCEPTION 'Security audit failure: Policy "%" USING expression precedence/grouping mismatch: "%"',
          v_pol.polname, v_raw_using;
      END IF;

      IF NOT (v_clean_check ~ v_dept_regex) THEN
        RAISE EXCEPTION 'Security audit failure: Policy "%" WITH CHECK expression precedence/grouping mismatch: "%"',
          v_pol.polname, v_raw_check;
      END IF;

      v_has_dept_policy := true;

    -- Verify Representative Policy: structural precedence match (strictly case-sensitive)
    ELSIF v_pol.polname = 'Representatives can update constituency complaints' THEN
      IF NOT (v_clean_using ~ v_rep_regex) THEN
        RAISE EXCEPTION 'Security audit failure: Policy "%" USING expression precedence/grouping mismatch: "%"',
          v_pol.polname, v_raw_using;
      END IF;

      IF NOT (v_clean_check ~ v_rep_regex) THEN
        RAISE EXCEPTION 'Security audit failure: Policy "%" WITH CHECK expression precedence/grouping mismatch: "%"',
          v_pol.polname, v_raw_check;
      END IF;

      v_has_rep_policy := true;

    ELSE
      RAISE EXCEPTION 'Security audit failure: Unrecognized UPDATE policy "%" found on public.complaints.', v_pol.polname;
    END IF;
  END LOOP;

  -- 4. Final confirmation that both verified policies are active
  IF NOT (v_has_dept_policy AND v_has_rep_policy) THEN
    RAISE EXCEPTION 'Security audit failure: Required update policies not properly verified (dept: %, rep: %).',
      v_has_dept_policy, v_has_rep_policy;
  END IF;
END $$;

COMMIT;