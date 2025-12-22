-- Add slug column to games table for routing
ALTER TABLE public.games ADD COLUMN slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX idx_games_slug ON public.games(slug);

-- Insert Word Battle as the first game
INSERT INTO public.games (title, image, badge, category, description, slug, sort_order)
VALUES (
  'Word Battle',
  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
  'new',
  'new',
  'Tutti frutti de palabras en inglés. ¡Sé el más rápido!',
  'word-battle',
  1
);