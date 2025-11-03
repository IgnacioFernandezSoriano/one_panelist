-- Add availability tracking fields to panelistas table
ALTER TABLE panelistas 
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'active' 
  CHECK (availability_status IN ('active', 'temporary_leave', 'inactive')),
ADD COLUMN IF NOT EXISTS current_leave_start DATE NULL,
ADD COLUMN IF NOT EXISTS current_leave_end DATE NULL,
ADD COLUMN IF NOT EXISTS last_availability_change TIMESTAMP DEFAULT NOW();

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_panelistas_availability_status ON panelistas(availability_status);
CREATE INDEX IF NOT EXISTS idx_panelistas_leave_dates ON panelistas(current_leave_start, current_leave_end);

-- Create availability log table
CREATE TABLE IF NOT EXISTS panelistas_availability_log (
  id SERIAL PRIMARY KEY,
  panelista_id INTEGER NOT NULL REFERENCES panelistas(id) ON DELETE CASCADE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  
  -- Status tracking
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'temporary_leave', 'inactive')),
  previous_status VARCHAR(50) NULL,
  
  -- Leave dates
  leave_start_date DATE NULL,
  leave_end_date DATE NULL,
  
  -- Metadata
  reason VARCHAR(255) NULL,
  notes TEXT NULL,
  
  -- Audit
  changed_by INTEGER NULL REFERENCES usuarios(id),
  changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for availability_log
CREATE INDEX IF NOT EXISTS idx_availability_log_panelista ON panelistas_availability_log(panelista_id);
CREATE INDEX IF NOT EXISTS idx_availability_log_dates ON panelistas_availability_log(leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_availability_log_cliente ON panelistas_availability_log(cliente_id);

-- Enable RLS on availability_log
ALTER TABLE panelistas_availability_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for panelistas_availability_log
CREATE POLICY "Users can view logs in their cliente"
ON panelistas_availability_log FOR SELECT
USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Coordinators can insert logs"
ON panelistas_availability_log FOR INSERT
WITH CHECK (
  cliente_id = get_user_cliente_id() AND
  (has_role(get_current_user_id(), 'coordinator'::app_role) OR
   has_role(get_current_user_id(), 'admin'::app_role) OR
   has_role(get_current_user_id(), 'superadmin'::app_role))
);

CREATE POLICY "Superadmins can manage all logs"
ON panelistas_availability_log FOR ALL
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));