-- Add carrier fields to envios table
ALTER TABLE public.envios
ADD COLUMN carrier_id INTEGER REFERENCES public.carriers(id),
ADD COLUMN carrier_name VARCHAR(255);

-- Create index for carrier_id for better performance
CREATE INDEX idx_envios_carrier_id ON public.envios(carrier_id);

-- Add comment to explain the columns
COMMENT ON COLUMN public.envios.carrier_id IS 'Reference to the carrier/postal operator handling this shipment';
COMMENT ON COLUMN public.envios.carrier_name IS 'Name of the carrier for quick reference (denormalized for performance)';