-- Create scheduled_leaves table for managing multiple leave periods
CREATE TABLE IF NOT EXISTS public.scheduled_leaves (
  id SERIAL PRIMARY KEY,
  panelista_id INTEGER NOT NULL REFERENCES public.panelistas(id) ON DELETE CASCADE,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  leave_start_date DATE NOT NULL,
  leave_end_date DATE NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_by INTEGER REFERENCES public.usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (leave_end_date >= leave_start_date)
);

-- Create indexes for scheduled_leaves
CREATE INDEX idx_scheduled_leaves_panelista ON public.scheduled_leaves(panelista_id);
CREATE INDEX idx_scheduled_leaves_cliente ON public.scheduled_leaves(cliente_id);
CREATE INDEX idx_scheduled_leaves_dates ON public.scheduled_leaves(leave_start_date, leave_end_date);
CREATE INDEX idx_scheduled_leaves_status ON public.scheduled_leaves(status);

-- Enable RLS on scheduled_leaves
ALTER TABLE public.scheduled_leaves ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_leaves
CREATE POLICY "Users can view scheduled leaves in their cliente"
  ON public.scheduled_leaves
  FOR SELECT
  USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Coordinators can insert scheduled leaves"
  ON public.scheduled_leaves
  FOR INSERT
  WITH CHECK (
    cliente_id = get_user_cliente_id() 
    AND (
      has_role(get_current_user_id(), 'coordinator'::app_role) 
      OR has_role(get_current_user_id(), 'admin'::app_role) 
      OR has_role(get_current_user_id(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "Coordinators can update scheduled leaves"
  ON public.scheduled_leaves
  FOR UPDATE
  USING (
    cliente_id = get_user_cliente_id() 
    AND (
      has_role(get_current_user_id(), 'coordinator'::app_role) 
      OR has_role(get_current_user_id(), 'admin'::app_role) 
      OR has_role(get_current_user_id(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "Coordinators can delete scheduled leaves"
  ON public.scheduled_leaves
  FOR DELETE
  USING (
    cliente_id = get_user_cliente_id() 
    AND (
      has_role(get_current_user_id(), 'coordinator'::app_role) 
      OR has_role(get_current_user_id(), 'admin'::app_role) 
      OR has_role(get_current_user_id(), 'superadmin'::app_role)
    )
  );

CREATE POLICY "Superadmins can manage all scheduled leaves"
  ON public.scheduled_leaves
  FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

-- Remove obsolete columns from panelistas table
ALTER TABLE public.panelistas 
  DROP COLUMN IF EXISTS current_leave_start,
  DROP COLUMN IF EXISTS current_leave_end;

-- Add comment to availability_status column
COMMENT ON COLUMN public.panelistas.availability_status IS 'Current availability status: active or temporary_leave. Calculated by cron job based on scheduled_leaves table.';