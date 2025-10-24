-- Update the function to handle different column names
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the table has fecha_ultima_modificacion column
  IF TG_TABLE_NAME IN ('panelistas', 'envios', 'incidencias') THEN
    NEW.fecha_ultima_modificacion = NOW();
  -- Check if the table has fecha_modificacion column
  ELSIF TG_TABLE_NAME IN ('regiones', 'ciudades', 'productos_cliente', 'configuracion_workflows', 'plantillas_mensajes') THEN
    NEW.fecha_modificacion = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;