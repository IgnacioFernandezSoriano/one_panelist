-- Create panelist_vacations table
CREATE TABLE IF NOT EXISTS public.panelist_vacations (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  panelista_id BIGINT NOT NULL REFERENCES public.panelistas(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT valid_date_range CHECK (fecha_fin >= fecha_inicio)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_panelist_vacations_cliente_id ON public.panelist_vacations(cliente_id);
CREATE INDEX IF NOT EXISTS idx_panelist_vacations_panelista_id ON public.panelist_vacations(panelista_id);
CREATE INDEX IF NOT EXISTS idx_panelist_vacations_dates ON public.panelist_vacations(fecha_inicio, fecha_fin);

-- Enable RLS
ALTER TABLE public.panelist_vacations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view vacations from their cliente"
  ON public.panelist_vacations
  FOR SELECT
  USING (
    cliente_id IN (
      SELECT u.cliente_id 
      FROM public.usuarios u
      WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can insert vacations for their cliente"
  ON public.panelist_vacations
  FOR INSERT
  WITH CHECK (
    cliente_id IN (
      SELECT u.cliente_id 
      FROM public.usuarios u
      WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can update vacations from their cliente"
  ON public.panelist_vacations
  FOR UPDATE
  USING (
    cliente_id IN (
      SELECT u.cliente_id 
      FROM public.usuarios u
      WHERE u.email = auth.email()
    )
  );

CREATE POLICY "Users can delete vacations from their cliente"
  ON public.panelist_vacations
  FOR DELETE
  USING (
    cliente_id IN (
      SELECT u.cliente_id 
      FROM public.usuarios u
      WHERE u.email = auth.email()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_panelist_vacations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_panelist_vacations_updated_at
  BEFORE UPDATE ON public.panelist_vacations
  FOR EACH ROW
  EXECUTE FUNCTION update_panelist_vacations_updated_at();
