-- =====================================================
-- Generate 3000 realistic eventos_reales for DEMO client
-- =====================================================
-- Uses ciudad_transit_times for realistic transit times
-- Respects business days (Monday-Friday only)
-- Transit time variation: -5% to +20%
-- Send date variation: 0% to +20% delay from programmed date

-- Helper function to get next business day
CREATE OR REPLACE FUNCTION get_next_business_day(input_date DATE)
RETURNS DATE AS $$
DECLARE
  result_date DATE;
  day_of_week INTEGER;
BEGIN
  result_date := input_date;
  day_of_week := EXTRACT(DOW FROM result_date);
  
  -- If Saturday (6), add 2 days to get to Monday
  IF day_of_week = 6 THEN
    result_date := result_date + 2;
  -- If Sunday (0), add 1 day to get to Monday
  ELSIF day_of_week = 0 THEN
    result_date := result_date + 1;
  END IF;
  
  RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- Helper function to add business days
CREATE OR REPLACE FUNCTION add_business_days(start_date TIMESTAMPTZ, days_to_add NUMERIC)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  result_date TIMESTAMPTZ;
  full_days INTEGER;
  remaining_hours NUMERIC;
  days_added INTEGER;
  current_dow INTEGER;
BEGIN
  result_date := start_date;
  full_days := FLOOR(days_to_add)::INTEGER;
  remaining_hours := (days_to_add - full_days) * 24;
  days_added := 0;
  
  -- Add full business days
  WHILE days_added < full_days LOOP
    result_date := result_date + interval '1 day';
    current_dow := EXTRACT(DOW FROM result_date);
    
    -- Only count if it's a business day (1=Monday to 5=Friday)
    IF current_dow >= 1 AND current_dow <= 5 THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  
  -- Add remaining hours
  result_date := result_date + (remaining_hours || ' hours')::interval;
  
  -- If we landed on a weekend, move to next Monday
  current_dow := EXTRACT(DOW FROM result_date);
  IF current_dow = 6 THEN -- Saturday
    result_date := result_date + interval '2 days';
  ELSIF current_dow = 0 THEN -- Sunday
    result_date := result_date + interval '1 day';
  END IF;
  
  RETURN result_date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Verify available data
-- =====================================================
SELECT 'Checking available data for DEMO client (id=13)' as step;

SELECT 'Available transit time routes:' as info, COUNT(*) as count 
FROM ciudad_transit_times 
WHERE cliente_id = 13;

SELECT 'Available nodos:' as info, COUNT(*) as count 
FROM nodos 
WHERE codigo LIKE '0001-%';

SELECT 'Available panelistas:' as info, COUNT(*) as count 
FROM panelistas 
WHERE cliente_id = 13;

-- =====================================================
-- Generate 3000 realistic eventos_reales
-- =====================================================
DO $$
DECLARE
  i INTEGER;
  random_route RECORD;
  random_nodo_origen RECORD;
  random_nodo_destino RECORD;
  random_panelista_origen INTEGER;
  random_panelista_destino INTEGER;
  random_fecha_programada DATE;
  random_fecha_envio TIMESTAMPTZ;
  random_fecha_recepcion TIMESTAMPTZ;
  random_numero_etiqueta VARCHAR;
  
  -- Transit time calculation
  base_transit_days NUMERIC;
  transit_variation NUMERIC;
  actual_transit_days NUMERIC;
  actual_transit_hours NUMERIC;
  
  -- Send date calculation
  send_delay_days NUMERIC;
  
  routes_array INTEGER[];
  panelistas_array INTEGER[];
  route_count INTEGER;
