-- Add fecha_ultima_modificacion column to envios table
ALTER TABLE public.envios 
ADD COLUMN fecha_ultima_modificacion timestamp without time zone NOT NULL DEFAULT now();

-- Create trigger to auto-update fecha_ultima_modificacion on envios table
DROP TRIGGER IF EXISTS update_envios_modified_column ON public.envios;

CREATE TRIGGER update_envios_modified_column
BEFORE UPDATE ON public.envios
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();