-- Create table for tracking shipment status history
CREATE TABLE IF NOT EXISTS public.envios_estado_historial (
  id SERIAL PRIMARY KEY,
  envio_id INTEGER NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
  estado_anterior estado_envio,
  estado_nuevo estado_envio NOT NULL,
  fecha_cambio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  usuario_id INTEGER REFERENCES public.usuarios(id),
  notas TEXT,
  cliente_id INTEGER NOT NULL REFERENCES public.clientes(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.envios_estado_historial ENABLE ROW LEVEL SECURITY;

-- RLS Policies for envios_estado_historial
CREATE POLICY "Superadmins can manage all status history"
ON public.envios_estado_historial
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can view status history in their cliente"
ON public.envios_estado_historial
FOR SELECT
TO authenticated
USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Users can insert status history in their cliente"
ON public.envios_estado_historial
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = get_user_cliente_id());

-- Create trigger function to auto-log status changes
CREATE OR REPLACE FUNCTION public.log_envio_estado_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if estado actually changed
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.envios_estado_historial (
      envio_id,
      estado_anterior,
      estado_nuevo,
      usuario_id,
      cliente_id
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      get_current_user_id(),
      NEW.cliente_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on envios table
DROP TRIGGER IF EXISTS envios_estado_change_trigger ON public.envios;
CREATE TRIGGER envios_estado_change_trigger
  AFTER UPDATE ON public.envios
  FOR EACH ROW
  EXECUTE FUNCTION public.log_envio_estado_change();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_envios_estado_historial_envio_id 
ON public.envios_estado_historial(envio_id);

CREATE INDEX IF NOT EXISTS idx_envios_estado_historial_fecha_cambio 
ON public.envios_estado_historial(fecha_cambio DESC);

-- Insert permission for changing shipment status
INSERT INTO public.menu_permissions (menu_item, role, can_access)
VALUES 
  ('envios_change_status', 'superadmin', true),
  ('envios_change_status', 'admin', true),
  ('envios_change_status', 'coordinator', true),
  ('envios_change_status', 'manager', false)
ON CONFLICT (menu_item, role) DO UPDATE 
SET can_access = EXCLUDED.can_access;