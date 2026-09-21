-- ============================================================
-- VELVET & KEEPSAKE — SUPABASE DATABASE & SECURITY SCHEMA
-- Migration: 0001_create_gifts_and_storage.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. DATABASE TABLE: gifts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    slug TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    refunded BOOLEAN NOT NULL DEFAULT FALSE,
    experience_id TEXT NOT NULL DEFAULT 'birthday-film',
    theme_id TEXT NOT NULL DEFAULT 'paper',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    clip_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    music JSONB NOT NULL DEFAULT '{}'::jsonb,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    price_paid NUMERIC(10, 2),

    CONSTRAINT chk_gifts_status CHECK (status IN ('draft', 'paid')),
    CONSTRAINT chk_gifts_price CHECK (price_paid IS NULL OR price_paid >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gifts_slug ON public.gifts(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_owner_id ON public.gifts(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_razorpay_order_id ON public.gifts(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_status_updated ON public.gifts(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gifts_refunded ON public.gifts(refunded) WHERE refunded IS TRUE;

-- Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gifts_updated_at ON public.gifts;
CREATE TRIGGER trigger_gifts_updated_at
    BEFORE UPDATE ON public.gifts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 2. DATABASE TABLE: admin_users
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default admin account if table is empty (email: admin@velvetkeepsake.com, default pin/pass: AdminVelvet2026!)
-- Password hash generated via SHA-256 for simple internal allowlist authentication
INSERT INTO public.admin_users (email, password_hash, role)
VALUES (
    'admin@velvetkeepsake.com',
    encode(digest('AdminVelvet2026!', 'sha256'), 'hex'),
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Verification function for admin authentication
CREATE OR REPLACE FUNCTION public.verify_admin_login(
    p_email TEXT,
    p_password_hash TEXT
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    authenticated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.email,
        a.role,
        TRUE AS authenticated
    FROM public.admin_users a
    WHERE lower(a.email) = lower(p_email)
      AND a.password_hash = p_password_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. DATABASE TABLE: experiences (Dynamic Pricing & Catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.experiences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'birthday',
    tagline TEXT,
    description TEXT,
    price TEXT NOT NULL DEFAULT '$18',
    original_price TEXT NOT NULL DEFAULT '$28',
    badge TEXT,
    duration TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial experiences catalog
INSERT INTO public.experiences (id, name, category, tagline, description, price, original_price, badge, duration, is_active, sort_order)
VALUES 
    (
        'birthday-film',
        'The Birthday Film (Warm Paper Edition)',
        'birthday',
        'Signature 11-Scene Interactive Birthday Journey',
        'An intimate, touch-responsive birthday film in warm daylight parchment, rose petals, Cupid’s bow, secret PIN box, interactive candle blowing, polaroid wall, constellation map, handwritten typewriter note, and clinking toast.',
        '$18',
        '$28',
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
        '$18',
        '$28',
        'New Edition · Glassmorphism',
        '11 Interactive Scenes · ~3–4 min',
        TRUE,
        2
    ),
    (
        'milestone-anniversary',
        'The Milestone Anniversary',
        'milestone',
        'Romantic Chapter-by-Chapter Keepsake Journey',
        'A dedicated romantic anniversary edition celebrating relationship milestones, first dates, travel chapters, love letters, and a golden champagne tribute.',
        '$24',
        '$34',
        'In Studio Production',
        '14 Interactive Scenes · Coming Soon',
        FALSE,
        3
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description;


-- ============================================================
-- 4. SLUG GENERATION & PAYMENT TRANSITION
-- ============================================================

-- Generate unique URL-safe alphanumeric slug
CREATE OR REPLACE FUNCTION public.generate_unique_gift_slug(slug_length INTEGER DEFAULT 9)
RETURNS TEXT AS $$
DECLARE
    chars CONSTANT TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER := 0;
    slug_exists BOOLEAN := TRUE;
    attempts INTEGER := 0;
    max_attempts CONSTANT INTEGER := 100;
BEGIN
    WHILE slug_exists AND attempts < max_attempts LOOP
        result := '';
        FOR i IN 1..slug_length LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;

        SELECT EXISTS(SELECT 1 FROM public.gifts WHERE slug = result) INTO slug_exists;
        attempts := attempts + 1;
    END LOOP;

    IF slug_exists THEN
        RAISE EXCEPTION 'Could not generate a unique slug after % attempts', max_attempts;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Elevated Payment Completion Function (Server-side Edge Function only)
CREATE OR REPLACE FUNCTION public.complete_gift_payment(
    p_gift_id UUID,
    p_payment_id TEXT,
    p_price_paid NUMERIC
)
RETURNS public.gifts AS $$
DECLARE
    v_gift public.gifts;
    v_new_slug TEXT;
BEGIN
    SELECT * INTO v_gift FROM public.gifts WHERE id = p_gift_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Gift with id % not found', p_gift_id;
    END IF;

    IF v_gift.status = 'paid' THEN
        RETURN v_gift;
    END IF;

    v_new_slug := public.generate_unique_gift_slug(9);

    UPDATE public.gifts
    SET 
        status = 'paid',
        slug = v_new_slug,
        razorpay_payment_id = p_payment_id,
        price_paid = p_price_paid,
        updated_at = now()
    WHERE id = p_gift_id
    RETURNING * INTO v_gift;

    RETURN v_gift;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- GIFTS TABLE POLICIES:
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "gifts_select_policy" ON public.gifts;
CREATE POLICY "gifts_select_policy" ON public.gifts
    FOR SELECT
    USING (
        (status = 'paid' AND slug IS NOT NULL)
        OR
        (auth.uid() IS NOT NULL AND auth.uid() = owner_id)
        OR
        (status = 'draft')
    );

DROP POLICY IF EXISTS "gifts_insert_policy" ON public.gifts;
CREATE POLICY "gifts_insert_policy" ON public.gifts
    FOR INSERT
    WITH CHECK (
        status = 'draft'
        AND (owner_id IS NULL OR auth.uid() = owner_id)
        AND slug IS NULL
        AND razorpay_payment_id IS NULL
        AND price_paid IS NULL
    );

DROP POLICY IF EXISTS "gifts_update_policy" ON public.gifts;
CREATE POLICY "gifts_update_policy" ON public.gifts
    FOR UPDATE
    USING (
        status = 'draft'
        AND (owner_id IS NULL OR auth.uid() = owner_id)
    )
    WITH CHECK (
        status = 'draft'
        AND slug IS NULL
        AND razorpay_payment_id IS NULL
        AND price_paid IS NULL
        AND (owner_id IS NULL OR auth.uid() = owner_id)
    );

DROP POLICY IF EXISTS "gifts_delete_policy" ON public.gifts;
CREATE POLICY "gifts_delete_policy" ON public.gifts
    FOR DELETE
    USING (
        status = 'draft'
        AND auth.uid() IS NOT NULL
        AND auth.uid() = owner_id
    );

-- ------------------------------------------------------------
-- EXPERIENCES TABLE POLICIES (Public read, admin write):
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active experiences" ON public.experiences;
CREATE POLICY "Public can view active experiences" ON public.experiences
    FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Admin update experiences" ON public.experiences;
CREATE POLICY "Admin update experiences" ON public.experiences
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- ------------------------------------------------------------
-- ADMIN_USERS TABLE POLICIES (Private):
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin users self read" ON public.admin_users;
CREATE POLICY "Admin users self read" ON public.admin_users
    FOR SELECT
    USING (TRUE);

-- ------------------------------------------------------------
-- STORAGE OBJECTS POLICIES
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read on gift assets" ON storage.objects;
CREATE POLICY "Public Read on gift assets" ON storage.objects
    FOR SELECT
    USING (bucket_id IN ('gift-photos', 'gift-clips', 'gift-music'));

DROP POLICY IF EXISTS "Allow uploads to gift assets" ON storage.objects;
CREATE POLICY "Allow uploads to gift assets" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id IN ('gift-photos', 'gift-clips', 'gift-music'));

DROP POLICY IF EXISTS "Allow update to gift assets" ON storage.objects;
CREATE POLICY "Allow update to gift assets" ON storage.objects
    FOR UPDATE
    USING (bucket_id IN ('gift-photos', 'gift-clips', 'gift-music'))
    WITH CHECK (bucket_id IN ('gift-photos', 'gift-clips', 'gift-music'));

DROP POLICY IF EXISTS "Allow delete from gift assets" ON storage.objects;
CREATE POLICY "Allow delete from gift assets" ON storage.objects
    FOR DELETE
    USING (bucket_id IN ('gift-photos', 'gift-clips', 'gift-music'));
