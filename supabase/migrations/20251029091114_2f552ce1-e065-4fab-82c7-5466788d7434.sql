-- First, update any panelistas without cliente_id to assign them to a default client
-- This ensures data integrity before making the column NOT NULL
UPDATE public.panelistas
SET cliente_id = (SELECT id FROM public.clientes WHERE estado = 'activo' ORDER BY id LIMIT 1)
WHERE cliente_id IS NULL;

-- Make cliente_id NOT NULL to enforce data integrity
ALTER TABLE public.panelistas
ALTER COLUMN cliente_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'panelistas_cliente_id_fkey'
    AND table_name = 'panelistas'
  ) THEN
    ALTER TABLE public.panelistas
    ADD CONSTRAINT panelistas_cliente_id_fkey 
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS policies are strict and prevent cross-account access
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Superadmins can manage all panelistas" ON public.panelistas;
DROP POLICY IF EXISTS "Users can manage panelistas in their cliente" ON public.panelistas;

-- Recreate policies with explicit checks
CREATE POLICY "Superadmins can manage all panelistas"
ON public.panelistas
FOR ALL
TO authenticated
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage panelistas in their cliente"
ON public.panelistas
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id() AND cliente_id IS NOT NULL)
WITH CHECK (cliente_id = get_user_cliente_id() AND cliente_id IS NOT NULL);