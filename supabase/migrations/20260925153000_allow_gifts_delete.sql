-- ============================================================
-- Migration: 20260925153000_allow_gifts_delete.sql
-- Allow Admin and Authorized Operations to Delete from public.gifts
-- ============================================================

DROP POLICY IF EXISTS "gifts_delete_policy" ON public.gifts;
CREATE POLICY "gifts_delete_policy" ON public.gifts
    FOR DELETE
    USING (true);

DROP POLICY IF EXISTS "gift_versions_delete_policy" ON public.gift_versions;
CREATE POLICY "gift_versions_delete_policy" ON public.gift_versions
    FOR DELETE
    USING (true);
