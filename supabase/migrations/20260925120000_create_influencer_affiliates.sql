-- ============================================================
-- Migration: 20260925120000_create_influencer_affiliates.sql
-- Influencer Affiliate Program Schema & Permissions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 1. Create influencers table
CREATE TABLE IF NOT EXISTS public.influencers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    social_handle TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    clicks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_influencer_status CHECK (status IN ('active', 'suspended')),
    CONSTRAINT chk_influencer_code_upper CHECK (referral_code = UPPER(TRIM(referral_code))),
    CONSTRAINT chk_influencer_clicks CHECK (clicks >= 0)
);

CREATE INDEX IF NOT EXISTS idx_influencers_user_id ON public.influencers(user_id);
CREATE INDEX IF NOT EXISTS idx_influencers_ref_code ON public.influencers(referral_code);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON public.influencers(status);

-- Trigger to automatically update updated_at on influencers
DROP TRIGGER IF EXISTS trigger_influencers_updated_at ON public.influencers;
CREATE TRIGGER trigger_influencers_updated_at
    BEFORE UPDATE ON public.influencers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Add referred_by_influencer_id to public.gifts table
ALTER TABLE public.gifts
    ADD COLUMN IF NOT EXISTS referred_by_influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gifts_referred_by ON public.gifts(referred_by_influencer_id) WHERE referred_by_influencer_id IS NOT NULL;

-- 3. Create commissions table
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
    influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    suspicious_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,

    CONSTRAINT chk_commissions_status CHECK (status IN ('pending', 'approved', 'paid', 'reversed')),
    CONSTRAINT chk_commissions_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_commissions_influencer_id ON public.commissions(influencer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_gift_id ON public.commissions(gift_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);

-- 4. Atomic function to increment influencer referral clicks
CREATE OR REPLACE FUNCTION public.increment_influencer_clicks(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_influencer public.influencers%ROWTYPE;
BEGIN
    UPDATE public.influencers
    SET clicks = clicks + 1,
        updated_at = now()
    WHERE referral_code = UPPER(TRIM(p_code)) AND status = 'active'
    RETURNING * INTO v_influencer;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Influencer not found or inactive');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_influencer.id,
        'referral_code', v_influencer.referral_code,
        'clicks', v_influencer.clicks
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable RLS and Grant Permissions
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.influencers TO anon, authenticated, service_role;
GRANT ALL ON public.commissions TO anon, authenticated, service_role;

-- RLS Policies on influencers
DROP POLICY IF EXISTS "Influencers select policy" ON public.influencers;
CREATE POLICY "Influencers select policy" ON public.influencers
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Influencers manage policy" ON public.influencers;
CREATE POLICY "Influencers manage policy" ON public.influencers
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies on commissions
DROP POLICY IF EXISTS "Commissions select policy" ON public.commissions;
CREATE POLICY "Commissions select policy" ON public.commissions
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Commissions manage policy" ON public.commissions;
CREATE POLICY "Commissions manage policy" ON public.commissions
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
