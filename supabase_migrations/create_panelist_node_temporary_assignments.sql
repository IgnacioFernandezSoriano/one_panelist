-- Create table for temporary panelist-to-node assignments
-- This allows temporary reassignment of panelists to nodes for specific date ranges
-- without permanently modifying the events in generated_allocation_plan_details

CREATE TABLE IF NOT EXISTS panelist_node_temporary_assignments (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nodo_codigo VARCHAR(50) NOT NULL,
  panelista_id INTEGER REFERENCES panelistas(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES usuarios(id),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT unique_nodo_date_range UNIQUE (cliente_id, nodo_codigo, fecha_inicio, fecha_fin)
);

-- Create index for efficient queries by date range
CREATE INDEX idx_temp_assignments_nodo_dates 
  ON panelist_node_temporary_assignments(cliente_id, nodo_codigo, fecha_inicio, fecha_fin);

-- Create index for efficient queries by panelist
CREATE INDEX idx_temp_assignments_panelista 
  ON panelist_node_temporary_assignments(cliente_id, panelista_id);

-- Enable Row Level Security
ALTER TABLE panelist_node_temporary_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see assignments for their cliente_id
CREATE POLICY "Users can view their own temporary assignments"
  ON panelist_node_temporary_assignments
  FOR SELECT
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- RLS Policy: Users can insert assignments for their cliente_id
CREATE POLICY "Users can create temporary assignments"
  ON panelist_node_temporary_assignments
  FOR INSERT
  WITH CHECK (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- RLS Policy: Users can update their own assignments
CREATE POLICY "Users can update their own temporary assignments"
  ON panelist_node_temporary_assignments
  FOR UPDATE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- RLS Policy: Users can delete their own assignments
CREATE POLICY "Users can delete their own temporary assignments"
  ON panelist_node_temporary_assignments
  FOR DELETE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- Create function to resolve which panelist is assigned to a node on a specific date
-- This function checks temporary assignments first, then falls back to permanent assignment
CREATE OR REPLACE FUNCTION get_panelist_for_node_on_date(
  p_cliente_id INTEGER,
  p_nodo_codigo VARCHAR(50),
  p_fecha DATE
)
RETURNS TABLE (
  panelista_id INTEGER,
  nombre_completo VARCHAR(255),
  is_temporary BOOLEAN,
  assignment_source VARCHAR(50)
) AS $$
BEGIN
  -- First, check for temporary assignment
  RETURN QUERY
  SELECT 
    p.id,
    p.nombre_completo,
    true as is_temporary,
    'temporary_assignment'::VARCHAR(50) as assignment_source
  FROM panelist_node_temporary_assignments ta
  JOIN panelistas p ON p.id = ta.panelista_id
  WHERE ta.cliente_id = p_cliente_id
    AND ta.nodo_codigo = p_nodo_codigo
    AND p_fecha BETWEEN ta.fecha_inicio AND ta.fecha_fin
  LIMIT 1;
  
  -- If no temporary assignment found, check permanent assignment
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.nombre_completo,
      false as is_temporary,
      'permanent_assignment'::VARCHAR(50) as assignment_source
    FROM panelistas p
    WHERE p.cliente_id = p_cliente_id
      AND p.nodo_asignado = p_nodo_codigo
      AND p.estado = 'activo'
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE panelist_node_temporary_assignments IS 
  'Stores temporary panelist-to-node assignments for specific date ranges. Used for massive panelist changes without modifying event data.';

COMMENT ON FUNCTION get_panelist_for_node_on_date IS 
  'Resolves which panelist is assigned to a node on a specific date, checking temporary assignments first, then permanent assignments.';
