-- Ensure codigo uniqueness per account (cliente_id, codigo)
ALTER TABLE public.tipos_material
  DROP CONSTRAINT IF EXISTS tipos_material_codigo_key;

-- Create composite unique index so each account can reuse 4-digit codes independently
CREATE UNIQUE INDEX IF NOT EXISTS tipos_material_cliente_codigo_uidx
  ON public.tipos_material (cliente_id, codigo);

-- Optional: make sure codigo has no leading/trailing spaces on insert/update
CREATE OR REPLACE FUNCTION public.trim_tipos_material_codigo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.codigo IS NOT NULL THEN
    NEW.codigo := trim(NEW.codigo);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_trim_tipos_material_codigo_ins ON public.tipos_material;
CREATE TRIGGER trigger_trim_tipos_material_codigo_ins
  BEFORE INSERT ON public.tipos_material
  FOR EACH ROW EXECUTE FUNCTION public.trim_tipos_material_codigo();

DROP TRIGGER IF EXISTS trigger_trim_tipos_material_codigo_upd ON public.tipos_material;
CREATE TRIGGER trigger_trim_tipos_material_codigo_upd
  BEFORE UPDATE ON public.tipos_material
  FOR EACH ROW EXECUTE FUNCTION public.trim_tipos_material_codigo();