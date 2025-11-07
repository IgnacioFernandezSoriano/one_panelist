-- Create table for scheduled panelist changes
-- This table stores programmed changes that will automatically modify nodo_asignado
-- on specific dates, and revert the changes after the period ends

CREATE TABLE IF NOT EXISTS scheduled_panelist_changes (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- The node being reassigned
  nodo_codigo VARCHAR(50) NOT NULL,
  
  -- Current panelist (will lose the node temporarily)
  panelista_current_id INTEGER NOT NULL REFERENCES panelistas(id) ON DELETE CASCADE,
  
  -- New panelist (will receive the node temporarily), NULL means unassign
  panelista_new_id INTEGER REFERENCES panelistas(id) ON DELETE SET NULL,
  
  -- Date range for the temporary assignment
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- pending: Not yet applied
  -- active: Currently active (change applied)
  -- completed: Finished and reverted
  -- cancelled: Cancelled before execution
  
  -- Metadata
  motivo TEXT,
  affected_events_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES usuarios(id),
  applied_at TIMESTAMP WITH TIME ZONE,
  reverted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
);

-- Create indexes for efficient queries
CREATE INDEX idx_scheduled_changes_status_dates 
  ON scheduled_panelist_changes(cliente_id, status, fecha_inicio, fecha_fin);

CREATE INDEX idx_scheduled_changes_nodo 
  ON scheduled_panelist_changes(cliente_id, nodo_codigo);

CREATE INDEX idx_scheduled_changes_panelistas 
  ON scheduled_panelist_changes(panelista_current_id, panelista_new_id);

-- Enable Row Level Security
ALTER TABLE scheduled_panelist_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see changes for their cliente_id
CREATE POLICY "Users can view their own scheduled changes"
  ON scheduled_panelist_changes
  FOR SELECT
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- RLS Policy: Users can insert changes for their cliente_id
CREATE POLICY "Users can create scheduled changes"
  ON scheduled_panelist_changes
  FOR INSERT
  WITH CHECK (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
  );

-- RLS Policy: Users can update their own changes (only if pending or active)
CREATE POLICY "Users can update their own scheduled changes"
  ON scheduled_panelist_changes
  FOR UPDATE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
    AND status IN ('pending', 'active')
  );

-- RLS Policy: Users can delete their own changes (only if pending)
CREATE POLICY "Users can delete pending scheduled changes"
  ON scheduled_panelist_changes
  FOR DELETE
  USING (
    cliente_id IN (
      SELECT cliente_id 
      FROM usuarios 
      WHERE email = auth.email()
    )
    AND status = 'pending'
  );

-- Function to apply scheduled changes (called by cron job)
-- This function is executed daily to apply changes that should start today
CREATE OR REPLACE FUNCTION apply_scheduled_panelist_changes()
RETURNS TABLE (
  change_id INTEGER,
  nodo_codigo VARCHAR(50),
  panelista_current_name VARCHAR(255),
  panelista_new_name VARCHAR(255),
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  change_record RECORD;
  current_panelist_name VARCHAR(255);
  new_panelist_name VARCHAR(255);
BEGIN
  -- Find all pending changes that should start today
  FOR change_record IN
    SELECT sc.*
    FROM scheduled_panelist_changes sc
    WHERE sc.status = 'pending'
      AND sc.fecha_inicio = CURRENT_DATE
    ORDER BY sc.id
  LOOP
    BEGIN
      -- Get panelist names for logging
      SELECT nombre_completo INTO current_panelist_name
      FROM panelistas WHERE id = change_record.panelista_current_id;
      
      IF change_record.panelista_new_id IS NOT NULL THEN
        SELECT nombre_completo INTO new_panelist_name
        FROM panelistas WHERE id = change_record.panelista_new_id;
      ELSE
        new_panelist_name := 'UNASSIGNED';
      END IF;
      
      -- Remove node from current panelist
      UPDATE panelistas
      SET nodo_asignado = NULL
      WHERE id = change_record.panelista_current_id
        AND nodo_asignado = change_record.nodo_codigo;
      
      -- Assign node to new panelist (if not NULL)
      IF change_record.panelista_new_id IS NOT NULL THEN
        UPDATE panelistas
        SET nodo_asignado = change_record.nodo_codigo
        WHERE id = change_record.panelista_new_id;
      END IF;
      
      -- Update status to active
      UPDATE scheduled_panelist_changes
      SET status = 'active',
          applied_at = NOW()
      WHERE id = change_record.id;
      
      -- Return success
      RETURN QUERY SELECT 
        change_record.id,
        change_record.nodo_codigo,
        current_panelist_name,
        new_panelist_name,
        true,
        NULL::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      RETURN QUERY SELECT 
        change_record.id,
        change_record.nodo_codigo,
        current_panelist_name,
        new_panelist_name,
        false,
        SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to revert scheduled changes (called by cron job)
-- This function is executed daily to revert changes that should end today
CREATE OR REPLACE FUNCTION revert_scheduled_panelist_changes()
RETURNS TABLE (
  change_id INTEGER,
  nodo_codigo VARCHAR(50),
  panelista_current_name VARCHAR(255),
  panelista_new_name VARCHAR(255),
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  change_record RECORD;
  current_panelist_name VARCHAR(255);
  new_panelist_name VARCHAR(255);
BEGIN
  -- Find all active changes that should end today
  FOR change_record IN
    SELECT sc.*
    FROM scheduled_panelist_changes sc
    WHERE sc.status = 'active'
      AND sc.fecha_fin < CURRENT_DATE
    ORDER BY sc.id
  LOOP
    BEGIN
      -- Get panelist names for logging
      SELECT nombre_completo INTO current_panelist_name
      FROM panelistas WHERE id = change_record.panelista_current_id;
      
      IF change_record.panelista_new_id IS NOT NULL THEN
        SELECT nombre_completo INTO new_panelist_name
        FROM panelistas WHERE id = change_record.panelista_new_id;
      ELSE
        new_panelist_name := 'UNASSIGNED';
      END IF;
      
      -- Remove node from new panelist (if not NULL)
      IF change_record.panelista_new_id IS NOT NULL THEN
        UPDATE panelistas
        SET nodo_asignado = NULL
        WHERE id = change_record.panelista_new_id
          AND nodo_asignado = change_record.nodo_codigo;
      END IF;
      
      -- Restore node to current panelist
      UPDATE panelistas
      SET nodo_asignado = change_record.nodo_codigo
      WHERE id = change_record.panelista_current_id;
      
      -- Update status to completed
      UPDATE scheduled_panelist_changes
      SET status = 'completed',
          reverted_at = NOW()
      WHERE id = change_record.id;
      
      -- Return success
      RETURN QUERY SELECT 
        change_record.id,
        change_record.nodo_codigo,
        current_panelist_name,
        new_panelist_name,
        true,
        NULL::TEXT;
        
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      RETURN QUERY SELECT 
        change_record.id,
        change_record.nodo_codigo,
        current_panelist_name,
        new_panelist_name,
        false,
        SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE scheduled_panelist_changes IS 
  'Stores scheduled panelist changes that will automatically modify nodo_asignado on specific dates and revert after the period ends.';

COMMENT ON FUNCTION apply_scheduled_panelist_changes IS 
  'Applies pending scheduled changes that should start today. Called by cron job daily.';

COMMENT ON FUNCTION revert_scheduled_panelist_changes IS 
  'Reverts active scheduled changes that should end today. Called by cron job daily.';
