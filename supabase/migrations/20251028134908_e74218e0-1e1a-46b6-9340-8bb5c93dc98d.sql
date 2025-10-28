-- Add idioma_preferido column to usuarios table
ALTER TABLE public.usuarios 
ADD COLUMN idioma_preferido character varying NOT NULL DEFAULT 'es';

-- Add foreign key constraint to idiomas_disponibles
ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_idioma_preferido_fkey 
FOREIGN KEY (idioma_preferido) 
REFERENCES public.idiomas_disponibles(codigo);