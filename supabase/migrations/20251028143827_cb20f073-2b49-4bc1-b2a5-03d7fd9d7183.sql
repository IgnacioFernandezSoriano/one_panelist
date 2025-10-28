-- Función para vincular usuario de auth con tabla usuarios
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el usuario ya existe en la tabla usuarios, no hacer nada
  -- (ya fue creado manualmente)
  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE email = NEW.email) THEN
    -- Si no existe, crear uno nuevo con el cliente por defecto
    INSERT INTO public.usuarios (
      email, 
      nombre_completo, 
      password_hash,
      cliente_id,
      estado,
      idioma_preferido
    ) VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
      'managed_by_auth',
      (SELECT id FROM public.clientes WHERE estado = 'activo' ORDER BY id LIMIT 1),
      'activo',
      'es'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger que se ejecuta cuando se crea un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();