-- Update get_transit_time_distribution to properly handle current day events
-- by casting timestamp to date for comparison instead of implicit midnight conversion
CREATE OR REPLACE FUNCTION public.get_transit_time_distribution(
  p_cliente_id integer, 
  p_ciudad_origen text, 
  p_carrier_id integer DEFAULT NULL::integer, 
  p_producto_id integer DEFAULT NULL::integer, 
  p_start_date date DEFAULT NULL::date, 
  p_end_date date DEFAULT NULL::date
)
RETURNS TABLE(
  ciudad_destino text, 
  clasificacion_destino text, 
  transit_days integer, 
  event_count bigint, 
  total_events_route bigint, 
  cumulative_count bigint, 
  cumulative_percentage numeric, 
  standard_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_events AS (
    SELECT 
      er.nodo_destino,
      er.tiempo_transito_dias,
      n_dest.ciudad as ciudad_dest,
      c_dest.clasificacion as clase_dest
    FROM eventos_reales er
    INNER JOIN nodos n_orig ON er.nodo_origen = n_orig.codigo AND n_orig.cliente_id = p_cliente_id
    INNER JOIN nodos n_dest ON er.nodo_destino = n_dest.codigo AND n_dest.cliente_id = p_cliente_id
    INNER JOIN ciudades c_dest ON n_dest.ciudad_id = c_dest.id
    WHERE er.cliente_id = p_cliente_id
      AND n_orig.ciudad = p_ciudad_origen
      AND er.tiempo_transito_dias IS NOT NULL
      AND er.fecha_envio_real IS NOT NULL
      AND er.fecha_recepcion_real IS NOT NULL
      AND (p_carrier_id IS NULL OR er.carrier_id = p_carrier_id)
      AND (p_producto_id IS NULL OR er.producto_id = p_producto_id)
      AND (p_start_date IS NULL OR er.fecha_envio_real::date >= p_start_date)
      AND (p_end_date IS NULL OR er.fecha_envio_real::date <= p_end_date)
  ),
  event_counts AS (
    SELECT 
      ciudad_dest,
      clase_dest,
      tiempo_transito_dias,
      COUNT(*) as cnt
    FROM filtered_events
    GROUP BY ciudad_dest, clase_dest, tiempo_transito_dias
  ),
  route_totals AS (
    SELECT 
      ciudad_dest,
      SUM(cnt) as total
    FROM event_counts
    GROUP BY ciudad_dest
  ),
  cumulative_data AS (
    SELECT 
      ec.ciudad_dest,
      ec.clase_dest,
      ec.tiempo_transito_dias,
      ec.cnt,
      rt.total,
      SUM(ec.cnt) OVER (
        PARTITION BY ec.ciudad_dest 
        ORDER BY ec.tiempo_transito_dias
      ) as cum_count
    FROM event_counts ec
    INNER JOIN route_totals rt ON ec.ciudad_dest = rt.ciudad_dest
  ),
  standards AS (
    SELECT DISTINCT
      c_dest.nombre as ciudad,
      COALESCE(ctt.dias_transito, CEIL(pc.standard_delivery_hours::NUMERIC / 24)) as std_days
    FROM ciudades c_orig
    CROSS JOIN ciudades c_dest
    LEFT JOIN ciudad_transit_times ctt ON 
      ctt.ciudad_origen_id = c_orig.id AND 
      ctt.ciudad_destino_id = c_dest.id AND
      ctt.cliente_id = p_cliente_id
    LEFT JOIN productos_cliente pc ON 
      pc.id = p_producto_id AND
      pc.cliente_id = p_cliente_id
    WHERE c_orig.nombre = p_ciudad_origen
      AND c_orig.cliente_id = p_cliente_id
      AND c_dest.cliente_id = p_cliente_id
  )
  SELECT 
    cd.ciudad_dest::TEXT,
    cd.clase_dest::TEXT,
    cd.tiempo_transito_dias::INTEGER,
    cd.cnt::BIGINT,
    cd.total::BIGINT,
    cd.cum_count::BIGINT,
    ROUND((cd.cum_count::NUMERIC / cd.total::NUMERIC) * 100, 2) as cumulative_pct,
    COALESCE(s.std_days, 3)::INTEGER
  FROM cumulative_data cd
  LEFT JOIN standards s ON cd.ciudad_dest = s.ciudad
  ORDER BY cd.ciudad_dest, cd.tiempo_transito_dias;
END;
$function$;