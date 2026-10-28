-- ====================================================================
-- JanSetu Platform: Initial PostgreSQL Database Schema & Security Policies
-- Migration: 20261027000001_initial_schema.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DEPARTMENTS TABLE
-- Stores government departments responsible for public service execution
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    jurisdiction TEXT NOT NULL DEFAULT 'District & Municipal',
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for department code lookups
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);

-- 3. PROFILES TABLE
-- Extended user profile linked directly to auth.users(id)
-- Role is authoritative and strictly protected from client self-elevation
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'representative', 'department_official')),
    state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
    district TEXT NOT NULL DEFAULT 'Lucknow',
    constituency TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation TEXT,
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_constituency ON public.profiles(constituency);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);

-- 4. COMPLAINTS TABLE (FOUNDATION)
-- Core complaint management entity for civic issue reporting
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    district TEXT NOT NULL,
    constituency TEXT,
    landmark TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_official_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON public.complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_dept ON public.complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_constituency ON public.complaints(constituency);

-- 5. PUBLIC ANNOUNCEMENTS TABLE (FOUNDATION)
-- Official notices broadcast by representatives and administrative authorities
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    target_constituency TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_constituency ON public.announcements(target_constituency);

-- 6. PUBLIC PROJECTS TABLE (FOUNDATION)
-- Infrastructure and civic development tracking
CREATE TABLE IF NOT EXISTS public.public_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    district TEXT NOT NULL,
    constituency TEXT,
    budget_inr NUMERIC(14, 2),
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed')),
    start_date DATE,
    target_completion DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_projects_dept ON public.public_projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_constituency ON public.public_projects(constituency);

-- ====================================================================
-- 7. TRIGGERS & SECURITY DEFINER FUNCTIONS
-- ====================================================================

-- Function to handle updated_at timestamps automatically
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

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_departments_updated_at ON public.departments;
CREATE TRIGGER set_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_complaints_updated_at ON public.complaints;
CREATE TRIGGER set_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Security Definer: Automatically create citizen profile on signup
-- CRITICAL SECURITY RULE: Forces role to 'citizen'. Never allows client metadata to self-grant elevated roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_state TEXT;
    v_district TEXT;
    v_constituency TEXT;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen User');
    v_phone := NEW.raw_user_meta_data->>'phone_number';
    v_state := COALESCE(NEW.raw_user_meta_data->>'state', 'Uttar Pradesh');
    v_district := COALESCE(NEW.raw_user_meta_data->>'district', 'Lucknow');
    v_constituency := NEW.raw_user_meta_data->>'constituency';

    -- Insert profile strictly as 'citizen'
    INSERT INTO public.profiles (
        id,
        full_name,
        phone_number,
        role,
        state,
        district,
        constituency,
        is_verified
    )
    VALUES (
        NEW.id,
        v_full_name,
        v_phone,
        'citizen', -- HARDCODED: client cannot elevate this role during signup
        v_state,
        v_district,
        v_constituency,
        false
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Trigger attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security Definer: Prevent users from updating their own role
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If role is changing and the current session is not superuser / service_role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
            RAISE EXCEPTION 'Access Denied: Users are not permitted to alter their own role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_protection ON public.profiles;
CREATE TRIGGER enforce_role_protection
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_elevation();

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_projects ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- DEPARTMENTS POLICIES
-- --------------------------------------------------------------------
-- Read: Everyone can read departments (needed for signup, routing, and transparency)
DROP POLICY IF EXISTS "Public can view departments" ON public.departments;
CREATE POLICY "Public can view departments"
    ON public.departments FOR SELECT
    USING (true);

-- Modifications restricted to administrators (service_role only, no anon/authenticated policy)

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------
-- 1. Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 2. Representatives can view profiles in their authorized constituency
DROP POLICY IF EXISTS "Representatives can view constituency citizen profiles" ON public.profiles;
CREATE POLICY "Representatives can view constituency citizen profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles r
            WHERE r.id = auth.uid()
              AND r.role = 'representative'
              AND r.constituency IS NOT NULL
              AND r.constituency = public.profiles.constituency
        )
    );

-- 3. Department officials can view complainants for complaints assigned to their department
DROP POLICY IF EXISTS "Officials can view assigned complainants" ON public.profiles;
CREATE POLICY "Officials can view assigned complainants"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles d
            WHERE d.id = auth.uid()
              AND d.role = 'department_official'
              AND d.department_id IS NOT NULL
              AND d.department_id = public.profiles.department_id
        )
    );

-- 4. Public directory view for verified representatives & department officials
DROP POLICY IF EXISTS "Authenticated users can view verified officials" ON public.profiles;
CREATE POLICY "Authenticated users can view verified officials"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (role IN ('representative', 'department_official') AND is_verified = true);

-- 5. Users can update their own permitted profile fields (trigger blocks role elevation)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------
-- COMPLAINTS POLICIES
-- --------------------------------------------------------------------
-- 1. Citizens view their own complaints
DROP POLICY IF EXISTS "Citizens can view own complaints" ON public.complaints;
CREATE POLICY "Citizens can view own complaints"
    ON public.complaints FOR SELECT
    TO authenticated
    USING (
        auth.uid() = citizen_id
        OR EXISTS (
            SELECT 1 FROM public.profiles r
            WHERE r.id = auth.uid()
              AND r.role = 'representative'
              AND (r.constituency = public.complaints.constituency OR r.district = public.complaints.district)
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles d
            WHERE d.id = auth.uid()
              AND d.role = 'department_official'
              AND d.department_id = public.complaints.department_id
        )
    );

-- 2. Citizens can insert complaints for themselves
DROP POLICY IF EXISTS "Citizens can create complaints" ON public.complaints;
CREATE POLICY "Citizens can create complaints"
    ON public.complaints FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = citizen_id
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'citizen'
        )
    );

-- 3. Department officials can update complaints assigned to their department
DROP POLICY IF EXISTS "Officials can update assigned complaints" ON public.complaints;
CREATE POLICY "Officials can update assigned complaints"
    ON public.complaints FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles d
            WHERE d.id = auth.uid()
              AND d.role = 'department_official'
              AND d.department_id = public.complaints.department_id
        )
    );

-- --------------------------------------------------------------------
-- ANNOUNCEMENTS POLICIES
-- --------------------------------------------------------------------
-- Readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;
CREATE POLICY "Authenticated users can view announcements"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (true);

-- Representatives can create announcements
DROP POLICY IF EXISTS "Representatives can create announcements" ON public.announcements;
CREATE POLICY "Representatives can create announcements"
    ON public.announcements FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'representative'
        )
    );

-- --------------------------------------------------------------------
-- PUBLIC PROJECTS POLICIES
-- --------------------------------------------------------------------
-- Readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view public projects" ON public.public_projects;
CREATE POLICY "Authenticated users can view public projects"
    ON public.public_projects FOR SELECT
    TO authenticated
    USING (true);

-- Officials and Representatives can create/update projects
DROP POLICY IF EXISTS "Officials and Representatives can manage projects" ON public.public_projects;
CREATE POLICY "Officials and Representatives can manage projects"
    ON public.public_projects FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('representative', 'department_official')
        )
    );
