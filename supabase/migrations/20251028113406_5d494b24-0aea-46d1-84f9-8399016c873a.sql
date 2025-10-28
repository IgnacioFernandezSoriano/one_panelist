-- Create table for available languages
CREATE TABLE public.idiomas_disponibles (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre_nativo VARCHAR(100) NOT NULL,
  nombre_ingles VARCHAR(100) NOT NULL,
  bandera_emoji VARCHAR(10),
  es_default BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for translations
CREATE TABLE public.traducciones (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(255) NOT NULL,
  idioma VARCHAR(10) NOT NULL,
  texto TEXT NOT NULL,
  categoria VARCHAR(100),
  descripcion TEXT,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_modificacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clave, idioma)
);

-- Add index for faster lookups
CREATE INDEX idx_traducciones_clave ON public.traducciones(clave);
CREATE INDEX idx_traducciones_idioma ON public.traducciones(idioma);
CREATE INDEX idx_traducciones_categoria ON public.traducciones(categoria);

-- Enable RLS
ALTER TABLE public.idiomas_disponibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traducciones ENABLE ROW LEVEL SECURITY;

-- RLS policies for idiomas_disponibles (everyone can read active languages)
CREATE POLICY "Anyone can view active languages"
ON public.idiomas_disponibles
FOR SELECT
USING (activo = true);

CREATE POLICY "Authenticated users can manage languages"
ON public.idiomas_disponibles
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for traducciones (everyone can read, authenticated can manage)
CREATE POLICY "Anyone can view translations"
ON public.traducciones
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage translations"
ON public.traducciones
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updating fecha_modificacion
CREATE TRIGGER update_traducciones_modified
BEFORE UPDATE ON public.traducciones
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Insert default languages
INSERT INTO public.idiomas_disponibles (codigo, nombre_nativo, nombre_ingles, bandera_emoji, es_default, activo)
VALUES 
  ('es', 'Español', 'Spanish', '🇪🇸', true, true),
  ('en', 'English', 'English', '🇬🇧', false, true),
  ('pt', 'Português', 'Portuguese', '🇧🇷', false, true);

-- Insert some initial translations for the UI
INSERT INTO public.traducciones (clave, idioma, texto, categoria, descripcion)
VALUES 
  ('menu.dashboard', 'es', 'Dashboard', 'menu', 'Menú Dashboard'),
  ('menu.dashboard', 'en', 'Dashboard', 'menu', 'Dashboard menu'),
  ('menu.dashboard', 'pt', 'Painel', 'menu', 'Menu Dashboard'),
  
  ('menu.allocation_plan', 'es', 'Plan de Asignación', 'menu', 'Menú Plan de Asignación'),
  ('menu.allocation_plan', 'en', 'Allocation Plan', 'menu', 'Allocation Plan menu'),
  ('menu.allocation_plan', 'pt', 'Plano de Alocação', 'menu', 'Menu Plano de Alocação'),
  
  ('menu.panelists', 'es', 'Panelistas', 'menu', 'Menú Panelistas'),
  ('menu.panelists', 'en', 'Panelists', 'menu', 'Panelists menu'),
  ('menu.panelists', 'pt', 'Painelistas', 'menu', 'Menu Painelistas'),
  
  ('menu.issues', 'es', 'Incidencias', 'menu', 'Menú Incidencias'),
  ('menu.issues', 'en', 'Issues', 'menu', 'Issues menu'),
  ('menu.issues', 'pt', 'Incidências', 'menu', 'Menu Incidências'),
  
  ('menu.topology', 'es', 'Topología', 'menu', 'Menú Topología'),
  ('menu.topology', 'en', 'Topology', 'menu', 'Topology menu'),
  ('menu.topology', 'pt', 'Topologia', 'menu', 'Menu Topologia'),
  
  ('menu.configuration', 'es', 'Configuración', 'menu', 'Menú Configuración'),
  ('menu.configuration', 'en', 'Configuration', 'menu', 'Configuration menu'),
  ('menu.configuration', 'pt', 'Configuração', 'menu', 'Menu Configuração'),
  
  ('common.save', 'es', 'Guardar', 'buttons', 'Botón guardar'),
  ('common.save', 'en', 'Save', 'buttons', 'Save button'),
  ('common.save', 'pt', 'Salvar', 'buttons', 'Botão salvar'),
  
  ('common.cancel', 'es', 'Cancelar', 'buttons', 'Botón cancelar'),
  ('common.cancel', 'en', 'Cancel', 'buttons', 'Cancel button'),
  ('common.cancel', 'pt', 'Cancelar', 'buttons', 'Botão cancelar'),
  
  ('common.delete', 'es', 'Eliminar', 'buttons', 'Botón eliminar'),
  ('common.delete', 'en', 'Delete', 'buttons', 'Delete button'),
  ('common.delete', 'pt', 'Excluir', 'buttons', 'Botão excluir'),
  
  ('common.edit', 'es', 'Editar', 'buttons', 'Botón editar'),
  ('common.edit', 'en', 'Edit', 'buttons', 'Edit button'),
  ('common.edit', 'pt', 'Editar', 'buttons', 'Botão editar');