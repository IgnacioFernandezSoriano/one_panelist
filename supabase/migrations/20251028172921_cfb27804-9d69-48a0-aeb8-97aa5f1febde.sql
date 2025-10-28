-- Crear función para generar el siguiente código de tipo de material (4 dígitos)
CREATE OR REPLACE FUNCTION public.generate_next_material_code(p_cliente_id integer)
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_code INTEGER;
  code_str VARCHAR;
BEGIN
  -- Obtener el código más alto actual para este cliente
  SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1
  INTO next_code
  FROM public.tipos_material
  WHERE cliente_id = p_cliente_id
    AND codigo ~ '^\d{4}$'; -- Solo códigos numéricos de 4 dígitos
  
  -- Si no hay códigos previos, empezar en 1
  IF next_code IS NULL THEN
    next_code := 1;
  END IF;
  
  -- Formatear como 4 dígitos con ceros a la izquierda
  code_str := LPAD(next_code::TEXT, 4, '0');
  
  RETURN code_str;
END;
$function$;

-- Crear trigger para auto-asignar código de material
CREATE OR REPLACE FUNCTION public.auto_assign_material_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si el código no está definido o está vacío, generar uno automáticamente
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := public.generate_next_material_code(NEW.cliente_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger en la tabla tipos_material
DROP TRIGGER IF EXISTS trigger_auto_assign_material_code ON public.tipos_material;
CREATE TRIGGER trigger_auto_assign_material_code
  BEFORE INSERT ON public.tipos_material
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_material_code();