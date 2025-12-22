-- Add field to indicate if game uses participation chat
ALTER TABLE public.games ADD COLUMN uses_chat BOOLEAN NOT NULL DEFAULT false;

-- Update Word Battle to use chat
UPDATE public.games SET uses_chat = true WHERE slug = 'word-battle';