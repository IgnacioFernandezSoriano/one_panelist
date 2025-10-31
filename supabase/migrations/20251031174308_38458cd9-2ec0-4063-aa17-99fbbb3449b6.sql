-- Create classification allocation matrix table
CREATE TABLE IF NOT EXISTS classification_allocation_matrix (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  destination_classification VARCHAR(1) NOT NULL CHECK (destination_classification IN ('A', 'B', 'C')),
  percentage_from_a NUMERIC(5,2) NOT NULL DEFAULT 33.33,
  percentage_from_b NUMERIC(5,2) NOT NULL DEFAULT 33.33,
  percentage_from_c NUMERIC(5,2) NOT NULL DEFAULT 33.34,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, destination_classification),
  CONSTRAINT check_classification_percentages_sum_100 
    CHECK (ABS((percentage_from_a + percentage_from_b + percentage_from_c) - 100) < 0.1)
);

-- Enable RLS
ALTER TABLE classification_allocation_matrix ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Superadmins can manage all classification matrices"
  ON classification_allocation_matrix
  FOR ALL
  USING (has_role(get_current_user_id(), 'superadmin'::app_role))
  WITH CHECK (has_role(get_current_user_id(), 'superadmin'::app_role));

CREATE POLICY "Users can manage classification matrices in their cliente"
  ON classification_allocation_matrix
  FOR ALL
  USING (cliente_id = get_user_cliente_id())
  WITH CHECK (cliente_id = get_user_cliente_id());

-- Migrate existing data from city_allocation_requirements (average by classification type)
INSERT INTO classification_allocation_matrix 
  (cliente_id, destination_classification, percentage_from_a, percentage_from_b, percentage_from_c)
SELECT 
  car.cliente_id,
  c.clasificacion as destination_classification,
  COALESCE(ROUND(AVG(car.percentage_from_a), 2), 33.33) as percentage_from_a,
  COALESCE(ROUND(AVG(car.percentage_from_b), 2), 33.33) as percentage_from_b,
  COALESCE(ROUND(AVG(car.percentage_from_c), 2), 33.34) as percentage_from_c
FROM city_allocation_requirements car
JOIN ciudades c ON c.id = car.ciudad_id
GROUP BY car.cliente_id, c.clasificacion
ON CONFLICT (cliente_id, destination_classification) DO UPDATE
  SET percentage_from_a = EXCLUDED.percentage_from_a,
      percentage_from_b = EXCLUDED.percentage_from_b,
      percentage_from_c = EXCLUDED.percentage_from_c,
      updated_at = NOW();

-- Insert default data for clientes that don't have any allocation data yet
INSERT INTO classification_allocation_matrix 
  (cliente_id, destination_classification, percentage_from_a, percentage_from_b, percentage_from_c)
SELECT 
  c.id as cliente_id,
  t.classification,
  33.33,
  33.33,
  33.34
FROM clientes c
CROSS JOIN (
  VALUES ('A'), ('B'), ('C')
) AS t(classification)
WHERE NOT EXISTS (
  SELECT 1 FROM classification_allocation_matrix cam
  WHERE cam.cliente_id = c.id AND cam.destination_classification = t.classification
)
ON CONFLICT (cliente_id, destination_classification) DO NOTHING;