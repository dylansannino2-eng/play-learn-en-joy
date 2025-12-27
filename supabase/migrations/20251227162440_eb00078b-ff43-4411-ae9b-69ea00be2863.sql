-- Add columns for specifying the hidden word in movie interpreter game
ALTER TABLE subtitle_configs 
ADD COLUMN IF NOT EXISTS target_subtitle_index integer,
ADD COLUMN IF NOT EXISTS hidden_word text,
ADD COLUMN IF NOT EXISTS hidden_word_index integer,
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS category text;

-- Add comment explaining the columns
COMMENT ON COLUMN subtitle_configs.target_subtitle_index IS 'Index of the subtitle (in subtitles array) that contains the word to guess';
COMMENT ON COLUMN subtitle_configs.hidden_word IS 'The exact word that players need to guess';
COMMENT ON COLUMN subtitle_configs.hidden_word_index IS 'Index of the hidden word within the subtitle text';
COMMENT ON COLUMN subtitle_configs.difficulty IS 'Difficulty level: easy, medium, hard';
COMMENT ON COLUMN subtitle_configs.is_active IS 'Whether this config is active for gameplay';
COMMENT ON COLUMN subtitle_configs.category IS 'Category like comedy, drama, action, etc.';

-- Enable RLS on subtitle_configs
ALTER TABLE subtitle_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read active subtitle configs" 
ON subtitle_configs 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage subtitle configs" 
ON subtitle_configs 
FOR ALL 
USING (is_admin());

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_subtitle_configs_active ON subtitle_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_subtitle_configs_category ON subtitle_configs(category);