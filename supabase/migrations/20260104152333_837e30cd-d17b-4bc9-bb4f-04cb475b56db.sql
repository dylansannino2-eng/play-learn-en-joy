-- Add column for multiple correct translations
ALTER TABLE public.translator_phrases
ADD COLUMN correct_translations text[] DEFAULT '{}';

-- Migrate existing data: copy english_translation to the array
UPDATE public.translator_phrases
SET correct_translations = ARRAY[english_translation]
WHERE correct_translations = '{}' OR correct_translations IS NULL;