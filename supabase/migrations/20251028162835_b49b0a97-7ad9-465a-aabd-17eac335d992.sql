-- Drop ALL existing policies for usuarios table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'usuarios' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.usuarios';
    END LOOP;
END $$;

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(_user_id integer, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- CREATE NEW POLICIES

-- SELECT policies
CREATE POLICY "Superadmins can view all usuarios"
ON public.usuarios FOR SELECT
USING (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Admins can view usuarios in their cliente"
ON public.usuarios FOR SELECT
USING (
  has_role(get_current_user_id(), 'admin'::app_role) 
  AND cliente_id = get_user_cliente_id()
);

CREATE POLICY "Users can view own profile"
ON public.usuarios FOR SELECT
USING (id = get_current_user_id());

-- INSERT policies
CREATE POLICY "Superadmins can insert usuarios"
ON public.usuarios FOR INSERT
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Admins can insert usuarios in their cliente"
ON public.usuarios FOR INSERT
WITH CHECK (
  has_role(get_current_user_id(), 'admin'::app_role)
  AND cliente_id = get_user_cliente_id()
);

-- UPDATE policies
CREATE POLICY "Superadmins can update all usuarios"
ON public.usuarios FOR UPDATE
USING (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Admins can update usuarios in their cliente"
ON public.usuarios FOR UPDATE
USING (
  has_role(get_current_user_id(), 'admin'::app_role)
  AND cliente_id = get_user_cliente_id()
);

-- DELETE policies - THE CRITICAL RULES

-- Rule 1: Superadmins can delete any user (including other superadmins)
CREATE POLICY "Superadmins can delete any usuario"
ON public.usuarios FOR DELETE
USING (has_role(get_current_user_id(), 'superadmin'::app_role));

-- Rule 2: Admins can delete users in their cliente (except superadmins and other admins)
CREATE POLICY "Admins can delete non-admin usuarios in their cliente"
ON public.usuarios FOR DELETE
USING (
  has_role(get_current_user_id(), 'admin'::app_role)
  AND cliente_id = get_user_cliente_id()
  AND NOT user_has_role(id, 'superadmin'::app_role)
  AND NOT user_has_role(id, 'admin'::app_role)
);

-- Rule 3: Managers and coordinators CANNOT delete any usuarios (no policy = no access)