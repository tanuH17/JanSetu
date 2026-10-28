-- ====================================================================
-- JanSetu Platform: Administrative Account Provisioning Guide
-- File: supabase/provision_admin_accounts.sql
-- ====================================================================
-- Why this is needed:
-- Citizens register freely through the web app.
-- To maintain governance integrity, Representatives and Department Officials
-- CANNOT self-register with elevated roles. They must be provisioned or
-- elevated by a trusted project administrator via this script.
--
-- WORKFLOW:
-- Step 1: The user signs up via the JanSetu web app (or you invite them via
--         Supabase Dashboard -> Authentication -> Users -> Add User).
-- Step 2: Note their registered Email address.
-- Step 3: Run one of the queries below in the Supabase SQL Editor.
-- ====================================================================

-- --------------------------------------------------------------------
-- A. PROVISION A REPRESENTATIVE ACCOUNT
-- --------------------------------------------------------------------
-- Replace 'mla.lucknow@jansetu.local' with the actual user's email:
UPDATE public.profiles
SET 
    role = 'representative',
    constituency = 'Lucknow Central',
    district = 'Lucknow',
    state = 'Uttar Pradesh',
    designation = 'Member of Legislative Assembly (MLA)',
    is_verified = true,
    updated_at = timezone('utc'::text, now())
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'mla.lucknow@jansetu.local'
);

-- Verify the update:
SELECT p.id, u.email, p.full_name, p.role, p.constituency, p.designation, p.is_verified
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'mla.lucknow@jansetu.local';


-- --------------------------------------------------------------------
-- B. PROVISION A DEPARTMENT OFFICIAL ACCOUNT
-- --------------------------------------------------------------------
-- Replace 'official.pwd@jansetu.local' with the actual official's email:
-- Replace 'PWD' with the appropriate department code ('PWD', 'WATER', 'MUNICIPAL', 'POWER', 'HEALTH', 'EDUCATION'):
UPDATE public.profiles
SET 
    role = 'department_official',
    department_id = (SELECT id FROM public.departments WHERE code = 'PWD'),
    district = 'Lucknow',
    state = 'Uttar Pradesh',
    designation = 'Executive Engineer (Civil Infrastructure)',
    is_verified = true,
    updated_at = timezone('utc'::text, now())
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'official.pwd@jansetu.local'
);

-- Verify the update:
SELECT p.id, u.email, p.full_name, p.role, d.name AS department_name, p.designation, p.is_verified
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.departments d ON d.id = p.department_id
WHERE u.email = 'official.pwd@jansetu.local';

-- Record the trusted assignment (run after the matching profile update).
INSERT INTO public.role_assignments (user_id, role, constituency, department_id, notes)
SELECT p.id, p.role, p.constituency, p.department_id, 'Provisioned via SQL editor'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email IN ('mla.lucknow@jansetu.local', 'official.pwd@jansetu.local')
ON CONFLICT DO NOTHING;
