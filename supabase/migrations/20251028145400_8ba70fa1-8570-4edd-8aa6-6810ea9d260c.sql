-- Create table for menu permissions
CREATE TABLE public.menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  menu_item varchar NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role, menu_item)
);

-- Enable RLS
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all menu permissions
CREATE POLICY "Superadmins can manage all menu permissions"
ON public.menu_permissions
FOR ALL
USING (has_role(get_current_user_id(), 'superadmin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

-- Admins can manage menu permissions
CREATE POLICY "Admins can manage menu permissions"
ON public.menu_permissions
FOR ALL
USING (has_role(get_current_user_id(), 'admin'::app_role))
WITH CHECK (has_role(get_current_user_id(), 'admin'::app_role));

-- All authenticated users can view menu permissions to check their access
CREATE POLICY "Users can view menu permissions"
ON public.menu_permissions
FOR SELECT
USING (true);

-- Insert default permissions for coordinator and manager roles
-- Main menu items
INSERT INTO public.menu_permissions (role, menu_item, can_access) VALUES
  ('coordinator', 'dashboard', true),
  ('coordinator', 'panelistas', true),
  ('coordinator', 'envios', true),
  ('coordinator', 'incidencias', true),
  ('coordinator', 'nodos', true),
  ('coordinator', 'topology', true),
  ('coordinator', 'import', true),
  ('manager', 'dashboard', true),
  ('manager', 'panelistas', true),
  ('manager', 'envios', true),
  ('manager', 'incidencias', true),
  ('manager', 'nodos', true),
  ('manager', 'topology', true),
  ('manager', 'import', true)
ON CONFLICT (role, menu_item) DO NOTHING;