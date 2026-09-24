-- ============================================================
-- Migration: 20260924180000_create_coupons_and_discounts.sql
-- Create coupons table and add discount columns to gifts table
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL,
    max_uses INTEGER DEFAULT NULL,
    times_used INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_coupons_code_uppercase CHECK (code = UPPER(TRIM(code))),
    CONSTRAINT chk_coupons_discount CHECK (discount_percent >= 1 AND discount_percent <= 100),
    CONSTRAINT chk_coupons_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
    CONSTRAINT chk_coupons_times_used CHECK (times_used >= 0)
);

-- Indexes for coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = TRUE;

-- Trigger to automatically update updated_at on coupons
DROP TRIGGER IF EXISTS trigger_coupons_updated_at ON public.coupons;
CREATE TRIGGER trigger_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 2. Add discount columns to public.gifts table
ALTER TABLE public.gifts
    ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT NULL;

-- 3. Create atomic coupon usage increment function to eliminate race conditions
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_coupon public.coupons%ROWTYPE;
BEGIN
    UPDATE public.coupons
    SET times_used = times_used + 1,
        updated_at = now()
    WHERE code = UPPER(TRIM(p_code))
    RETURNING * INTO v_coupon;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Coupon not found'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_coupon.id,
        'code', v_coupon.code,
        'discount_percent', v_coupon.discount_percent,
        'times_used', v_coupon.times_used,
        'max_uses', v_coupon.max_uses,
        'is_active', v_coupon.is_active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable RLS on coupons table
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.coupons TO anon, authenticated, service_role;

-- RLS Policies
DROP POLICY IF EXISTS "Coupons select all" ON public.coupons;
CREATE POLICY "Coupons select all" ON public.coupons
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Coupons manage all" ON public.coupons;
CREATE POLICY "Coupons manage all" ON public.coupons
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
