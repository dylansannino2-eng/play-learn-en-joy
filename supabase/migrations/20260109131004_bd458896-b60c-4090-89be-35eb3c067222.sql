-- Add topic column to games table for content filtering
ALTER TABLE public.games 
ADD COLUMN topic text;