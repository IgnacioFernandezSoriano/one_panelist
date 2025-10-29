-- Insertar panelistas de prueba para cubrir los 9 nodos sin asignar
-- Cliente: Test UPU (id: 1), Gestor: id 6

INSERT INTO panelistas (
  cliente_id, nombre_completo, email, telefono, 
  direccion_calle, direccion_ciudad, direccion_codigo_postal, direccion_pais,
  idioma, zona_horaria, plataforma_preferida, dias_comunicacion,
  horario_inicio, horario_fin, gestor_asignado_id, estado, nodo_asignado
) VALUES 
-- Panelistas para Barcelona (3)
(1, 'Ana García Martínez', 'ana.garcia.test@example.com', '+34600111001',
 'Carrer de Pau Claris, 123', 'Barcelona', '08009', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0001-0001-0001'),
 
(1, 'Carlos López Fernández', 'carlos.lopez.test@example.com', '+34600111002',
 'Passeig de Gràcia, 45', 'Barcelona', '08007', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0001-0001-0002'),
 
(1, 'Laura Sánchez Ruiz', 'laura.sanchez.test@example.com', '+34600111003',
 'Avinguda Diagonal, 567', 'Barcelona', '08029', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0001-0001-0003'),

-- Panelista para Girona (1)
(1, 'David Martín Torres', 'david.martin.test@example.com', '+34600111004',
 'Carrer de Santa Clara, 12', 'Girona', '17001', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0001-0002-0001'),

-- Panelista para La Palma (1)
(1, 'María González Pérez', 'maria.gonzalez.test@example.com', '+34600111005',
 'Calle Real, 34', 'Santa Cruz de La Palma', '38700', 'España',
 'es', 'Atlantic/Canary', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0002-0003-0001'),

-- Panelistas para Madrid Capital (3)
(1, 'José Rodríguez Díaz', 'jose.rodriguez.test@example.com', '+34600111006',
 'Calle Gran Vía, 28', 'Madrid', '28013', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0003-0004-0001'),
 
(1, 'Carmen Fernández Gil', 'carmen.fernandez.test@example.com', '+34600111007',
 'Calle de Alcalá, 156', 'Madrid', '28009', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0003-0004-0002'),
 
(1, 'Miguel Álvarez Ruiz', 'miguel.alvarez.test@example.com', '+34600111008',
 'Paseo de la Castellana, 89', 'Madrid', '28046', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0003-0004-0003'),

-- Panelista para Boadilla (1)
(1, 'Isabel Jiménez Moreno', 'isabel.jimenez.test@example.com', '+34600111009',
 'Avenida de Isabel de Farnesio, 15', 'Boadilla del Monte', '28660', 'España',
 'es', 'Europe/Madrid', 'whatsapp', 'ambos', '09:00:00', '18:00:00', 6, 'activo', '001-0003-0005-0001');

-- Actualizar la tabla nodos para asignar los panelistas_id a cada nodo
UPDATE nodos 
SET panelista_id = (SELECT id FROM panelistas WHERE nodo_asignado = nodos.codigo AND cliente_id = 1 LIMIT 1)
WHERE codigo IN ('001-0001-0001-0001', '001-0001-0001-0002', '001-0001-0001-0003', 
                 '001-0001-0002-0001', '001-0002-0003-0001', '001-0003-0004-0001', 
                 '001-0003-0004-0002', '001-0003-0004-0003', '001-0003-0005-0001')
  AND cliente_id = 1;