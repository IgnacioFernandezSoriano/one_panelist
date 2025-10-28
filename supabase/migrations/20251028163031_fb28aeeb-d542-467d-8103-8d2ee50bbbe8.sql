-- Restaurar el rol de superadmin para el usuario ID 1
INSERT INTO public.user_roles (user_id, role)
VALUES (1, 'superadmin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;