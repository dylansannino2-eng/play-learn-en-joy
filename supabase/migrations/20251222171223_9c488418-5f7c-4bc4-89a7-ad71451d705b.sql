-- Fix function search path
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS CHAR(4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result CHAR(4);
  i INTEGER;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.game_rooms WHERE code = result) THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$;