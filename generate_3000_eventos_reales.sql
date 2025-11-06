-- Generate 3000 eventos_reales for DEMO client (cliente_id = 13)
-- Distributed randomly throughout 2025

-- First, let's check what data we have available
SELECT 'Checking available data for DEMO client (id=13)' as step;

-- Check nodos
SELECT 'Available nodos:' as info, COUNT(*) as count FROM nodos WHERE codigo LIKE '0001-%';

-- Check panelistas
SELECT 'Available panelistas:' as info, COUNT(*) as count FROM panelistas WHERE cliente_id = 13;

-- Check productos
SELECT 'Available productos:' as info, COUNT(*) as count FROM productos_cliente WHERE cliente_id = 13;

-- Check carriers
SELECT 'Available carriers:' as info, COUNT(*) as count FROM carriers WHERE cliente_id = 13;

-- Now generate 3000 eventos_reales
-- We'll use a function to generate random data

DO $$
DECLARE
  i INTEGER;
  random_nodo_origen VARCHAR;
  random_nodo_destino VARCHAR;
  random_panelista_origen INTEGER;
  random_panelista_destino INTEGER;
  random_producto INTEGER;
  random_carrier INTEGER;
  random_fecha_programada DATE;
  random_fecha_envio TIMESTAMPTZ;
  random_fecha_recepcion TIMESTAMPTZ;
  random_numero_etiqueta VARCHAR;
  tiempo_transito_horas NUMERIC;
  
  nodos_array VARCHAR[];
  panelistas_array INTEGER[];
  productos_array INTEGER[];
  carriers_array INTEGER[];
BEGIN
  -- Get arrays of available data
  SELECT ARRAY_AGG(codigo) INTO nodos_array FROM nodos WHERE codigo LIKE '0001-%';
  SELECT ARRAY_AGG(id) INTO panelistas_array FROM panelistas WHERE cliente_id = 13;
  SELECT ARRAY_AGG(id) INTO productos_array FROM productos_cliente WHERE cliente_id = 13;
  SELECT ARRAY_AGG(id) INTO carriers_array FROM carriers WHERE cliente_id = 13;
  
  RAISE NOTICE 'Found % nodos, % panelistas, % productos, % carriers', 
    array_length(nodos_array, 1), 
    array_length(panelistas_array, 1),
    array_length(productos_array, 1),
    array_length(carriers_array, 1);
  
  -- Generate 3000 events
  FOR i IN 1..3000 LOOP
    -- Random nodos (different origin and destination)
    random_nodo_origen := nodos_array[1 + floor(random() * array_length(nodos_array, 1))::int];
    random_nodo_destino := nodos_array[1 + floor(random() * array_length(nodos_array, 1))::int];
    
    -- Ensure origin and destination are different
    WHILE random_nodo_origen = random_nodo_destino LOOP
      random_nodo_destino := nodos_array[1 + floor(random() * array_length(nodos_array, 1))::int];
    END LOOP;
    
    -- Random panelistas
    random_panelista_origen := panelistas_array[1 + floor(random() * array_length(panelistas_array, 1))::int];
    random_panelista_destino := panelistas_array[1 + floor(random() * array_length(panelistas_array, 1))::int];
    
    -- Random producto and carrier
    random_producto := productos_array[1 + floor(random() * array_length(productos_array, 1))::int];
    random_carrier := carriers_array[1 + floor(random() * array_length(carriers_array, 1))::int];
    
    -- Random date in 2025 (distributed throughout the year)
    random_fecha_programada := DATE '2025-01-01' + (random() * 364)::int;
    
    -- Send date: programmed date + random 0-3 days delay
    random_fecha_envio := random_fecha_programada::timestamp + (random() * 3)::int * interval '1 day' + (random() * 24)::int * interval '1 hour';
    
    -- Receive date: send date + random 1-7 days transit time
    tiempo_transito_horas := 24 + (random() * 144); -- 1 to 7 days in hours
    random_fecha_recepcion := random_fecha_envio + (tiempo_transito_horas || ' hours')::interval;
    
    -- Random tracking number
    random_numero_etiqueta := 'TRACK-' || LPAD(i::text, 6, '0') || '-' || TO_CHAR(random_fecha_programada, 'YYYYMMDD');
    
    -- Insert into eventos_reales
    INSERT INTO eventos_reales (
      allocation_plan_detail_id,
      cliente_id,
      carrier_id,
      producto_id,
      nodo_origen,
      nodo_destino,
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
      NULL, -- No allocation plan detail for these synthetic events
      13, -- cliente_id (DEMO)
      random_carrier,
      random_producto,
      random_nodo_origen,
      random_nodo_destino,
      random_panelista_origen,
      random_panelista_destino,
      random_fecha_programada,
      random_fecha_envio,
      random_fecha_recepcion,
      EXTRACT(DAY FROM (random_fecha_recepcion - random_fecha_envio))::INTEGER,
      tiempo_transito_horas,
      random_numero_etiqueta,
      random_fecha_recepcion + interval '1 hour', -- Validated 1 hour after reception
      NULL -- No specific user validated these synthetic events
    );
    
    -- Progress indicator every 500 events
    IF i % 500 = 0 THEN
      RAISE NOTICE 'Generated % events...', i;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Successfully generated 3000 eventos_reales!';
END $$;

-- Verify the results
SELECT 'Verification Results:' as step;

SELECT 
  COUNT(*) as total_eventos,
  MIN(fecha_programada) as earliest_date,
  MAX(fecha_programada) as latest_date,
  AVG(tiempo_transito_horas)::NUMERIC(10,2) as avg_transit_hours,
  MIN(tiempo_transito_horas)::NUMERIC(10,2) as min_transit_hours,
  MAX(tiempo_transito_horas)::NUMERIC(10,2) as max_transit_hours
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

-- Sample of generated events
SELECT 
  id,
  nodo_origen,
  nodo_destino,
  fecha_programada,
  fecha_envio_real,
  fecha_recepcion_real,
  tiempo_transito_dias,
  numero_etiqueta
FROM eventos_reales
WHERE cliente_id = 13
ORDER BY fecha_programada
LIMIT 10;
