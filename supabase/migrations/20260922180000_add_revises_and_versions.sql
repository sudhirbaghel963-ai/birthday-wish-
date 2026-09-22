-- Migration: Add revises_gift_id and version tracking to public.gifts, and create public.gift_versions table

-- 1. Add revises_gift_id and version to public.gifts
ALTER TABLE public.gifts 
ADD COLUMN IF NOT EXISTS revises_gift_id UUID REFERENCES public.gifts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. Add index for fast lookup of pending revision drafts
CREATE INDEX IF NOT EXISTS idx_gifts_revises_gift_id ON public.gifts(revises_gift_id);

-- 3. Create public.gift_versions table to archive prior versions (v1, v2, etc.)
CREATE TABLE IF NOT EXISTS public.gift_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    clip_urls JSONB DEFAULT '[]'::jsonb,
    music JSONB,
    theme_id TEXT,
    experience_id TEXT,
    price_paid NUMERIC,
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ DEFAULT now()
);

-- Index on gift_id and version_number
CREATE INDEX IF NOT EXISTS idx_gift_versions_gift_id ON public.gift_versions(gift_id);
CREATE INDEX IF NOT EXISTS idx_gift_versions_gift_v ON public.gift_versions(gift_id, version_number);

-- 4. Enable RLS on public.gift_versions
ALTER TABLE public.gift_versions ENABLE ROW LEVEL SECURITY;

-- Select policy: Owners of the parent gift can read their gift versions, plus public read if gift is paid
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gift_versions' AND policyname = 'gift_versions_select_policy'
    ) THEN
        CREATE POLICY gift_versions_select_policy ON public.gift_versions
            FOR SELECT USING (
                auth.uid() IN (SELECT owner_id FROM public.gifts WHERE id = gift_versions.gift_id)
                OR EXISTS (SELECT 1 FROM public.gifts WHERE id = gift_versions.gift_id AND status = 'paid')
            );
    END IF;
END $$;

-- Service role has full access
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'gift_versions' AND policyname = 'gift_versions_service_all'
    ) THEN
        CREATE POLICY gift_versions_service_all ON public.gift_versions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
