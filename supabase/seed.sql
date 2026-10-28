-- ====================================================================
-- JanSetu Platform: Seed reference department records only
-- File: supabase/seed.sql
-- Run this in your Supabase SQL Editor after running 20261027000001_initial_schema.sql
-- ====================================================================

-- 1. SEED DEPARTMENTS
INSERT INTO public.departments (name, code, description, jurisdiction, contact_email, contact_phone)
VALUES
    (
        'Public Works Department (PWD)',
        'PWD',
        'Responsible for roads, bridges, public buildings, and civic structural infrastructure.',
        'State & District PWD Division',
        NULL,
        NULL
    ),
    (
        'Jal Sansthan / Water Supply Board',
        'WATER',
        'Responsible for potable water distribution, pipeline maintenance, and sewage control.',
        'Municipal Water Authority',
        NULL,
        NULL
    ),
    (
        'Municipal Corporation & Sanitation',
        'MUNICIPAL',
        'Solid waste management, garbage collection, street lighting, and urban cleanliness.',
        'City Municipal Council',
        NULL,
        NULL
    ),
    (
        'Electricity Distribution Board',
        'POWER',
        'Power distribution, transformer maintenance, load management, and electrical safety.',
        'Discom Urban & Rural Sub-division',
        NULL,
        NULL
    ),
    (
        'Public Health & Community Medicine',
        'HEALTH',
        'Primary healthcare centers, disease prevention, immunization, and community hygiene.',
        'District Chief Medical Office',
        NULL,
        NULL
    ),
    (
        'Education & School Infrastructure',
        'EDUCATION',
        'Government school maintenance, student amenities, and public library services.',
        'District Basic Education Office',
        NULL,
        NULL
    )
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    jurisdiction = EXCLUDED.jurisdiction;
