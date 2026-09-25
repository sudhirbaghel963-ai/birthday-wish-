-- Migration: 20260925140000_add_discount_source_to_gifts.sql
-- Add discount_source column to gifts and gift_versions to track 'referral' | 'coupon' | null

ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS discount_source TEXT DEFAULT NULL;
ALTER TABLE public.gift_versions ADD COLUMN IF NOT EXISTS discount_source TEXT DEFAULT NULL;
