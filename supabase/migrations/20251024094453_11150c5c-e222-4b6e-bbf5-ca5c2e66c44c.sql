-- Función para generar el siguiente código de producto para un cliente
CREATE OR REPLACE FUNCTION public.generate_next_product_code(p_cliente_id INTEGER)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_code INTEGER;
  code_str VARCHAR;
BEGIN
  -- Obtener el código más alto actual para este cliente
  SELECT COALESCE(MAX(CAST(codigo_producto AS INTEGER)), 0) + 1
  INTO next_code
  FROM public.productos_cliente
  WHERE cliente_id = p_cliente_id
    AND codigo_producto ~ '^\d{3}$'; -- Solo códigos numéricos de 3 dígitos
  
  -- Si no hay códigos previos, empezar en 001
  IF next_code IS NULL THEN
    next_code := 1;
  END IF;
  
  -- Formatear como 3 dígitos con ceros a la izquierda
  code_str := LPAD(next_code::TEXT, 3, '0');
  
  RETURN code_str;
END;
$$;

-- Trigger para asignar automáticamente el código de producto
CREATE OR REPLACE FUNCTION public.auto_assign_product_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el código no está definido o está vacío, generar uno automáticamente
  IF NEW.codigo_producto IS NULL OR NEW.codigo_producto = '' THEN
    NEW.codigo_producto := public.generate_next_product_code(NEW.cliente_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_product_code ON public.productos_cliente;
CREATE TRIGGER trigger_auto_assign_product_code
  BEFORE INSERT ON public.productos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_product_code();

-- Comentarios
COMMENT ON FUNCTION public.generate_next_product_code(INTEGER) IS 'Generates next 3-digit product code for a specific client';
COMMENT ON FUNCTION public.auto_assign_product_code() IS 'Auto-assigns product code before insert if not provided';