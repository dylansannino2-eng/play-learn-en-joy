-- Add microlesson fields to subtitle_configs
ALTER TABLE public.subtitle_configs
ADD COLUMN IF NOT EXISTS microlesson_meaning text,
ADD COLUMN IF NOT EXISTS microlesson_examples text[];

-- Add comment explaining the columns
COMMENT ON COLUMN public.subtitle_configs.microlesson_meaning IS 'Pre-generated meaning for the hidden word microlesson';
COMMENT ON COLUMN public.subtitle_configs.microlesson_examples IS 'Pre-generated examples for the hidden word microlesson';