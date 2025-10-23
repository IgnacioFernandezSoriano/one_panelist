-- Agregar campo panelista_id a la tabla nodos
ALTER TABLE nodos
ADD COLUMN IF NOT EXISTS panelista_id integer;

-- Agregar foreign key constraint para panelista_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_nodos_panelista'
  ) THEN
    ALTER TABLE nodos
    ADD CONSTRAINT fk_nodos_panelista 
    FOREIGN KEY (panelista_id) 
    REFERENCES panelistas(id);
  END IF;
END $$;