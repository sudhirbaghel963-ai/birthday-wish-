-- Ensure admin_users has ONLY sudhirbaghel963@gmail.com with password 'Qwerty#2005'
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.admin_users TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin users select" ON public.admin_users;
CREATE POLICY "Admin users select" ON public.admin_users
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin users all" ON public.admin_users;
CREATE POLICY "Admin users all" ON public.admin_users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Remove all other admin accounts
DELETE FROM public.admin_users WHERE lower(email) != 'sudhirbaghel963@gmail.com';

-- Insert or update sudhirbaghel963@gmail.com
INSERT INTO public.admin_users (email, password_hash, role)
VALUES (
    'sudhirbaghel963@gmail.com',
    'afd7cdde817e605ec8f2450842ccc89eec2166d4542cf4d195709bf4dc083d63',
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'admin';
