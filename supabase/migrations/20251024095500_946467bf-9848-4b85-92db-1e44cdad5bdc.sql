-- Crear función para actualizar updated_at en carriers
CREATE OR REPLACE FUNCTION public.update_carriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS update_carriers_modtime ON public.carriers;

-- Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_carriers_modtime
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_carriers_updated_at();