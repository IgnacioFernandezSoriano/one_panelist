-- Insert section headers translations for PanelistaForm
INSERT INTO traducciones (clave, idioma, texto, categoria, descripcion) VALUES
('panelist.contact_data', 'es', 'Datos de Contacto', 'panelist', 'Contact data section'),
('panelist.contact_data', 'en', 'Contact Data', 'panelist', 'Contact data section'),
('panelist.contact_data', 'pt', 'Dados de Contato', 'panelist', 'Contact data section'),
('panelist.contact_data', 'fr', 'Données de Contact', 'panelist', 'Contact data section'),
('panelist.contact_data', 'de', 'Kontaktdaten', 'panelist', 'Contact data section'),
('panelist.contact_data', 'it', 'Dati di Contatto', 'panelist', 'Contact data section'),

('panelist.contact_schedule', 'es', 'Días y Horarios de Contacto', 'panelist', 'Contact schedule section'),
('panelist.contact_schedule', 'en', 'Contact Days and Hours', 'panelist', 'Contact schedule section'),
('panelist.contact_schedule', 'pt', 'Dias e Horários de Contato', 'panelist', 'Contact schedule section'),
('panelist.contact_schedule', 'fr', 'Jours et Horaires de Contact', 'panelist', 'Contact schedule section'),
('panelist.contact_schedule', 'de', 'Kontakttage und -zeiten', 'panelist', 'Contact schedule section'),
('panelist.contact_schedule', 'it', 'Giorni e Orari di Contatto', 'panelist', 'Contact schedule section'),

('panelist.management_data', 'es', 'Datos de Gestión', 'panelist', 'Management data section'),
('panelist.management_data', 'en', 'Management Data', 'panelist', 'Management data section'),
('panelist.management_data', 'pt', 'Dados de Gestão', 'panelist', 'Management data section'),
('panelist.management_data', 'fr', 'Données de Gestion', 'panelist', 'Management data section'),
('panelist.management_data', 'de', 'Verwaltungsdaten', 'panelist', 'Management data section'),
('panelist.management_data', 'it', 'Dati di Gestione', 'panelist', 'Management data section')
ON CONFLICT (clave, idioma) DO UPDATE SET
  texto = EXCLUDED.texto,
  categoria = EXCLUDED.categoria,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = now();