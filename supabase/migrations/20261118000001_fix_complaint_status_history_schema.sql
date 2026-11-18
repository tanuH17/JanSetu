-- ====================================================================
-- JanSetu Platform: Verified Fix for complaint_status_history Schema
-- File: supabase/migrations/20261118000001_fix_complaint_status_history_schema.sql
-- ====================================================================

BEGIN;

-- 1. Safely add missing columns to complaint_status_history
-- Note: event_type is added WITHOUT a default initially as requested
ALTER TABLE public.complaint_status_history
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS old_department_id UUID,
  ADD COLUMN IF NOT EXISTS new_department_id UUID,
  ADD COLUMN IF NOT EXISTS old_status TEXT,
  ADD COLUMN IF NOT EXISTS new_status TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Preserve legacy data: backfill actor_id from changed_by ONLY if changed_by references a valid profile
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'complaint_status_history'
      AND column_name = 'changed_by'
  ) THEN
    UPDATE public.complaint_status_history h
    SET actor_id = h.changed_by
    WHERE h.actor_id IS NULL
      AND h.changed_by IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = h.changed_by
      );
  END IF;
END $$;

-- 3. Backfill event_type for all existing rows, then set DEFAULT, NOT NULL, and CHECK constraint
UPDATE public.complaint_status_history
SET event_type = CASE
  WHEN old_status IS NULL AND new_status IS NOT NULL THEN 'submitted'
  WHEN old_status IS DISTINCT FROM new_status THEN 'status_change'
  ELSE 'status_change'
END
WHERE event_type IS NULL 
   OR event_type NOT IN ('submitted', 'status_change', 'assignment', 'priority_change', 'resolution_note');

ALTER TABLE public.complaint_status_history
  ALTER COLUMN event_type SET DEFAULT 'status_change',
  ALTER COLUMN event_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'complaint_status_history_event_type_check' 
      AND conrelid = 'public.complaint_status_history'::regclass
  ) THEN
    ALTER TABLE public.complaint_status_history
      ADD CONSTRAINT complaint_status_history_event_type_check
      CHECK (event_type IN ('submitted', 'status_change', 'assignment', 'priority_change', 'resolution_note'));
  END IF;
END $$;

-- 4. Foreign key integrity guarantees (safely skips existing constraints to avoid duplicates)
DO $$
BEGIN
  -- Foreign key: actor_id -> public.profiles(id)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.complaint_status_history'::regclass
      AND c.contype = 'f'
      AND a.attname = 'actor_id'
  ) THEN
    ALTER TABLE public.complaint_status_history
      ADD CONSTRAINT complaint_status_history_actor_id_fkey
      FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key: old_department_id -> public.departments(id)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.complaint_status_history'::regclass
      AND c.contype = 'f'
      AND a.attname = 'old_department_id'
  ) THEN
    ALTER TABLE public.complaint_status_history
      ADD CONSTRAINT complaint_status_history_old_department_id_fkey
      FOREIGN KEY (old_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;

  -- Foreign key: new_department_id -> public.departments(id)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.complaint_status_history'::regclass
      AND c.contype = 'f'
      AND a.attname = 'new_department_id'
  ) THEN
    ALTER TABLE public.complaint_status_history
      ADD CONSTRAINT complaint_status_history_new_department_id_fkey
      FOREIGN KEY (new_department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Ensure performance index on (complaint_id, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_created
  ON public.complaint_status_history(complaint_id, created_at DESC);

-- 6. Reinforce strict RLS security (read-only for authorized complaint viewers, append-only via triggers)
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View history for visible complaints" ON public.complaint_status_history;
CREATE POLICY "View history for visible complaints"
  ON public.complaint_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c
      WHERE c.id = complaint_status_history.complaint_id
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.complaint_status_history FROM PUBLIC, authenticated, anon;
GRANT SELECT ON public.complaint_status_history TO authenticated;

-- 7. Trigger function record_complaint_history()
CREATE OR REPLACE FUNCTION public.record_complaint_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := NULL;
BEGIN
  -- Resolve actor_id safely against public.profiles to prevent FK violations
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_actor_id FROM public.profiles WHERE id = auth.uid();
  END IF;

  -- Fallback to complaint citizen_id if unauthenticated / service maintenance
  IF v_actor_id IS NULL AND TG_OP = 'INSERT' THEN
    SELECT id INTO v_actor_id FROM public.profiles WHERE id = NEW.citizen_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, new_status, new_department_id, note)
    VALUES
      (NEW.id, v_actor_id, 'submitted', NEW.status, NEW.department_id, 'Complaint submitted');
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, v_actor_id, 'status_change', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  ELSIF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, v_actor_id, 'assignment', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, v_actor_id, 'priority_change', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       'Priority changed from ' || OLD.priority || ' to ' || NEW.priority);
  ELSIF OLD.resolution_notes IS DISTINCT FROM NEW.resolution_notes THEN
    INSERT INTO public.complaint_status_history
      (complaint_id, actor_id, event_type, old_status, new_status, old_department_id, new_department_id, note)
    VALUES
      (NEW.id, v_actor_id, 'resolution_note', OLD.status, NEW.status, OLD.department_id, NEW.department_id,
       NULLIF(NEW.resolution_notes, ''));
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Ensure triggers are correctly attached to public.complaints
DROP TRIGGER IF EXISTS complaint_history_after_insert ON public.complaints;
CREATE TRIGGER complaint_history_after_insert
  AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_complaint_history();

DROP TRIGGER IF EXISTS complaint_history_after_update ON public.complaints;
CREATE TRIGGER complaint_history_after_update
  AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.record_complaint_history();

COMMIT;
