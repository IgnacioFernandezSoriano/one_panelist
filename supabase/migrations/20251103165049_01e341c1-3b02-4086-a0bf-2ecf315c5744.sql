-- 1. Create eventos_reales table for validated quality events
CREATE TABLE eventos_reales (
  id SERIAL PRIMARY KEY,
  envio_id INTEGER NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  carrier_id INTEGER REFERENCES carriers(id),
  producto_id INTEGER REFERENCES productos_cliente(id),
  nodo_origen VARCHAR NOT NULL,
  nodo_destino VARCHAR NOT NULL,
  panelista_origen_id INTEGER REFERENCES panelistas(id),
  panelista_destino_id INTEGER REFERENCES panelistas(id),
  fecha_programada DATE NOT NULL,
  fecha_envio_real TIMESTAMP,
  fecha_recepcion_real TIMESTAMP,
  tiempo_transito_dias INTEGER,
  numero_etiqueta VARCHAR,
  tipo_producto VARCHAR,
  carrier_name VARCHAR,
  fecha_validacion TIMESTAMP NOT NULL DEFAULT NOW(),
  validado_por INTEGER REFERENCES usuarios(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE eventos_reales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view eventos_reales in their cliente"
  ON eventos_reales FOR SELECT
  USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Superadmins can manage all eventos_reales"
  ON eventos_reales FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can insert eventos_reales in their cliente"
  ON eventos_reales FOR INSERT
  WITH CHECK (cliente_id = get_user_cliente_id());

CREATE INDEX idx_eventos_reales_cliente ON eventos_reales(cliente_id);
CREATE INDEX idx_eventos_reales_envio ON eventos_reales(envio_id);
CREATE INDEX idx_eventos_reales_fecha_programada ON eventos_reales(fecha_programada);
CREATE INDEX idx_eventos_reales_carrier ON eventos_reales(carrier_id);
CREATE INDEX idx_eventos_reales_producto ON eventos_reales(producto_id);

-- 2. Create envios_validacion_pendiente table for failed validations
CREATE TABLE envios_validacion_pendiente (
  id SERIAL PRIMARY KEY,
  envio_id INTEGER NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  validaciones_fallidas JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR NOT NULL DEFAULT 'pending_review' CHECK (estado IN ('pending_review', 'approved', 'rejected')),
  notas_revision TEXT,
  revisado_por INTEGER REFERENCES usuarios(id),
  fecha_revision TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(envio_id)
);

ALTER TABLE envios_validacion_pendiente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations in their cliente"
  ON envios_validacion_pendiente FOR SELECT
  USING (cliente_id = get_user_cliente_id());

CREATE POLICY "Superadmins can manage all validations"
  ON envios_validacion_pendiente FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage validations in their cliente"
  ON envios_validacion_pendiente FOR ALL
  USING (cliente_id = get_user_cliente_id())
  WITH CHECK (cliente_id = get_user_cliente_id());

CREATE INDEX idx_validacion_pendiente_envio ON envios_validacion_pendiente(envio_id);
CREATE INDEX idx_validacion_pendiente_cliente ON envios_validacion_pendiente(cliente_id);
CREATE INDEX idx_validacion_pendiente_estado ON envios_validacion_pendiente(estado);

-- 3. Add validation_status column to envios table
ALTER TABLE envios 
ADD COLUMN validation_status VARCHAR DEFAULT 'not_validated' 
CHECK (validation_status IN ('not_validated', 'pending_review', 'validated', 'rejected'));

CREATE INDEX idx_envios_validation_status ON envios(validation_status);

-- 4. Create trigger for automatic validation marking
CREATE OR REPLACE FUNCTION trigger_validate_on_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'RECEIVED' AND (OLD.estado IS NULL OR OLD.estado != 'RECEIVED') THEN
    NEW.validation_status := 'not_validated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_received_events
  BEFORE UPDATE ON envios
  FOR EACH ROW
  EXECUTE FUNCTION trigger_validate_on_received();