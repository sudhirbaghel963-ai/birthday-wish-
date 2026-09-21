-- Migration: 0002_add_razorpay_order_id.sql
-- Adds Razorpay order tracking and verification signature columns to public.gifts

ALTER TABLE public.gifts 
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

-- Index for fast lookup by Razorpay Order ID during verification and webhook ingestion
CREATE INDEX IF NOT EXISTS idx_gifts_razorpay_order_id 
    ON public.gifts(razorpay_order_id) 
    WHERE razorpay_order_id IS NOT NULL;

-- Note on pricing:
-- Platform uses a single fixed flat price: ₹100 (10000 paise) across all experiences.
-- Column 'price' in public.experiences is deprecated and preserved for backwards compatibility.
