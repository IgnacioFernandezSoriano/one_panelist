-- Add missing columns to generated_allocation_plan_details for shipment tracking

-- Add status column
ALTER TABLE public.generated_allocation_plan_details 
ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'PENDING';

-- Add tracking number column
ALTER TABLE public.generated_allocation_plan_details 
ADD COLUMN IF NOT EXISTS numero_etiqueta varchar(255);

-- Add actual shipment date column
ALTER TABLE public.generated_allocation_plan_details 
ADD COLUMN IF NOT EXISTS fecha_envio_real timestamp with time zone;

-- Add actual receipt date column
ALTER TABLE public.generated_allocation_plan_details 
ADD COLUMN IF NOT EXISTS fecha_recepcion_real timestamp with time zone;

-- Add index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_allocation_plan_details_status 
ON public.generated_allocation_plan_details(status);

-- Add index on cliente_id and status for faster filtering
CREATE INDEX IF NOT EXISTS idx_generated_allocation_plan_details_cliente_status 
ON public.generated_allocation_plan_details(cliente_id, status);

-- Comment on columns
COMMENT ON COLUMN public.generated_allocation_plan_details.status IS 'Event status: PENDING, NOTIFIED, SENT, RECEIVED, CONFIRMED, COMPLETED, CANCELLED';
COMMENT ON COLUMN public.generated_allocation_plan_details.numero_etiqueta IS 'Tracking number for the shipment';
COMMENT ON COLUMN public.generated_allocation_plan_details.fecha_envio_real IS 'Actual date and time when the shipment was sent';
COMMENT ON COLUMN public.generated_allocation_plan_details.fecha_recepcion_real IS 'Actual date and time when the shipment was received';
