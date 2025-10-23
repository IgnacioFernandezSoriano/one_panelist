-- Crear enum para los días de comunicación
CREATE TYPE dias_comunicacion AS ENUM ('dias_laborables', 'fines_semana', 'ambos');

-- Agregar campo a la tabla panelistas
ALTER TABLE panelistas 
ADD COLUMN dias_comunicacion dias_comunicacion NOT NULL DEFAULT 'ambos';