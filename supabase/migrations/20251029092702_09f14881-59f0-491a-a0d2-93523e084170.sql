-- Insert missing translations for PanelistaForm
INSERT INTO traducciones (clave, idioma, texto, categoria, descripcion) VALUES
-- Account/Client
('panelist.account_client', 'es', 'Cuenta / Cliente', 'panelist', 'Account or client field'),
('panelist.account_client', 'en', 'Account / Client', 'panelist', 'Account or client field'),
('panelist.account_client', 'pt', 'Conta / Cliente', 'panelist', 'Account or client field'),
('panelist.account_client', 'fr', 'Compte / Client', 'panelist', 'Account or client field'),
('panelist.account_client', 'de', 'Konto / Kunde', 'panelist', 'Account or client field'),
('panelist.account_client', 'it', 'Account / Cliente', 'panelist', 'Account or client field'),

-- Phone
('panelist.phone_format', 'es', 'Teléfono (Formato Internacional)', 'panelist', 'Phone international format'),
('panelist.phone_format', 'en', 'Phone (International Format)', 'panelist', 'Phone international format'),
('panelist.phone_format', 'pt', 'Telefone (Formato Internacional)', 'panelist', 'Phone international format'),
('panelist.phone_format', 'fr', 'Téléphone (Format International)', 'panelist', 'Phone international format'),
('panelist.phone_format', 'de', 'Telefon (Internationales Format)', 'panelist', 'Phone international format'),
('panelist.phone_format', 'it', 'Telefono (Formato Internazionale)', 'panelist', 'Phone international format'),

