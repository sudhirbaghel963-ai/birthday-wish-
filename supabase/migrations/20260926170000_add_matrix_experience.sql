-- ============================================================
-- Migration: 20260926170000_add_matrix_experience.sql
-- Add Matrix Countdown (Glass Edition) to experiences catalog
-- ============================================================

INSERT INTO public.experiences (
    id,
    name,
    category,
    tagline,
    description,
    price,
    original_price,
    badge,
    duration,
    is_active,
    sort_order
) VALUES (
    'birthday-film-matrix',
    'The Birthday Film (Matrix Glass Edition)',
    'birthday',
    'Luminous Matrix Rain & Cyber-Romantic Glass Keepsake',
    'An electrifying canvas Matrix rain opening counting down 3... 2... 1... to their name, followed by all 10 signature frosted glass interactive scenes.',
    '100',
    '199',
    'New Edition · Matrix Rain',
    '11 Interactive Scenes · ~3–4 min',
    true,
    3
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    badge = EXCLUDED.badge,
    duration = EXCLUDED.duration,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
