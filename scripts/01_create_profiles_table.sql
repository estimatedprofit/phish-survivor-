-- Create a table for public user profiles
-- This table will be linked to Supabase's built-in auth.users table
CREATE TABLE IF NOT EXISTS public.profiles (
id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
updated_at TIMESTAMPTZ,
nickname TEXT UNIQUE,
role TEXT DEFAULT 'user', -- 'user' or 'admin'
bio TEXT,
CONSTRAINT nickname_length CHECK (char_length(nickname) >= 3)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles FOR SELECT
USING ( TRUE );

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile."
ON public.profiles FOR UPDATE
USING ( auth.uid() = id );

-- Trigger to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
INSERT INTO public.profiles (id, nickname, role, bio)
VALUES (
  new.id,
  new.raw_user_meta_data->>'nickname',
  COALESCE(new.raw_user_meta_data->>'role', 'user'),
  new.raw_user_meta_data->>'bio'
);
RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper function to check if current user is admin or service role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public -- Ensures 'public.profiles' is found
AS $$
SELECT (
  auth.role() = 'service_role' 
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
$$;
