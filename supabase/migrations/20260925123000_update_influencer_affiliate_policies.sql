-- ============================================================
-- Migration: 20260925123000_update_influencer_affiliate_policies.sql
-- Update Influencer & Commission RLS Policies
-- ============================================================

GRANT ALL ON public.influencers TO anon, authenticated, service_role;
GRANT ALL ON public.commissions TO anon, authenticated, service_role;

-- RLS Policies on influencers
DROP POLICY IF EXISTS "Influencers select policy" ON public.influencers;
CREATE POLICY "Influencers select policy" ON public.influencers
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Influencers insert policy" ON public.influencers;
DROP POLICY IF EXISTS "Influencers update policy" ON public.influencers;
DROP POLICY IF EXISTS "Influencers all service role" ON public.influencers;
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

DROP POLICY IF EXISTS "Commissions manage service role" ON public.commissions;
DROP POLICY IF EXISTS "Commissions manage authenticated" ON public.commissions;
DROP POLICY IF EXISTS "Commissions manage policy" ON public.commissions;
CREATE POLICY "Commissions manage policy" ON public.commissions
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
