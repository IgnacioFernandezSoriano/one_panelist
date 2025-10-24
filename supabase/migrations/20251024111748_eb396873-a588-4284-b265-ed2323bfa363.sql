-- Update estado_envio enum to English
-- First, remove the default
ALTER TABLE envios ALTER COLUMN estado DROP DEFAULT;

-- Rename old enum
ALTER TYPE estado_envio RENAME TO estado_envio_old;

-- Create new enum with English values
CREATE TYPE estado_envio AS ENUM ('PENDING', 'NOTIFIED', 'SENT', 'RECEIVED', 'CANCELLED');

-- Update existing data to use new enum values
ALTER TABLE envios 
  ALTER COLUMN estado TYPE estado_envio 
  USING (
    CASE estado::text
      WHEN 'PENDIENTE' THEN 'PENDING'::estado_envio
      WHEN 'NOTIFICADO' THEN 'NOTIFIED'::estado_envio
      WHEN 'ENVIADO' THEN 'SENT'::estado_envio
      WHEN 'RECIBIDO' THEN 'RECEIVED'::estado_envio
      WHEN 'CANCELADO' THEN 'CANCELLED'::estado_envio
    END
  );

-- Set new default value
ALTER TABLE envios ALTER COLUMN estado SET DEFAULT 'PENDING'::estado_envio;

-- Drop old enum type
DROP TYPE estado_envio_old;