('panelist.phone_format_hint', 'es', 'Formato: +[código país][número] (ej: +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),
('panelist.phone_format_hint', 'en', 'Format: +[country code][number] (e.g., +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),
('panelist.phone_format_hint', 'pt', 'Formato: +[código país][número] (ex: +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),
('panelist.phone_format_hint', 'fr', 'Format: +[code pays][numéro] (ex: +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),
('panelist.phone_format_hint', 'de', 'Format: +[Ländercode][Nummer] (z.B., +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),
('panelist.phone_format_hint', 'it', 'Formato: +[prefisso paese][numero] (es: +34600123456, +52155123456, +12025551234)', 'panelist', 'Phone format hint'),

-- Address fields
('panelist.street_address', 'es', 'Dirección', 'panelist', 'Street address'),
('panelist.street_address', 'en', 'Street Address', 'panelist', 'Street address'),
('panelist.street_address', 'pt', 'Endereço', 'panelist', 'Street address'),
('panelist.street_address', 'fr', 'Adresse', 'panelist', 'Street address'),
('panelist.street_address', 'de', 'Straße', 'panelist', 'Street address'),
('panelist.street_address', 'it', 'Indirizzo', 'panelist', 'Street address'),

('panelist.postal_code', 'es', 'Código Postal', 'panelist', 'Postal code'),
('panelist.postal_code', 'en', 'Postal Code', 'panelist', 'Postal code'),
('panelist.postal_code', 'pt', 'Código Postal', 'panelist', 'Postal code'),
('panelist.postal_code', 'fr', 'Code Postal', 'panelist', 'Postal code'),
('panelist.postal_code', 'de', 'Postleitzahl', 'panelist', 'Postal code'),
('panelist.postal_code', 'it', 'Codice Postale', 'panelist', 'Postal code'),

-- Time fields
('panelist.start_time', 'es', 'Hora de Inicio', 'panelist', 'Start time'),
('panelist.start_time', 'en', 'Start Time', 'panelist', 'Start time'),
('panelist.start_time', 'pt', 'Hora de Início', 'panelist', 'Start time'),
('panelist.start_time', 'fr', 'Heure de Début', 'panelist', 'Start time'),
('panelist.start_time', 'de', 'Startzeit', 'panelist', 'Start time'),
('panelist.start_time', 'it', 'Ora di Inizio', 'panelist', 'Start time'),

('panelist.end_time', 'es', 'Hora de Fin', 'panelist', 'End time'),
('panelist.end_time', 'en', 'End Time', 'panelist', 'End time'),
('panelist.end_time', 'pt', 'Hora de Término', 'panelist', 'End time'),
('panelist.end_time', 'fr', 'Heure de Fin', 'panelist', 'End time'),
('panelist.end_time', 'de', 'Endzeit', 'panelist', 'End time'),
('panelist.end_time', 'it', 'Ora di Fine', 'panelist', 'End time'),

-- Assigned Manager
('panelist.assigned_manager', 'es', 'Gestor Asignado', 'panelist', 'Assigned manager'),
('panelist.assigned_manager', 'en', 'Assigned Manager', 'panelist', 'Assigned manager'),
('panelist.assigned_manager', 'pt', 'Gestor Atribuído', 'panelist', 'Assigned manager'),
('panelist.assigned_manager', 'fr', 'Gestionnaire Attribué', 'panelist', 'Assigned manager'),
('panelist.assigned_manager', 'de', 'Zugewiesener Manager', 'panelist', 'Assigned manager'),
('panelist.assigned_manager', 'it', 'Manager Assegnato', 'panelist', 'Assigned manager'),

-- Node selectors
('panelist.select_node', 'es', 'Seleccionar nodo...', 'panelist', 'Select node placeholder'),
('panelist.select_node', 'en', 'Select node...', 'panelist', 'Select node placeholder'),
('panelist.select_node', 'pt', 'Selecionar nó...', 'panelist', 'Select node placeholder'),
('panelist.select_node', 'fr', 'Sélectionner un nœud...', 'panelist', 'Select node placeholder'),
('panelist.select_node', 'de', 'Knoten auswählen...', 'panelist', 'Select node placeholder'),
('panelist.select_node', 'it', 'Seleziona nodo...', 'panelist', 'Select node placeholder'),

('panelist.search_node', 'es', 'Buscar nodo...', 'panelist', 'Search node placeholder'),
('panelist.search_node', 'en', 'Search node...', 'panelist', 'Search node placeholder'),
('panelist.search_node', 'pt', 'Pesquisar nó...', 'panelist', 'Search node placeholder'),
('panelist.search_node', 'fr', 'Rechercher un nœud...', 'panelist', 'Search node placeholder'),
('panelist.search_node', 'de', 'Knoten suchen...', 'panelist', 'Search node placeholder'),
('panelist.search_node', 'it', 'Cerca nodo...', 'panelist', 'Search node placeholder'),

('panelist.no_node_found', 'es', 'No se encontró ningún nodo.', 'panelist', 'No node found message'),
('panelist.no_node_found', 'en', 'No node found.', 'panelist', 'No node found message'),
('panelist.no_node_found', 'pt', 'Nenhum nó encontrado.', 'panelist', 'No node found message'),
('panelist.no_node_found', 'fr', 'Aucun nœud trouvé.', 'panelist', 'No node found message'),
('panelist.no_node_found', 'de', 'Kein Knoten gefunden.', 'panelist', 'No node found message'),
('panelist.no_node_found', 'it', 'Nessun nodo trovato.', 'panelist', 'No node found message'),

-- Country selectors
('panelist.select_country', 'es', 'Seleccionar país...', 'panelist', 'Select country placeholder'),
('panelist.select_country', 'en', 'Select country...', 'panelist', 'Select country placeholder'),
('panelist.select_country', 'pt', 'Selecionar país...', 'panelist', 'Select country placeholder'),
('panelist.select_country', 'fr', 'Sélectionner un pays...', 'panelist', 'Select country placeholder'),
('panelist.select_country', 'de', 'Land auswählen...', 'panelist', 'Select country placeholder'),
('panelist.select_country', 'it', 'Seleziona paese...', 'panelist', 'Select country placeholder'),

('panelist.search_country', 'es', 'Buscar país...', 'panelist', 'Search country placeholder'),
('panelist.search_country', 'en', 'Search country...', 'panelist', 'Search country placeholder'),
('panelist.search_country', 'pt', 'Pesquisar país...', 'panelist', 'Search country placeholder'),
('panelist.search_country', 'fr', 'Rechercher un pays...', 'panelist', 'Search country placeholder'),
('panelist.search_country', 'de', 'Land suchen...', 'panelist', 'Search country placeholder'),
('panelist.search_country', 'it', 'Cerca paese...', 'panelist', 'Search country placeholder'),

('panelist.no_country_found', 'es', 'No se encontró ningún país.', 'panelist', 'No country found message'),
('panelist.no_country_found', 'en', 'No country found.', 'panelist', 'No country found message'),
('panelist.no_country_found', 'pt', 'Nenhum país encontrado.', 'panelist', 'No country found message'),
('panelist.no_country_found', 'fr', 'Aucun pays trouvé.', 'panelist', 'No country found message'),
('panelist.no_country_found', 'de', 'Kein Land gefunden.', 'panelist', 'No country found message'),
('panelist.no_country_found', 'it', 'Nessun paese trovato.', 'panelist', 'No country found message'),

-- Manager selectors
('panelist.select_manager', 'es', 'Seleccionar gestor...', 'panelist', 'Select manager placeholder'),
('panelist.select_manager', 'en', 'Select manager...', 'panelist', 'Select manager placeholder'),
('panelist.select_manager', 'pt', 'Selecionar gestor...', 'panelist', 'Select manager placeholder'),
('panelist.select_manager', 'fr', 'Sélectionner un gestionnaire...', 'panelist', 'Select manager placeholder'),
('panelist.select_manager', 'de', 'Manager auswählen...', 'panelist', 'Select manager placeholder'),
('panelist.select_manager', 'it', 'Seleziona manager...', 'panelist', 'Select manager placeholder'),

('panelist.search_manager', 'es', 'Buscar gestor...', 'panelist', 'Search manager placeholder'),
('panelist.search_manager', 'en', 'Search manager...', 'panelist', 'Search manager placeholder'),
('panelist.search_manager', 'pt', 'Pesquisar gestor...', 'panelist', 'Search manager placeholder'),
('panelist.search_manager', 'fr', 'Rechercher un gestionnaire...', 'panelist', 'Search manager placeholder'),
('panelist.search_manager', 'de', 'Manager suchen...', 'panelist', 'Search manager placeholder'),
('panelist.search_manager', 'it', 'Cerca manager...', 'panelist', 'Search manager placeholder'),

('panelist.no_manager_found', 'es', 'No se encontró ningún gestor.', 'panelist', 'No manager found message'),
('panelist.no_manager_found', 'en', 'No manager found.', 'panelist', 'No manager found message'),
('panelist.no_manager_found', 'pt', 'Nenhum gestor encontrado.', 'panelist', 'No manager found message'),
('panelist.no_manager_found', 'fr', 'Aucun gestionnaire trouvé.', 'panelist', 'No manager found message'),
('panelist.no_manager_found', 'de', 'Kein Manager gefunden.', 'panelist', 'No manager found message'),
('panelist.no_manager_found', 'it', 'Nessun manager trovato.', 'panelist', 'No manager found message'),

-- Client selectors
('panelist.select_client', 'es', 'Seleccionar cliente...', 'panelist', 'Select client placeholder'),
('panelist.select_client', 'en', 'Select client...', 'panelist', 'Select client placeholder'),
('panelist.select_client', 'pt', 'Selecionar cliente...', 'panelist', 'Select client placeholder'),
('panelist.select_client', 'fr', 'Sélectionner un client...', 'panelist', 'Select client placeholder'),
('panelist.select_client', 'de', 'Kunde auswählen...', 'panelist', 'Select client placeholder'),
('panelist.select_client', 'it', 'Seleziona cliente...', 'panelist', 'Select client placeholder'),

('panelist.search_client', 'es', 'Buscar cliente...', 'panelist', 'Search client placeholder'),
('panelist.search_client', 'en', 'Search client...', 'panelist', 'Search client placeholder'),
('panelist.search_client', 'pt', 'Pesquisar cliente...', 'panelist', 'Search client placeholder'),
('panelist.search_client', 'fr', 'Rechercher un client...', 'panelist', 'Search client placeholder'),
('panelist.search_client', 'de', 'Kunde suchen...', 'panelist', 'Search client placeholder'),
('panelist.search_client', 'it', 'Cerca cliente...', 'panelist', 'Search client placeholder'),

('panelist.no_client_found', 'es', 'No se encontró ningún cliente.', 'panelist', 'No client found message'),
('panelist.no_client_found', 'en', 'No client found.', 'panelist', 'No client found message'),
('panelist.no_client_found', 'pt', 'Nenhum cliente encontrado.', 'panelist', 'No client found message'),
('panelist.no_client_found', 'fr', 'Aucun client trouvé.', 'panelist', 'No client found message'),
('panelist.no_client_found', 'de', 'Kein Kunde gefunden.', 'panelist', 'No client found message'),
('panelist.no_client_found', 'it', 'Nessun cliente trovato.', 'panelist', 'No client found message'),

-- Communication days
('panelist.weekdays', 'es', 'Días Laborables', 'panelist', 'Weekdays option'),
('panelist.weekdays', 'en', 'Weekdays', 'panelist', 'Weekdays option'),
('panelist.weekdays', 'pt', 'Dias Úteis', 'panelist', 'Weekdays option'),
('panelist.weekdays', 'fr', 'Jours Ouvrables', 'panelist', 'Weekdays option'),
('panelist.weekdays', 'de', 'Werktage', 'panelist', 'Weekdays option'),
('panelist.weekdays', 'it', 'Giorni Feriali', 'panelist', 'Weekdays option'),

('panelist.weekends', 'es', 'Fines de Semana', 'panelist', 'Weekends option'),
('panelist.weekends', 'en', 'Weekends', 'panelist', 'Weekends option'),
('panelist.weekends', 'pt', 'Fins de Semana', 'panelist', 'Weekends option'),
('panelist.weekends', 'fr', 'Week-ends', 'panelist', 'Weekends option'),
('panelist.weekends', 'de', 'Wochenenden', 'panelist', 'Weekends option'),
('panelist.weekends', 'it', 'Fine Settimana', 'panelist', 'Weekends option'),

('panelist.both', 'es', 'Ambos', 'panelist', 'Both option'),
('panelist.both', 'en', 'Both', 'panelist', 'Both option'),
('panelist.both', 'pt', 'Ambos', 'panelist', 'Both option'),
('panelist.both', 'fr', 'Les Deux', 'panelist', 'Both option'),
('panelist.both', 'de', 'Beide', 'panelist', 'Both option'),
('panelist.both', 'it', 'Entrambi', 'panelist', 'Both option'),

-- Buttons
('button.add', 'es', 'Agregar', 'button', 'Add button'),
('button.add', 'en', 'Add', 'button', 'Add button'),
('button.add', 'pt', 'Adicionar', 'button', 'Add button'),
('button.add', 'fr', 'Ajouter', 'button', 'Add button'),
('button.add', 'de', 'Hinzufügen', 'button', 'Add button'),
('button.add', 'it', 'Aggiungi', 'button', 'Add button'),

('button.update_panelist', 'es', 'Actualizar Panelista', 'button', 'Update panelist button'),
('button.update_panelist', 'en', 'Update Panelist', 'button', 'Update panelist button'),
('button.update_panelist', 'pt', 'Atualizar Painelista', 'button', 'Update panelist button'),
('button.update_panelist', 'fr', 'Mettre à Jour le Panéliste', 'button', 'Update panelist button'),
('button.update_panelist', 'de', 'Panelist Aktualisieren', 'button', 'Update panelist button'),
('button.update_panelist', 'it', 'Aggiorna Panelista', 'button', 'Update panelist button'),

('button.creating', 'es', 'Creando...', 'button', 'Creating status'),
('button.creating', 'en', 'Creating...', 'button', 'Creating status'),
('button.creating', 'pt', 'Criando...', 'button', 'Creating status'),
('button.creating', 'fr', 'Création...', 'button', 'Creating status'),
('button.creating', 'de', 'Erstellen...', 'button', 'Creating status'),
('button.creating', 'it', 'Creazione...', 'button', 'Creating status'),

('button.updating', 'es', 'Actualizando...', 'button', 'Updating status'),
('button.updating', 'en', 'Updating...', 'button', 'Updating status'),
('button.updating', 'pt', 'Atualizando...', 'button', 'Updating status'),
('button.updating', 'fr', 'Mise à Jour...', 'button', 'Updating status'),
('button.updating', 'de', 'Aktualisieren...', 'button', 'Updating status'),
('button.updating', 'it', 'Aggiornamento...', 'button', 'Updating status'),

-- Form messages
('form.loading_account', 'es', 'Cargando cuenta...', 'form', 'Loading account message'),
('form.loading_account', 'en', 'Loading account...', 'form', 'Loading account message'),
('form.loading_account', 'pt', 'Carregando conta...', 'form', 'Loading account message'),
('form.loading_account', 'fr', 'Chargement du compte...', 'form', 'Loading account message'),
('form.loading_account', 'de', 'Konto wird geladen...', 'form', 'Loading account message'),
('form.loading_account', 'it', 'Caricamento account...', 'form', 'Loading account message')
ON CONFLICT (clave, idioma) DO UPDATE SET
  texto = EXCLUDED.texto,
  categoria = EXCLUDED.categoria,
  descripcion = EXCLUDED.descripcion,
  fecha_modificacion = now();