import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

interface ValidationError {
  codigo: string;
  severidad: 'critical' | 'warning' | 'info';
  campo: string;
  descripcion: string;
  detalle: string;
}

async function validateEvent(envio: any, supabase: any): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // 1. VALIDACIONES CRÍTICAS - Datos Obligatorios
  if (!envio.carrier_id) {
    errors.push({
      codigo: 'CARRIER_FALTANTE',
      severidad: 'critical',
      campo: 'carrier_id',
      descripcion: 'Carrier no especificado',
      detalle: 'El evento debe tener un carrier asignado para poder ser procesado en el sistema de calidad'
    });
  }

  if (!envio.producto_id) {
    errors.push({
      codigo: 'PRODUCTO_FALTANTE',
      severidad: 'critical',
      campo: 'producto_id',
      descripcion: 'Producto no especificado',
      detalle: 'El evento debe tener un producto asociado para las métricas de calidad'
    });
  }

  if (!envio.panelista_origen_id) {
    errors.push({
      codigo: 'PANELISTA_ORIGEN_FALTANTE',
      severidad: 'critical',
      campo: 'panelista_origen_id',
      descripcion: 'Panelista de origen no asignado',
      detalle: 'Es necesario identificar el panelista que envió el paquete'
    });
  }

  if (!envio.panelista_destino_id) {
    errors.push({
      codigo: 'PANELISTA_DESTINO_FALTANTE',
      severidad: 'critical',
      campo: 'panelista_destino_id',
      descripcion: 'Panelista de destino no asignado',
      detalle: 'Es necesario identificar el panelista que recibió el paquete'
    });
  }

  if (!envio.numero_etiqueta) {
    errors.push({
      codigo: 'ETIQUETA_FALTANTE',
      severidad: 'critical',
      campo: 'numero_etiqueta',
      descripcion: 'Número de etiqueta no registrado',
      detalle: 'El número de seguimiento es esencial para verificar la trazabilidad del evento'
    });
  }

  if (!envio.fecha_programada) {
    errors.push({
      codigo: 'FECHA_PROGRAMADA_FALTANTE',
      severidad: 'critical',
      campo: 'fecha_programada',
      descripcion: 'Fecha programada no especificada',
      detalle: 'La fecha programada es necesaria para calcular desviaciones'
    });
  }

  if (!envio.fecha_envio_real) {
    errors.push({
      codigo: 'FECHA_ENVIO_FALTANTE',
      severidad: 'critical',
      campo: 'fecha_envio_real',
      descripcion: 'Fecha de envío no registrada',
      detalle: 'Es necesario registrar cuándo se envió realmente el paquete'
    });
  }

  if (!envio.fecha_recepcion_real) {
    errors.push({
      codigo: 'FECHA_RECEPCION_FALTANTE',
      severidad: 'critical',
      campo: 'fecha_recepcion_real',
      descripcion: 'Fecha de recepción no registrada',
      detalle: 'Es necesario registrar cuándo se recibió el paquete para calcular tiempo de tránsito'
    });
  }

  // 2. VALIDACIONES CRÍTICAS - Consistencia Temporal
  if (envio.fecha_envio_real && envio.fecha_programada) {
    const fechaEnvio = new Date(envio.fecha_envio_real);
    const fechaProgramada = new Date(envio.fecha_programada);
    
    if (fechaEnvio < fechaProgramada) {
      errors.push({
        codigo: 'FECHA_ENVIO_ANTES_PROGRAMADA',
        severidad: 'warning',
        campo: 'fecha_envio_real',
        descripcion: 'Fecha de envío anterior a la programada',
        detalle: `El envío se realizó el ${fechaEnvio.toLocaleDateString()} pero estaba programado para el ${fechaProgramada.toLocaleDateString()}. Esto puede indicar un error de captura de datos`
      });
    }
  }

  if (envio.fecha_recepcion_real && envio.fecha_envio_real) {
    const fechaRecepcion = new Date(envio.fecha_recepcion_real);
    const fechaEnvio = new Date(envio.fecha_envio_real);
    
    if (fechaRecepcion <= fechaEnvio) {
      errors.push({
        codigo: 'FECHA_RECEPCION_INVALIDA',
        severidad: 'critical',
        campo: 'fecha_recepcion_real',
        descripcion: 'Fecha de recepción inválida',
        detalle: `La fecha de recepción (${fechaRecepcion.toLocaleDateString()}) debe ser posterior a la fecha de envío (${fechaEnvio.toLocaleDateString()})`
      });
    }

    const diffDays = Math.floor((fechaRecepcion.getTime() - fechaEnvio.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      errors.push({
        codigo: 'TIEMPO_TRANSITO_EXCESIVO',
        severidad: 'warning',
        campo: 'fecha_recepcion_real',
        descripcion: 'Tiempo de tránsito excesivo',
        detalle: `El tiempo de tránsito fue de ${diffDays} días, lo cual es inusual y puede indicar un error en las fechas o un problema operacional`
      });
    }
  }

  // 3. VALIDACIONES - Integridad Referencial
  if (envio.carrier_id) {
    const { data: carrier } = await supabase
      .from('carriers')
      .select('id, status')
      .eq('id', envio.carrier_id)
      .single();

    if (!carrier) {
      errors.push({
        codigo: 'CARRIER_NO_EXISTE',
        severidad: 'critical',
        campo: 'carrier_id',
        descripcion: 'Carrier no encontrado',
        detalle: `El carrier con ID ${envio.carrier_id} no existe en el sistema`
      });
    } else if (carrier.status !== 'active') {
      errors.push({
        codigo: 'CARRIER_INACTIVO',
        severidad: 'warning',
        campo: 'carrier_id',
        descripcion: 'Carrier inactivo',
        detalle: `El carrier está marcado como ${carrier.status}, lo cual puede afectar las métricas`
      });
    }
  }

  if (envio.producto_id) {
    const { data: producto } = await supabase
      .from('productos_cliente')
      .select('id, estado')
      .eq('id', envio.producto_id)
      .single();

    if (!producto) {
      errors.push({
        codigo: 'PRODUCTO_NO_EXISTE',
        severidad: 'critical',
        campo: 'producto_id',
        descripcion: 'Producto no encontrado',
        detalle: `El producto con ID ${envio.producto_id} no existe en el sistema`
      });
    } else if (producto.estado !== 'activo') {
      errors.push({
        codigo: 'PRODUCTO_INACTIVO',
        severidad: 'info',
        campo: 'producto_id',
        descripcion: 'Producto inactivo',
        detalle: `El producto está marcado como ${producto.estado}`
      });
    }
  }

  // 4. VALIDACIONES - Panelistas
  if (envio.panelista_origen_id) {
    const { data: panelista } = await supabase
      .from('panelistas')
      .select('id, estado')
      .eq('id', envio.panelista_origen_id)
      .single();

    if (!panelista) {
      errors.push({
        codigo: 'PANELISTA_ORIGEN_NO_EXISTE',
        severidad: 'critical',
        campo: 'panelista_origen_id',
        descripcion: 'Panelista de origen no encontrado',
        detalle: `El panelista con ID ${envio.panelista_origen_id} no existe`
      });
    } else if (panelista.estado !== 'activo') {
      errors.push({
        codigo: 'PANELISTA_ORIGEN_INACTIVO',
        severidad: 'warning',
        campo: 'panelista_origen_id',
        descripcion: 'Panelista de origen inactivo',
        detalle: `El panelista de origen está marcado como ${panelista.estado}`
      });
    }
  }

  if (envio.panelista_destino_id) {
    const { data: panelista } = await supabase
      .from('panelistas')
      .select('id, estado')
      .eq('id', envio.panelista_destino_id)
      .single();

    if (!panelista) {
      errors.push({
        codigo: 'PANELISTA_DESTINO_NO_EXISTE',
        severidad: 'critical',
        campo: 'panelista_destino_id',
        descripcion: 'Panelista de destino no encontrado',
        detalle: `El panelista con ID ${envio.panelista_destino_id} no existe`
      });
    } else if (panelista.estado !== 'activo') {
      errors.push({
        codigo: 'PANELISTA_DESTINO_INACTIVO',
        severidad: 'warning',
        campo: 'panelista_destino_id',
        descripcion: 'Panelista de destino inactivo',
        detalle: `El panelista de destino está marcado como ${panelista.estado}`
      });
    }
  }

  // 5. VALIDACIONES - Consistencia Geográfica
  if (envio.nodo_origen === envio.nodo_destino) {
    errors.push({
      codigo: 'RUTA_INVALIDA_MISMO_NODO',
      severidad: 'critical',
      campo: 'nodo_destino',
      descripcion: 'Ruta inválida',
      detalle: `El nodo de origen y destino son el mismo (${envio.nodo_origen}). Un evento debe tener origen y destino diferentes`
    });
  }

  const { data: nodoOrigen } = await supabase
    .from('nodos')
    .select('codigo, estado, ciudad_id')
    .eq('codigo', envio.nodo_origen)
    .eq('cliente_id', envio.cliente_id)
    .single();

  if (!nodoOrigen) {
    errors.push({
      codigo: 'NODO_ORIGEN_NO_EXISTE',
      severidad: 'critical',
      campo: 'nodo_origen',
      descripcion: 'Nodo de origen no encontrado',
      detalle: `El nodo ${envio.nodo_origen} no existe en el sistema`
    });
  } else if (nodoOrigen.estado !== 'activo') {
    errors.push({
      codigo: 'NODO_ORIGEN_INACTIVO',
      severidad: 'warning',
      campo: 'nodo_origen',
      descripcion: 'Nodo de origen inactivo',
      detalle: `El nodo de origen está marcado como ${nodoOrigen.estado}`
    });
  }

  const { data: nodoDestino } = await supabase
    .from('nodos')
    .select('codigo, estado, ciudad_id')
    .eq('codigo', envio.nodo_destino)
    .eq('cliente_id', envio.cliente_id)
    .single();

  if (!nodoDestino) {
    errors.push({
      codigo: 'NODO_DESTINO_NO_EXISTE',
      severidad: 'critical',
      campo: 'nodo_destino',
      descripcion: 'Nodo de destino no encontrado',
      detalle: `El nodo ${envio.nodo_destino} no existe en el sistema`
    });
  } else if (nodoDestino.estado !== 'activo') {
    errors.push({
      codigo: 'NODO_DESTINO_INACTIVO',
      severidad: 'warning',
      campo: 'nodo_destino',
      descripcion: 'Nodo de destino inactivo',
      detalle: `El nodo de destino está marcado como ${nodoDestino.estado}`
    });
  }

  // 6. VALIDACIONES - Tiempo de Tránsito
  if (nodoOrigen && nodoDestino && nodoOrigen.ciudad_id && nodoDestino.ciudad_id) {
    const { data: transitTime } = await supabase
      .from('ciudad_transit_times')
      .select('dias_transito')
      .eq('ciudad_origen_id', nodoOrigen.ciudad_id)
      .eq('ciudad_destino_id', nodoDestino.ciudad_id)
      .single();

    if (transitTime && envio.tiempo_transito_dias) {
      const desvio = Math.abs(envio.tiempo_transito_dias - transitTime.dias_transito);
      const porcentajeDesvio = (desvio / transitTime.dias_transito) * 100;

      if (porcentajeDesvio > 50) {
        errors.push({
          codigo: 'TIEMPO_TRANSITO_DESVIADO',
          severidad: 'warning',
          campo: 'tiempo_transito_dias',
          descripcion: 'Desviación significativa en tiempo de tránsito',
          detalle: `El tiempo de tránsito real (${envio.tiempo_transito_dias} días) se desvía ${porcentajeDesvio.toFixed(0)}% del tiempo configurado (${transitTime.dias_transito} días)`
        });
      }
    }
  }

  // 7. VALIDACIONES - Historial de Estado
  const { data: historial } = await supabase
    .from('envios_estado_historial')
    .select('estado_nuevo')
    .eq('envio_id', envio.id)
    .order('fecha_cambio', { ascending: true });

  if (historial && historial.length > 0) {
    const estados = historial.map((h: any) => h.estado_nuevo);
    const secuenciaEsperada = ['PENDING', 'SENT', 'IN_TRANSIT', 'RECEIVED'];
    
    let lastValidIndex = -1;
    for (const estado of estados) {
      const index = secuenciaEsperada.indexOf(estado);
      if (index < lastValidIndex) {
        errors.push({
          codigo: 'FLUJO_ESTADOS_INVALIDO',
          severidad: 'warning',
          campo: 'estado',
          descripcion: 'Flujo de estados inválido',
          detalle: `El evento pasó de ${secuenciaEsperada[lastValidIndex]} a ${estado}, lo cual no sigue la secuencia esperada`
        });
        break;
      }
      lastValidIndex = Math.max(lastValidIndex, index);
    }
  }

  // 8. VALIDACIONES - Incidencias Abiertas
  const { count } = await supabase
    .from('incidencias')
    .select('*', { count: 'exact', head: true })
    .eq('envio_id', envio.id)
    .in('estado', ['abierta', 'en_progreso']);

  if (count && count > 0) {
    errors.push({
      codigo: 'INCIDENCIAS_ABIERTAS',
      severidad: 'warning',
      campo: 'incidencias',
      descripcion: 'Evento con incidencias abiertas',
      detalle: `El evento tiene ${count} incidencia(s) sin resolver. Se recomienda cerrarlas antes de validar el evento`
    });
  }

  // 9. VALIDACIONES - Número de Etiqueta Único
  if (envio.numero_etiqueta) {
    const { count: duplicateCount } = await supabase
      .from('envios')
      .select('id', { count: 'exact', head: true })
      .eq('numero_etiqueta', envio.numero_etiqueta)
      .eq('cliente_id', envio.cliente_id)
      .neq('id', envio.id);

    if (duplicateCount && duplicateCount > 0) {
      errors.push({
        codigo: 'ETIQUETA_DUPLICADA',
        severidad: 'warning',
        campo: 'numero_etiqueta',
        descripcion: 'Número de etiqueta duplicado',
        detalle: `El número de etiqueta ${envio.numero_etiqueta} está siendo usado por ${duplicateCount} evento(s) adicional(es)`
      });
    }
  }

  // 10. VALIDACIONES - Cálculo de tiempo de tránsito
  if (envio.fecha_envio_real && envio.fecha_recepcion_real && envio.tiempo_transito_dias !== null) {
    const fechaEnvio = new Date(envio.fecha_envio_real);
    const fechaRecepcion = new Date(envio.fecha_recepcion_real);
    const diasCalculados = Math.floor((fechaRecepcion.getTime() - fechaEnvio.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasCalculados !== envio.tiempo_transito_dias) {
      errors.push({
        codigo: 'TIEMPO_TRANSITO_INCORRECTO',
        severidad: 'warning',
        campo: 'tiempo_transito_dias',
        descripcion: 'Tiempo de tránsito calculado incorrecto',
        detalle: `El campo tiempo_transito_dias (${envio.tiempo_transito_dias}) no coincide con el cálculo basado en las fechas (${diasCalculados} días)`
      });
    }
  }

  return errors;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: eventos, error: fetchError } = await supabase
      .from('envios')
      .select('*')
      .eq('estado', 'RECEIVED')
      .eq('validation_status', 'not_validated');

    if (fetchError) throw fetchError;

    const resultados = [];

    for (const envio of eventos || []) {
      const validationErrors = await validateEvent(envio, supabase);
      const hasCriticalErrors = validationErrors.some(e => e.severidad === 'critical');

      if (hasCriticalErrors || validationErrors.length > 0) {
        await supabase
          .from('envios_validacion_pendiente')
          .upsert({
            envio_id: envio.id,
            cliente_id: envio.cliente_id,
            validaciones_fallidas: validationErrors,
            estado: 'pending_review'
          });

        await supabase
          .from('envios')
          .update({ validation_status: 'pending_review' })
          .eq('id', envio.id);

        resultados.push({
          envio_id: envio.id,
          status: 'pending_review',
          errors: validationErrors.length
        });
      } else {
        const { error: insertError } = await supabase
          .from('eventos_reales')
          .insert({
            envio_id: envio.id,
            cliente_id: envio.cliente_id,
            carrier_id: envio.carrier_id,
            producto_id: envio.producto_id,
            nodo_origen: envio.nodo_origen,
            nodo_destino: envio.nodo_destino,
            panelista_origen_id: envio.panelista_origen_id,
            panelista_destino_id: envio.panelista_destino_id,
            fecha_programada: envio.fecha_programada,
            fecha_envio_real: envio.fecha_envio_real,
            fecha_recepcion_real: envio.fecha_recepcion_real,
            tiempo_transito_dias: envio.tiempo_transito_dias,
            numero_etiqueta: envio.numero_etiqueta,
            tipo_producto: envio.tipo_producto,
            carrier_name: envio.carrier_name
          });

        if (insertError) throw insertError;

        await supabase
          .from('envios')
          .update({ validation_status: 'validated' })
          .eq('id', envio.id);

        resultados.push({
          envio_id: envio.id,
          status: 'validated',
          errors: 0
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: resultados.length,
        resultados 
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
