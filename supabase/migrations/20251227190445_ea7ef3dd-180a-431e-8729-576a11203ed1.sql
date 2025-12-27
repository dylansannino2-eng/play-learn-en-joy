-- Add new categories array column
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}'::text[];

-- Migrate existing category data to the new array column
UPDATE public.games 
SET categories = ARRAY[category]::text[] 
WHERE categories = '{}' OR categories IS NULL;