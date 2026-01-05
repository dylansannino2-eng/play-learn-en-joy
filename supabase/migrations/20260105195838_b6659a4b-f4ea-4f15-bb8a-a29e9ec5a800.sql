-- Add SEO fields to games table
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS meta_title text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;