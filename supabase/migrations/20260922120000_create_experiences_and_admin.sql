-- ============================================================
-- 20260922120000_create_experiences_and_admin.sql
-- Ensure experiences and admin_users tables exist with per-experience pricing
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.experiences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'birthday',
    tagline TEXT,
    description TEXT,
    price TEXT NOT NULL DEFAULT '100',
    original_price TEXT NOT NULL DEFAULT '199',
    badge TEXT,
    duration TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial experiences with per-experience price = 100
INSERT INTO public.experiences (id, name, category, tagline, description, price, original_price, badge, duration, is_active, sort_order)
VALUES 
    (
        'birthday-film',
        'The Birthday Film (Warm Paper Edition)',
        'birthday',
        'Signature 11-Scene Interactive Birthday Journey',
        'An intimate, touch-responsive birthday film in warm daylight parchment, rose petals, Cupid’s bow, secret PIN box, interactive candle blowing, polaroid wall, balloon pop wish surprises, handwritten typewriter note, and clinking toast.',
        '100',
        '199',
        'Signature Experience · Most Popular',
        '11 Interactive Scenes · ~3–4 min',
        TRUE,
        1
    ),
    (
        'birthday-film-glass',
        'The Birthday Film (Glass Edition)',
        'birthday',
        'Luminous Dark Jewel & Frosted Glassmorphism Journey',
        'The exact same 11 intimate scenes reimagined with frosted glass surfaces, translucent blurred panels, deep midnight plum backdrops, crystalline glowing motes, and luminous reflections.',
        '100',
        '199',
        'New Edition · Glassmorphism',
        '11 Interactive Scenes · ~3–4 min',
        TRUE,
        2
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description;

-- Grant permissions and RLS for experiences
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.experiences TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can view experiences" ON public.experiences;
CREATE POLICY "Public can view experiences" ON public.experiences
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Allow all on experiences" ON public.experiences;
CREATE POLICY "Allow all on experiences" ON public.experiences
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_users TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin users select" ON public.admin_users;
CREATE POLICY "Admin users select" ON public.admin_users
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin users all" ON public.admin_users;
CREATE POLICY "Admin users all" ON public.admin_users
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

INSERT INTO public.admin_users (email, password_hash, role)
VALUES (
    'admin@velvetkeepsake.com',
    '333c1d9f8e874983050bf3512803bcf52467385a498bb9ea5e9d9972d3bb6bd8',
    'admin'
)
ON CONFLICT (email) DO NOTHING;
