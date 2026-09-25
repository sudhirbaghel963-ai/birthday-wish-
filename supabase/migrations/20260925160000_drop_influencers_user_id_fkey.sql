-- Drop strict foreign key constraint on influencers user_id to prevent cross-schema race conditions and support clean decoupled influencer profile creation
ALTER TABLE public.influencers DROP CONSTRAINT IF EXISTS influencers_user_id_fkey;
