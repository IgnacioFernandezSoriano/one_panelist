// Nueva versión simplificada de loadNodeRisks

const loadNodeRisks = async () => {
  try {
    setLoading(true);

    // PASO 1: Obtener TODOS los panelistas del cliente con nodo asignado
    const { data: panelistasConNodo, error: panelistasError } = await supabase
      .from('panelistas')
      .select('nodo_asignado, id, nombre_completo, estado')
      .eq('cliente_id', clienteId)
      .not('nodo_asignado', 'is', null);

    if (panelistasError) throw panelistasError;

    // Crear Set de nodos que SÍ tienen panelista asignado
    const nodosConPanelista = new Set(
      panelistasConNodo?.map(p => p.nodo_asignado) || []
    );

    console.log('Nodos con panelista asignado:', Array.from(nodosConPanelista));

    // PASO 2: Obtener eventos activos del cliente
    const { data: events, error: eventsError } = await supabase
      .from('generated_allocation_plan_details')
      .select(`
        *,
        plan:generated_allocation_plans!inner(status, cliente_id),
        producto:productos_cliente(id, nombre_producto),
        carrier:carriers(id, legal_name)
      `)
      .eq('plan.cliente_id', clienteId)
      .in('plan.status', ['draft', 'merged'])
      .neq('status', 'CANCELLED');

    if (eventsError) throw eventsError;

    if (!events || events.length === 0) {
      setRisks([]);
      setLoading(false);
      return;
    }

    // PASO 3: Obtener nodos únicos de los eventos
    const nodeCodesSet = new Set<string>();
    events.forEach(event => {
      nodeCodesSet.add(event.nodo_origen);
      nodeCodesSet.add(event.nodo_destino);
    });

    const nodeCodes = Array.from(nodeCodesSet);

    // PASO 4: Filtrar solo los nodos SIN panelista asignado
    const nodosSinPanelista = nodeCodes.filter(codigo => !nodosConPanelista.has(codigo));

    console.log('Nodos sin panelista:', nodosSinPanelista);

    if (nodosSinPanelista.length === 0) {
      setRisks([]);
      setLoading(false);
      return;
    }

    // PASO 5: Obtener información de los nodos sin panelista
    const { data: nodos, error: nodosError } = await supabase
      .from('nodos')
      .select(`
        codigo,
        ciudad,
        ciudad_id,
        region_id,
        pais,
        region:regiones(id, nombre),
        ciudad_info:ciudades(id, nombre, clasificacion)
      `)
      .eq('cliente_id', clienteId)
      .in('codigo', nodosSinPanelista);

    if (nodosError) throw nodosError;

    // PASO 6: Crear mapa de nodos
    const nodosMap = new Map(nodos?.map(n => [n.codigo, n]) || []);

    // PASO 7: Procesar eventos y agrupar por nodo sin panelista
    const risksMap = new Map<string, NodeRisk>();

    events?.forEach(event => {
      const eventDate = new Date(event.fecha_programada);
      
      // Verificar nodo origen
      if (nodosSinPanelista.includes(event.nodo_origen)) {
        const nodo = nodosMap.get(event.nodo_origen);
        if (nodo) {
          const key = nodo.codigo;
          const existing = risksMap.get(key);

          if (existing) {
            existing.affected_events_count++;
            // Agregar producto si no existe
            if (event.producto) {
              const productoExists = existing.productos.find(p => p.id === event.producto.id);
              if (!productoExists) {
                existing.productos.push({ 
                  id: event.producto.id, 
                  nombre: event.producto.nombre_producto 
                });
              }
            }
            // Agregar carrier si no existe
            if (event.carrier) {
              const carrierExists = existing.carriers.find(c => c.id === event.carrier.id);
              if (!carrierExists) {
                existing.carriers.push({ 
                  id: event.carrier.id, 
                  nombre: event.carrier.legal_name 
                });
              }
            }
            // Actualizar fechas
            const currentEventDate = event.fecha_programada;
            if (currentEventDate < existing.first_event_date) {
              existing.first_event_date = currentEventDate;
            }
            if (currentEventDate > existing.last_event_date) {
              existing.last_event_date = currentEventDate;
            }
          } else {
            risksMap.set(key, {
              nodo_codigo: nodo.codigo,
              ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
              ciudad_id: nodo.ciudad_id,
              region_nombre: nodo.region?.nombre || null,
              region_id: nodo.region_id,
              clasificacion: nodo.ciudad_info?.clasificacion || 'urbano',
              pais: nodo.pais,
              panelista_id: null,
              panelista_nombre: null,
              risk_type: 'sin_panelista',
              affected_events_count: 1,
              first_event_date: event.fecha_programada,
              last_event_date: event.fecha_programada,
              productos: event.producto ? [{ 
                id: event.producto.id, 
                nombre: event.producto.nombre_producto 
              }] : [],
              carriers: event.carrier ? [{ 
                id: event.carrier.id, 
                nombre: event.carrier.legal_name 
              }] : [],
            });
          }
        }
      }

      // Verificar nodo destino
      if (nodosSinPanelista.includes(event.nodo_destino)) {
        const nodo = nodosMap.get(event.nodo_destino);
        if (nodo) {
          const key = nodo.codigo;
          const existing = risksMap.get(key);

          if (existing) {
            existing.affected_events_count++;
            if (event.producto) {
              const productoExists = existing.productos.find(p => p.id === event.producto.id);
              if (!productoExists) {
                existing.productos.push({ 
                  id: event.producto.id, 
                  nombre: event.producto.nombre_producto 
                });
              }
            }
            if (event.carrier) {
              const carrierExists = existing.carriers.find(c => c.id === event.carrier.id);
              if (!carrierExists) {
                existing.carriers.push({ 
                  id: event.carrier.id, 
                  nombre: event.carrier.legal_name 
                });
              }
            }
            const currentEventDate = event.fecha_programada;
            if (currentEventDate < existing.first_event_date) {
              existing.first_event_date = currentEventDate;
            }
            if (currentEventDate > existing.last_event_date) {
              existing.last_event_date = currentEventDate;
            }
          } else {
            risksMap.set(key, {
              nodo_codigo: nodo.codigo,
              ciudad: nodo.ciudad_info?.nombre || nodo.ciudad,
              ciudad_id: nodo.ciudad_id,
              region_nombre: nodo.region?.nombre || null,
              region_id: nodo.region_id,
              clasificacion: nodo.ciudad_info?.clasificacion || 'urbano',
              pais: nodo.pais,
              panelista_id: null,
              panelista_nombre: null,
              risk_type: 'sin_panelista',
              affected_events_count: 1,
              first_event_date: event.fecha_programada,
              last_event_date: event.fecha_programada,
              productos: event.producto ? [{ 
                id: event.producto.id, 
                nombre: event.producto.nombre_producto 
              }] : [],
              carriers: event.carrier ? [{ 
                id: event.carrier.id, 
                nombre: event.carrier.legal_name 
              }] : [],
            });
          }
        }
      }
    });

    const risksArray = Array.from(risksMap.values());
    console.log('Risks encontrados:', risksArray.length);
    
    setRisks(risksArray);
  } catch (error: any) {
    console.error('Error loading node risks:', error);
    toast({
      title: "Error",
      description: "Failed to load node risks: " + error.message,
      variant: "destructive",
    });
    setRisks([]);
  } finally {
    setLoading(false);
  }
};
