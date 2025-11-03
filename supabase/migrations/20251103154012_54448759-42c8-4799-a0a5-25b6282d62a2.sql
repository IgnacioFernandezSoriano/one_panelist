-- Update RLS policies to allow users with permission to update status history
CREATE POLICY "Users with permission can update status history"
ON public.envios_estado_historial
FOR UPDATE
TO authenticated
USING (
  cliente_id = get_user_cliente_id() 
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.menu_permissions mp ON mp.role = ur.role
    WHERE ur.user_id = get_current_user_id()
    AND mp.menu_item = 'envios_change_status'
    AND mp.can_access = true
  )
)
WITH CHECK (
  cliente_id = get_user_cliente_id()
  AND EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.menu_permissions mp ON mp.role = ur.role
    WHERE ur.user_id = get_current_user_id()
    AND mp.menu_item = 'envios_change_status'
    AND mp.can_access = true
  )
);