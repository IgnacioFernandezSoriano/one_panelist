-- Create ENUM types for carriers table
CREATE TYPE operator_type AS ENUM ('universal_postal', 'private_postal', 'courier', 'logistics');
CREATE TYPE regulatory_status AS ENUM ('authorized', 'suspended', 'sanctioned', 'revoked');
CREATE TYPE geographic_scope AS ENUM ('local', 'regional', 'national', 'international');
CREATE TYPE report_format AS ENUM ('xml', 'json', 'csv');

-- Create carriers table
CREATE TABLE public.carriers (
    id SERIAL PRIMARY KEY,
    carrier_code VARCHAR(20) UNIQUE NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    tax_id VARCHAR(50),
    operator_type operator_type NOT NULL,
    
    license_number VARCHAR(100),
    regulatory_status regulatory_status NOT NULL,
    authorization_date DATE,
    license_expiration_date DATE,
    guarantee_amount NUMERIC(15,2),
    
    legal_representative VARCHAR(255),
    legal_address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    geographic_scope geographic_scope,
    declared_coverage TEXT,
    number_of_branches INTEGER,
    
    tracking_api_url VARCHAR(500),
    regulator_data_api_url VARCHAR(500),
    report_format report_format,
    
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_carrier_code ON public.carriers(carrier_code);
CREATE INDEX idx_regulatory_status ON public.carriers(regulatory_status);
CREATE INDEX idx_status ON public.carriers(status);

-- Enable RLS
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Allow authenticated full access to carriers"
ON public.carriers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create trigger to update updated_at column
CREATE TRIGGER update_carriers_updated_at
BEFORE UPDATE ON public.carriers
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();