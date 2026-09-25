-- ============================================================
-- Migration: 20260925150000_add_admin_gifts_policy.sql
-- Grant Admin users full management access (SELECT, INSERT, UPDATE, DELETE) on public.gifts
-- ============================================================

-- 1. Enable full access on public.gifts for authenticated Admin users
DROP POLICY IF EXISTS "Admin users manage all gifts" ON public.gifts;
CREATE POLICY "Admin users manage all gifts" ON public.gifts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

-- 2. Ensure gift_versions is also fully manageable by Admin users
DROP POLICY IF EXISTS "Admin users manage all gift_versions" ON public.gift_versions;
CREATE POLICY "Admin users manage all gift_versions" ON public.gift_versions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );
