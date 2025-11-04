-- Create function to calculate network health score
CREATE OR REPLACE FUNCTION calculate_network_health(
  p_cliente_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_events INTEGER;
  v_on_time_events INTEGER;
  v_valid_events INTEGER;
  v_avg_transit NUMERIC;
  v_events_with_issues INTEGER;
  v_on_time_rate NUMERIC;
  v_valid_rate NUMERIC;
  v_issue_rate NUMERIC;
  v_health_score NUMERIC;
BEGIN
  -- Total events in period
  SELECT COUNT(*) INTO v_total_events
  FROM eventos_reales
  WHERE cliente_id = p_cliente_id
    AND fecha_programada BETWEEN p_start_date AND p_end_date;
  
  IF v_total_events = 0 THEN
    RETURN json_build_object(
      'health_score', 0,
      'on_time_rate', 0,
      'valid_rate', 0,
      'avg_transit_time', 0,
      'issue_rate', 0,
      'total_events', 0
    );
  END IF;
  
  -- On-time events (received within 2 days of scheduled)
  SELECT COUNT(*) INTO v_on_time_events
  FROM eventos_reales
  WHERE cliente_id = p_cliente_id
    AND fecha_programada BETWEEN p_start_date AND p_end_date
    AND fecha_recepcion_real IS NOT NULL
    AND tiempo_transito_dias <= 2;
  
  -- Valid events (not cancelled)
  SELECT COUNT(*) INTO v_valid_events
  FROM eventos_reales er
  LEFT JOIN envios e ON er.envio_id = e.id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada BETWEEN p_start_date AND p_end_date
    AND (e.estado IS NULL OR e.estado != 'CANCELADO');
  
  -- Average transit time
  SELECT COALESCE(AVG(tiempo_transito_dias), 0) INTO v_avg_transit
  FROM eventos_reales
  WHERE cliente_id = p_cliente_id
    AND fecha_programada BETWEEN p_start_date AND p_end_date
    AND tiempo_transito_dias IS NOT NULL;
  
  -- Events with issues
  SELECT COUNT(DISTINCT er.id) INTO v_events_with_issues
  FROM eventos_reales er
  INNER JOIN incidencias i ON i.envio_id = er.envio_id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada BETWEEN p_start_date AND p_end_date;
  
  -- Calculate rates
  v_on_time_rate := (v_on_time_events::NUMERIC / v_total_events) * 100;
  v_valid_rate := (v_valid_events::NUMERIC / v_total_events) * 100;
  v_issue_rate := (v_events_with_issues::NUMERIC / v_total_events) * 100;
  
  -- Calculate health score (weighted average)
  v_health_score := 
    (v_on_time_rate * 0.4) + 
    (v_valid_rate * 0.3) + 
    (CASE WHEN v_avg_transit <= 2 THEN 100 ELSE GREATEST(0, 100 - (v_avg_transit - 2) * 10) END * 0.2) +
    (GREATEST(0, 100 - v_issue_rate * 2) * 0.1);
  
  RETURN json_build_object(
    'health_score', ROUND(v_health_score, 1),
    'on_time_rate', ROUND(v_on_time_rate, 1),
    'valid_rate', ROUND(v_valid_rate, 1),
    'avg_transit_time', ROUND(v_avg_transit, 1),
    'issue_rate', ROUND(v_issue_rate, 1),
    'total_events', v_total_events
  );
END;
$$;

-- Create function to get route performance
CREATE OR REPLACE FUNCTION get_route_performance(
  p_cliente_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  nodo_origen VARCHAR,
  nodo_destino VARCHAR,
  ciudad_origen VARCHAR,
  ciudad_destino VARCHAR,
  clasificacion_origen VARCHAR,
  clasificacion_destino VARCHAR,
  total_events INTEGER,
  on_time_events INTEGER,
  on_time_rate NUMERIC,
  avg_transit_time NUMERIC,
  route_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.nodo_origen,
    er.nodo_destino,
    er.nodo_origen as ciudad_origen,
    er.nodo_destino as ciudad_destino,
    co.clasificacion as clasificacion_origen,
    cd.clasificacion as clasificacion_destino,
    COUNT(*)::INTEGER as total_events,
    COUNT(*) FILTER (WHERE er.tiempo_transito_dias <= 2)::INTEGER as on_time_events,
    ROUND((COUNT(*) FILTER (WHERE er.tiempo_transito_dias <= 2)::NUMERIC / COUNT(*)) * 100, 1) as on_time_rate,
    ROUND(AVG(er.tiempo_transito_dias), 1) as avg_transit_time,
    ROUND(
      (COUNT(*) FILTER (WHERE er.tiempo_transito_dias <= 2)::NUMERIC / COUNT(*)) * 70 +
      CASE WHEN AVG(er.tiempo_transito_dias) <= 2 THEN 30 ELSE GREATEST(0, 30 - (AVG(er.tiempo_transito_dias) - 2) * 5) END,
      1
    ) as route_score
  FROM eventos_reales er
  LEFT JOIN nodos no ON er.nodo_origen = no.codigo
  LEFT JOIN nodos nd ON er.nodo_destino = nd.codigo
  LEFT JOIN ciudades co ON no.ciudad_id = co.id
  LEFT JOIN ciudades cd ON nd.ciudad_id = cd.id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada BETWEEN p_start_date AND p_end_date
  GROUP BY 
    er.nodo_origen, 
    er.nodo_destino, 
    co.clasificacion,
    cd.clasificacion
  HAVING COUNT(*) >= 3
  ORDER BY route_score DESC;
END;
$$;

-- Create function to get performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(
  p_cliente_id INTEGER,
  p_days_back INTEGER DEFAULT 90,
  p_granularity TEXT DEFAULT 'day'
)
RETURNS TABLE(
  period_date DATE,
  total_events INTEGER,
  on_time_rate NUMERIC,
  avg_transit_time NUMERIC,
  issue_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := CURRENT_DATE - p_days_back;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_granularity = 'week' THEN DATE_TRUNC('week', er.fecha_programada)::DATE
      WHEN p_granularity = 'month' THEN DATE_TRUNC('month', er.fecha_programada)::DATE
      ELSE er.fecha_programada
    END as period_date,
    COUNT(*)::INTEGER as total_events,
    ROUND((COUNT(*) FILTER (WHERE er.tiempo_transito_dias <= 2)::NUMERIC / COUNT(*)) * 100, 1) as on_time_rate,
    ROUND(AVG(er.tiempo_transito_dias), 1) as avg_transit_time,
    COUNT(DISTINCT i.id)::INTEGER as issue_count
  FROM eventos_reales er
  LEFT JOIN incidencias i ON i.envio_id = er.envio_id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada >= v_start_date
  GROUP BY period_date
  ORDER BY period_date;
END;
$$;

-- Create function to calculate SLA compliance
CREATE OR REPLACE FUNCTION calculate_sla_compliance(
  p_cliente_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_on_time_rate NUMERIC;
  v_valid_rate NUMERIC;
  v_avg_transit NUMERIC;
  v_issue_rate NUMERIC;
  v_total_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_events
  FROM eventos_reales
  WHERE cliente_id = p_cliente_id
    AND fecha_programada BETWEEN p_start_date AND p_end_date;
  
  IF v_total_events = 0 THEN
    RETURN json_build_object(
      'on_time_compliance', json_build_object('actual', 0, 'target', 90, 'status', 'critical'),
      'valid_rate_compliance', json_build_object('actual', 0, 'target', 95, 'status', 'critical'),
      'transit_time_compliance', json_build_object('actual', 0, 'target', 3, 'status', 'critical'),
      'issue_rate_compliance', json_build_object('actual', 0, 'target', 5, 'status', 'good')
    );
  END IF;
  
  -- Calculate metrics
  SELECT 
    ROUND((COUNT(*) FILTER (WHERE tiempo_transito_dias <= 2)::NUMERIC / COUNT(*)) * 100, 1),
    ROUND(AVG(tiempo_transito_dias), 1)
  INTO v_on_time_rate, v_avg_transit
  FROM eventos_reales
  WHERE cliente_id = p_cliente_id
    AND fecha_programada BETWEEN p_start_date AND p_end_date;
  
  SELECT ROUND((COUNT(DISTINCT CASE WHEN e.estado != 'CANCELADO' THEN er.id END)::NUMERIC / v_total_events) * 100, 1)
  INTO v_valid_rate
  FROM eventos_reales er
  LEFT JOIN envios e ON er.envio_id = e.id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada BETWEEN p_start_date AND p_end_date;
  
  SELECT ROUND((COUNT(DISTINCT er.id)::NUMERIC / v_total_events) * 100, 1)
  INTO v_issue_rate
  FROM eventos_reales er
  INNER JOIN incidencias i ON i.envio_id = er.envio_id
  WHERE er.cliente_id = p_cliente_id
    AND er.fecha_programada BETWEEN p_start_date AND p_end_date;
  
  RETURN json_build_object(
    'on_time_compliance', json_build_object(
      'actual', v_on_time_rate,
      'target', 90,
      'status', CASE WHEN v_on_time_rate >= 90 THEN 'good' WHEN v_on_time_rate >= 75 THEN 'warning' ELSE 'critical' END
    ),
    'valid_rate_compliance', json_build_object(
      'actual', v_valid_rate,
      'target', 95,
      'status', CASE WHEN v_valid_rate >= 95 THEN 'good' WHEN v_valid_rate >= 85 THEN 'warning' ELSE 'critical' END
    ),
    'transit_time_compliance', json_build_object(
      'actual', v_avg_transit,
      'target', 3,
      'status', CASE WHEN v_avg_transit <= 3 THEN 'good' WHEN v_avg_transit <= 4 THEN 'warning' ELSE 'critical' END
    ),
    'issue_rate_compliance', json_build_object(
      'actual', v_issue_rate,
      'target', 5,
      'status', CASE WHEN v_issue_rate <= 5 THEN 'good' WHEN v_issue_rate <= 10 THEN 'warning' ELSE 'critical' END
    )
  );
END;
$$;

-- Create function to analyze issues
CREATE OR REPLACE FUNCTION analyze_issues(
  p_cliente_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH issue_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE i.estado = 'abierta') as open_count,
      COUNT(*) FILTER (WHERE i.estado = 'en_progreso') as in_progress_count,
      COUNT(*) FILTER (WHERE i.estado = 'resuelta') as resolved_count,
      COUNT(*) as total_count
    FROM incidencias i
    INNER JOIN envios e ON i.envio_id = e.id
    WHERE i.cliente_id = p_cliente_id
      AND e.fecha_programada BETWEEN p_start_date AND p_end_date
  ),
  issue_by_type AS (
    SELECT 
      i.tipo::TEXT,
      COUNT(*) as count
    FROM incidencias i
    INNER JOIN envios e ON i.envio_id = e.id
    WHERE i.cliente_id = p_cliente_id
      AND e.fecha_programada BETWEEN p_start_date AND p_end_date
    GROUP BY i.tipo
  ),
  affected_routes AS (
    SELECT 
      e.nodo_origen,
      e.nodo_destino,
      COUNT(DISTINCT i.id) as issue_count
    FROM incidencias i
    INNER JOIN envios e ON i.envio_id = e.id
    WHERE i.cliente_id = p_cliente_id
      AND e.fecha_programada BETWEEN p_start_date AND p_end_date
    GROUP BY e.nodo_origen, e.nodo_destino
    ORDER BY issue_count DESC
    LIMIT 10
  )
  SELECT json_build_object(
    'summary', (SELECT row_to_json(issue_stats.*) FROM issue_stats),
    'by_type', (SELECT json_agg(row_to_json(issue_by_type.*)) FROM issue_by_type),
    'affected_routes', (SELECT json_agg(row_to_json(affected_routes.*)) FROM affected_routes)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;