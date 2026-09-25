-- ============================================================
-- Migration: 20260925130000_create_customer_profiles_referral.sql
-- Account-level customer profiles and signup-only referral attribution
-- ============================================================

-- 1. Create customer_profiles table
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    referred_by_influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
    referral_commission_granted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_id_fkey;

CREATE INDEX IF NOT EXISTS idx_customer_profiles_ref_by ON public.customer_profiles(referred_by_influencer_id) WHERE referred_by_influencer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_profiles_comm_granted ON public.customer_profiles(referral_commission_granted);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trigger_customer_profiles_updated_at
    BEFORE UPDATE ON public.customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Atomic Function: Attach referral on signup only
CREATE OR REPLACE FUNCTION public.attach_referral_on_signup(
    p_user_id UUID,
    p_email TEXT,
    p_ref_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_existing public.customer_profiles%ROWTYPE;
    v_influencer public.influencers%ROWTYPE;
    v_inf_id UUID := NULL;
    v_clean_code TEXT;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));

    -- 1. Check if profile already exists for this user (existing account)
    SELECT * INTO v_existing FROM public.customer_profiles WHERE id = p_user_id;
    IF FOUND THEN
        -- Profile already exists! Never modify attribution on existing accounts
        RETURN jsonb_build_object(
            'success', true,
            'is_new_account', false,
            'referred_by_influencer_id', v_existing.referred_by_influencer_id,
            'referral_commission_granted', v_existing.referral_commission_granted
        );
    END IF;

    -- 2. New account creation: If ref code is provided, look up active influencer
    IF p_ref_code IS NOT NULL AND TRIM(p_ref_code) <> '' THEN
        v_clean_code := UPPER(TRIM(p_ref_code));
        
        SELECT * INTO v_influencer 
        FROM public.influencers 
        WHERE referral_code = v_clean_code AND status = 'active';

        IF FOUND THEN
            -- 3. Self-referral protection: Skip attribution if influencer's own email or user_id matches
            IF (v_influencer.user_id IS NOT NULL AND v_influencer.user_id = p_user_id) 
               OR (v_influencer.email IS NOT NULL AND LOWER(TRIM(v_influencer.email)) = v_clean_email AND v_clean_email <> '') THEN
                v_inf_id := NULL;
            ELSE
                v_inf_id := v_influencer.id;
            END IF;
        END IF;
    END IF;

    -- 4. Insert new customer profile row
    INSERT INTO public.customer_profiles (
        id,
        email,
        referred_by_influencer_id,
        referral_commission_granted,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_clean_email,
        v_inf_id,
        FALSE,
        now(),
        now()
    )
    RETURNING * INTO v_existing;

    RETURN jsonb_build_object(
        'success', true,
        'is_new_account', true,
        'referred_by_influencer_id', v_inf_id,
        'referral_commission_granted', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS and Grant Permissions
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.customer_profiles TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Customer profiles select" ON public.customer_profiles;
CREATE POLICY "Customer profiles select" ON public.customer_profiles
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Customer profiles manage" ON public.customer_profiles;
CREATE POLICY "Customer profiles manage" ON public.customer_profiles
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
