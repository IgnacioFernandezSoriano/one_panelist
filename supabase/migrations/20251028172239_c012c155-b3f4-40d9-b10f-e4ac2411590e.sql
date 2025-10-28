-- 1. Add cliente_id column to tipos_material
ALTER TABLE public.tipos_material 
ADD COLUMN cliente_id INTEGER;

-- 2. Set cliente_id for existing records (assuming they belong to the first active client)
UPDATE public.tipos_material 
SET cliente_id = (SELECT id FROM public.clientes WHERE estado = 'activo' ORDER BY id LIMIT 1)
WHERE cliente_id IS NULL;

-- 3. Make cliente_id NOT NULL
ALTER TABLE public.tipos_material 
ALTER COLUMN cliente_id SET NOT NULL;

-- 4. Add foreign key constraint
ALTER TABLE public.tipos_material
ADD CONSTRAINT tipos_material_cliente_id_fkey 
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- 5. Drop old policies that allow viewing all material types
DROP POLICY IF EXISTS "Authenticated users can view tipos_material" ON public.tipos_material;

-- 6. Create new RLS policies for account separation
CREATE POLICY "Users can view material types in their cliente"
ON public.tipos_material
FOR SELECT
TO authenticated
USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Users can manage material types in their cliente"
ON public.tipos_material
FOR ALL
TO authenticated
USING (cliente_id = get_user_cliente_id())
WITH CHECK (cliente_id = get_user_cliente_id());

-- 7. Superadmins can manage all material types (keep existing)
-- "Superadmins and admins can manage tipos_material" policy should remain