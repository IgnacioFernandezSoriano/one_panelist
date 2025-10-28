-- 1. Make cliente_id NOT NULL (carriers must belong to a client)
ALTER TABLE public.carriers 
ALTER COLUMN cliente_id SET NOT NULL;

-- 2. Drop the old policy that allows viewing global carriers
DROP POLICY IF EXISTS "Users can view global and their carriers" ON public.carriers;

-- 3. Keep the existing policies that are correct
-- "Superadmins can manage all carriers" - already exists and is correct
-- "Users can manage carriers in their cliente" - already exists and is correct

-- 4. Add explicit SELECT policy for users to only see their client's carriers
CREATE POLICY "Users can view carriers in their cliente"
ON public.carriers
FOR SELECT
TO authenticated
USING (cliente_id = get_user_cliente_id());