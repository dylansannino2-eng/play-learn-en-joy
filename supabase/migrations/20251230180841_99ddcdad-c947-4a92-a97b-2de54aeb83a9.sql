-- Add fields to support game variants/branches
-- base_game_slug: which game component to render (e.g., 'the-movie-interpreter')
-- content_category: filter content by this category (e.g., 'phrasal-verbs')

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS base_game_slug text,
ADD COLUMN IF NOT EXISTS content_category text;

-- Add comments explaining the columns
COMMENT ON COLUMN games.base_game_slug IS 'Slug of the base game component to render. If null, uses the game slug directly.';
COMMENT ON COLUMN games.content_category IS 'Category to filter game content (e.g., phrasal-verbs, idioms). If null, shows all content.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_base_game_slug ON games(base_game_slug);
CREATE INDEX IF NOT EXISTS idx_games_content_category ON games(content_category);