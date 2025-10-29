-- 1) Saneamiento de datos: completar cliente_id en nodos existentes
UPDATE public.nodos n
SET cliente_id = r.cliente_id
FROM public.regiones r
WHERE n.region_id = r.id
  AND n.cliente_id IS NULL;

-- Fallback por ciudades si hiciera falta
UPDATE public.nodos n
SET cliente_id = c.cliente_id
FROM public.ciudades c
WHERE n.ciudad_id = c.id
  AND n.cliente_id IS NULL;

-- 2) Función para generar códigos de nodo automáticamente
CREATE OR REPLACE FUNCTION public.generate_next_nodo_code(p_region_id integer, p_ciudad_id integer)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente_id integer;
  v_cliente_codigo text;
  v_region_codigo text;
  v_ciudad_codigo text;
  v_prefix text;
  v_next integer;
BEGIN
  -- Obtener cliente_id y código de región
  SELECT r.cliente_id, r.codigo INTO v_cliente_id, v_region_codigo
  FROM public.regiones r
  WHERE r.id = p_region_id;

  -- Fallback: si no hay cliente_id, intentar desde ciudad
  IF v_cliente_id IS NULL THEN
    SELECT c.cliente_id INTO v_cliente_id
    FROM public.ciudades c
    WHERE c.id = p_ciudad_id;
  END IF;

  -- Obtener códigos de cliente y ciudad
  SELECT codigo INTO v_cliente_codigo FROM public.clientes WHERE id = v_cliente_id;
  SELECT codigo INTO v_ciudad_codigo FROM public.ciudades WHERE id = p_ciudad_id;

  -- Construir prefijo
  v_prefix := v_cliente_codigo || '-' || v_region_codigo || '-' || v_ciudad_codigo || '-';

  -- Obtener el máximo secuencial existente
  SELECT COALESCE(MAX((regexp_match(n.codigo, '^.*-(\\d{1,4})$'))[1]::int), 0)
    INTO v_next
  FROM public.nodos n
  WHERE n.codigo LIKE v_prefix || '%';

  v_next := v_next + 1;
  RETURN v_prefix || LPAD(v_next::text, 4, '0');
END;
$$;

-- 3) Función de trigger para asignar automáticamente cliente_id y codigo
CREATE OR REPLACE FUNCTION public.auto_assign_nodo_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si no hay cliente_id, obtenerlo de la región
  IF NEW.cliente_id IS NULL THEN
    SELECT cliente_id INTO NEW.cliente_id
    FROM public.regiones
    WHERE id = NEW.region_id;
  END IF;

  -- Si no hay código o está vacío, generarlo automáticamente
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := public.generate_next_nodo_code(NEW.region_id, NEW.ciudad_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_auto_assign_nodo_code ON public.nodos;
CREATE TRIGGER trg_auto_assign_nodo_code
BEFORE INSERT ON public.nodos
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_nodo_code();

-- 4) Endurecer el esquema: hacer cliente_id NOT NULL
ALTER TABLE public.nodos ALTER COLUMN cliente_id SET NOT NULL;