BEGIN
  -- Get available routes and panelistas
  SELECT ARRAY_AGG(id) INTO routes_array 
  FROM ciudad_transit_times 
  WHERE cliente_id = 13;
  
  SELECT ARRAY_AGG(id) INTO panelistas_array 
  FROM panelistas 
  WHERE cliente_id = 13;
  
  route_count := array_length(routes_array, 1);
  
  RAISE NOTICE 'Found % transit routes, % panelistas', 
    route_count,
    array_length(panelistas_array, 1);
  
  -- Validate we have enough data
  IF route_count < 1 THEN
    RAISE EXCEPTION 'No transit routes found for cliente_id = 13';
  END IF;
  
  IF array_length(panelistas_array, 1) < 1 THEN
    RAISE EXCEPTION 'No panelistas found for cliente_id = 13';
  END IF;
  
  -- Generate 3000 events
  FOR i IN 1..3000 LOOP
    -- Select random route from ciudad_transit_times
    SELECT 
      ctt.id,
      ctt.ciudad_origen_id,
      ctt.ciudad_destino_id,
      ctt.carrier_id,
      ctt.producto_id,
      ctt.dias_transito,
      ctt.target_percentage
    INTO random_route
    FROM ciudad_transit_times ctt
    WHERE ctt.id = routes_array[1 + floor(random() * route_count)::int];
    
    -- Get nodos for the selected cities
    -- Find a random nodo for origen city
    SELECT codigo, ciudad, ciudad_id INTO random_nodo_origen
    FROM nodos
    WHERE ciudad_id = random_route.ciudad_origen_id
      AND codigo LIKE '0001-%'
    ORDER BY random()
    LIMIT 1;
    
    -- Find a random nodo for destino city
    SELECT codigo, ciudad, ciudad_id INTO random_nodo_destino
    FROM nodos
    WHERE ciudad_id = random_route.ciudad_destino_id
      AND codigo LIKE '0001-%'
    ORDER BY random()
    LIMIT 1;
    
    -- If we couldn't find nodos for these cities, skip this iteration
    IF random_nodo_origen.codigo IS NULL OR random_nodo_destino.codigo IS NULL THEN
      RAISE NOTICE 'Skipping event %: No nodos found for cities % and %', 
        i, random_route.ciudad_origen_id, random_route.ciudad_destino_id;
      CONTINUE;
    END IF;
    
    -- Random panelistas
    random_panelista_origen := panelistas_array[1 + floor(random() * array_length(panelistas_array, 1))::int];
    random_panelista_destino := panelistas_array[1 + floor(random() * array_length(panelistas_array, 1))::int];
    
    -- Random programmed date in 2025 (only business days)
    random_fecha_programada := DATE '2025-01-01' + (random() * 364)::int;
    random_fecha_programada := get_next_business_day(random_fecha_programada);
    
    -- Calculate send date with 0% to +20% delay
    send_delay_days := random() * 0.20 * random_route.dias_transito;
    random_fecha_envio := random_fecha_programada::timestamp + (random() * 12)::int * interval '1 hour';
    random_fecha_envio := add_business_days(random_fecha_envio, send_delay_days);
    
    -- Calculate actual transit time with -5% to +20% variation
    base_transit_days := random_route.dias_transito;
    transit_variation := -0.05 + (random() * 0.25); -- Range from -5% to +20%
    actual_transit_days := base_transit_days * (1 + transit_variation);
    
    -- Ensure minimum of 0.5 days (12 hours)
    IF actual_transit_days < 0.5 THEN
      actual_transit_days := 0.5;
    END IF;
    
    actual_transit_hours := actual_transit_days * 24;
    
    -- Calculate receive date (add business days)
    random_fecha_recepcion := add_business_days(random_fecha_envio, actual_transit_days);
    
    -- Generate tracking number
    random_numero_etiqueta := 'DEMO-' || LPAD(i::text, 6, '0') || '-' || TO_CHAR(random_fecha_programada, 'YYYYMMDD');
    
    -- Insert into eventos_reales
    INSERT INTO eventos_reales (
      allocation_plan_detail_id,
      cliente_id,
      carrier_id,
      producto_id,
      nodo_origen,
      nodo_destino,
      ciudad_origen,
      ciudad_destino,
      panelista_origen_id,
      panelista_destino_id,
      fecha_programada,
      fecha_envio_real,
      fecha_recepcion_real,
      tiempo_transito_dias,
      tiempo_transito_horas,
      numero_etiqueta,
      fecha_validacion,
      validado_por
    ) VALUES (
      NULL, -- Synthetic test event
      13, -- DEMO client
      random_route.carrier_id,
      random_route.producto_id,
      random_nodo_origen.codigo,
      random_nodo_destino.codigo,
      random_nodo_origen.ciudad,
      random_nodo_destino.ciudad,
      random_panelista_origen,
      random_panelista_destino,
      random_fecha_programada,
      random_fecha_envio,
      random_fecha_recepcion,
      EXTRACT(DAY FROM (random_fecha_recepcion - random_fecha_envio))::INTEGER,
      actual_transit_hours,
      random_numero_etiqueta,
      random_fecha_recepcion + interval '1 hour', -- Validated 1 hour after reception
      NULL -- No specific user
    );
    
    -- Progress indicator every 500 events
    IF i % 500 = 0 THEN
      RAISE NOTICE 'Generated % events...', i;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Successfully generated eventos_reales!';
