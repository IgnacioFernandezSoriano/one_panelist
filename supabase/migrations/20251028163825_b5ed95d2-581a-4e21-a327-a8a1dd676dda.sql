-- Función para validar que usuarios no-superadmin tengan cliente_id
CREATE OR REPLACE FUNCTION public.validate_usuario_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has superadmin role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id 
    AND role = 'superadmin'::app_role
  ) THEN
    -- Superadmin can have NULL cliente_id
    RETURN NEW;
  END IF;
  
  -- For non-superadmin users, cliente_id is required
  IF NEW.cliente_id IS NULL THEN
    RAISE EXCEPTION 'cliente_id is required for non-superadmin users';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar cliente_id en INSERT/UPDATE
DROP TRIGGER IF EXISTS validate_usuario_cliente_trigger ON public.usuarios;
CREATE TRIGGER validate_usuario_cliente_trigger
  BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_usuario_cliente();

-- Comentario explicativo
COMMENT ON FUNCTION public.validate_usuario_cliente() IS 
'Validates that non-superadmin users must have a cliente_id assigned. Only superadmin users can have NULL cliente_id.';