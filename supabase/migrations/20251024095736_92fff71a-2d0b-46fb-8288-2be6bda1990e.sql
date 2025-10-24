-- Drop ALL existing triggers on public.carriers to remove legacy ones referencing fecha_ultima_modificacion
DO $$
DECLARE t record;
BEGIN
  FOR t IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'public' AND event_object_table = 'carriers'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.carriers;', t.trigger_name);
  END LOOP;
END$$;

-- Ensure function exists and is correct
CREATE OR REPLACE FUNCTION public.update_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Recreate the single correct trigger
CREATE TRIGGER trg_carriers_set_updated_at
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_carriers_updated_at();