END $$;

-- Clean up helper functions
DROP FUNCTION IF EXISTS get_next_business_day(DATE);
DROP FUNCTION IF EXISTS add_business_days(TIMESTAMPTZ, NUMERIC);

-- =====================================================
-- Verification Results
-- =====================================================
SELECT 'Verification Results:' as step;

-- Overall statistics
SELECT 
  COUNT(*) as total_eventos,
  MIN(fecha_programada) as earliest_date,
  MAX(fecha_programada) as latest_date,
  ROUND(AVG(tiempo_transito_horas)::NUMERIC, 2) as avg_transit_hours,
  ROUND(MIN(tiempo_transito_horas)::NUMERIC, 2) as min_transit_hours,
  ROUND(MAX(tiempo_transito_horas)::NUMERIC, 2) as max_transit_hours,
  ROUND(AVG(tiempo_transito_dias)::NUMERIC, 2) as avg_transit_days
FROM eventos_reales
WHERE cliente_id = 13;

-- Distribution by month
SELECT 
  TO_CHAR(fecha_programada, 'YYYY-MM') as month,
  COUNT(*) as events_count
FROM eventos_reales
WHERE cliente_id = 13
GROUP BY TO_CHAR(fecha_programada, 'YYYY-MM')
ORDER BY month;

-- Distribution by carrier
SELECT 
  c.legal_name as carrier,
  COUNT(*) as events_count,
  ROUND(AVG(er.tiempo_transito_dias)::NUMERIC, 2) as avg_transit_days
FROM eventos_reales er
JOIN carriers c ON er.carrier_id = c.id
WHERE er.cliente_id = 13
GROUP BY c.legal_name
ORDER BY events_count DESC;

-- Distribution by product
SELECT 
  p.nombre_producto as product,
  COUNT(*) as events_count,
  ROUND(AVG(er.tiempo_transito_dias)::NUMERIC, 2) as avg_transit_days
FROM eventos_reales er
JOIN productos_cliente p ON er.producto_id = p.id
WHERE er.cliente_id = 13
GROUP BY p.nombre_producto
ORDER BY events_count DESC;

-- Distribution by route (top 10)
SELECT 
  er.ciudad_origen || ' → ' || er.ciudad_destino as route,
  COUNT(*) as events_count,
  ROUND(AVG(er.tiempo_transito_dias)::NUMERIC, 2) as avg_transit_days
FROM eventos_reales er
WHERE er.cliente_id = 13
GROUP BY er.ciudad_origen, er.ciudad_destino
ORDER BY events_count DESC
LIMIT 10;

-- Verify no weekend dates
SELECT 
  'Events on weekends (should be 0):' as check_name,
  COUNT(*) as count
FROM eventos_reales
WHERE cliente_id = 13
  AND (EXTRACT(DOW FROM fecha_envio_real) IN (0, 6) 
       OR EXTRACT(DOW FROM fecha_recepcion_real) IN (0, 6));

-- Sample of generated events
SELECT 
  er.id,
  er.numero_etiqueta,
  er.nodo_origen,
  er.ciudad_origen,
  er.nodo_destino,
  er.ciudad_destino,
  TO_CHAR(er.fecha_programada, 'DD/MM/YYYY') as fecha_prog,
  TO_CHAR(er.fecha_envio_real, 'DD/MM/YYYY HH24:MI') as fecha_envio,
  TO_CHAR(er.fecha_recepcion_real, 'DD/MM/YYYY HH24:MI') as fecha_recep,
  er.tiempo_transito_dias,
  ROUND(er.tiempo_transito_horas, 2) as tiempo_transito_horas,
  c.legal_name as carrier,
  p.nombre_producto as producto
FROM eventos_reales er
JOIN carriers c ON er.carrier_id = c.id
JOIN productos_cliente p ON er.producto_id = p.id
WHERE er.cliente_id = 13
ORDER BY er.fecha_programada
LIMIT 10;

SELECT 'Script completed successfully!' as status;
