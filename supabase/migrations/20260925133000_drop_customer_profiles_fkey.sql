-- Drop strict foreign key constraint on customer_profiles id to support mock users and clean decoupled profile creation
ALTER TABLE public.customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_id_fkey;
