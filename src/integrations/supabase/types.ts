// Auto-generated types from database schema
// Generated at: 2025-12-05T10:16:05.754Z
// DO NOT EDIT MANUALLY

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      idiomas_disponibles: {
        Row: {
          id: number
          codigo: string
          nombre_nativo: string
          nombre_ingles: string
          bandera_emoji: string
          es_default: boolean
          activo: boolean
          fecha_creacion: string
        }
        Insert: {
          id?: number
          codigo: string
          nombre_nativo: string
          nombre_ingles: string
          bandera_emoji: string
          es_default: boolean
          activo: boolean
          fecha_creacion?: string
        }
        Update: {
          id?: number
          codigo?: string
          nombre_nativo?: string
          nombre_ingles?: string
          bandera_emoji?: string
          es_default?: boolean
          activo?: boolean
          fecha_creacion?: string
        }
      }
      traducciones: {
        Row: {
          id: number
          clave: string
          idioma: string
          texto: string
          categoria: null | null
          descripcion: null | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id?: number
          clave: string
          idioma: string
          texto: string
          categoria: null | null
          descripcion: null | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id?: number
          clave?: string
          idioma?: string
          texto?: string
          categoria?: null | null
          descripcion?: null | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      clientes: {
        Row: {
          id: number
          nombre: string
          codigo: string
          pais: string
          estado: string
          fecha_alta: string
          max_events_per_panelist_week: null | null
        }
        Insert: {
          id?: number
          nombre: string
          codigo: string
          pais: string
          estado: string
          fecha_alta?: string
          max_events_per_panelist_week: null | null
        }
        Update: {
          id?: number
          nombre?: string
          codigo?: string
          pais?: string
          estado?: string
          fecha_alta?: string
          max_events_per_panelist_week?: null | null
        }
      }
      usuarios: {
        Row: {
          id: number
          nombre_completo: string
          email: string
          password_hash: string
          telefono: string
          whatsapp_telegram_cuenta: string
          estado: string
          fecha_creacion: string
          fecha_ultimo_acceso: null | null
          idioma_preferido: string
          cliente_id: null | null
          avatar_url: null | null
        }
        Insert: {
          id?: number
          nombre_completo: string
          email: string
          password_hash: string
          telefono: string
          whatsapp_telegram_cuenta: string
          estado: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: null | null
          idioma_preferido: string
          cliente_id: null | null
          avatar_url: null | null
        }
        Update: {
          id?: number
          nombre_completo?: string
          email?: string
          password_hash?: string
          telefono?: string
          whatsapp_telegram_cuenta?: string
          estado?: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: null | null
          idioma_preferido?: string
          cliente_id?: null | null
          avatar_url?: null | null
        }
      }
      user_roles: {
        Row: {
          id: number
          user_id: number
          role: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: number
          role: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: number
          role?: string
          created_at?: string
        }
      }
      regiones: {
        Row: {
          id: number
          cliente_id: number
          codigo: string
          nombre: string
          pais: string
          descripcion: string
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id?: number
          cliente_id: number
          codigo: string
          nombre: string
          pais: string
          descripcion: string
          estado: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id?: number
          cliente_id?: number
          codigo?: string
          nombre?: string
          pais?: string
          descripcion?: string
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      ciudades: {
        Row: {
          id: number
          cliente_id: number
          region_id: number
          codigo: string
          nombre: string
          codigo_postal_principal: null | null
          pais: string
          clasificacion: string
          latitud: null | null
          longitud: null | null
          volumen_poblacional: null | null
          volumen_trafico_postal: null | null
          criterio_clasificacion: null | null
          descripcion: null | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id?: number
          cliente_id: number
          region_id: number
          codigo: string
          nombre: string
          codigo_postal_principal: null | null
          pais: string
          clasificacion: string
          latitud: null | null
          longitud: null | null
          volumen_poblacional: null | null
          volumen_trafico_postal: null | null
          criterio_clasificacion: null | null
          descripcion: null | null
          estado: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id?: number
          cliente_id?: number
          region_id?: number
          codigo?: string
          nombre?: string
          codigo_postal_principal?: null | null
          pais?: string
          clasificacion?: string
          latitud?: null | null
          longitud?: null | null
          volumen_poblacional?: null | null
          volumen_trafico_postal?: null | null
          criterio_clasificacion?: null | null
          descripcion?: null | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      nodos: {
        Row: {
          codigo: string
          ciudad: string
          pais: string
          estado: string
          ciudad_id: number
          region_id: number
          panelista_id: null | null
          cliente_id: number
        }
        Insert: {
          codigo: string
          ciudad: string
          pais: string
          estado: string
          ciudad_id: number
          region_id: number
          panelista_id: null | null
          cliente_id: number
        }
        Update: {
          codigo?: string
          ciudad?: string
          pais?: string
          estado?: string
          ciudad_id?: number
          region_id?: number
          panelista_id?: null | null
          cliente_id?: number
        }
      }
      panelistas: {
        Row: {
          id: number
          nombre_completo: string
          direccion_calle: string
          direccion_ciudad: string
          direccion_codigo_postal: string
          direccion_pais: string
          telefono: string
          email: string
          idioma: string
          plataforma_preferida: string
          zona_horaria: string
          horario_inicio: string
          horario_fin: string
          nodo_asignado: string
          estado: string
          gestor_asignado_id: null | null
          fecha_alta: string
          fecha_ultima_modificacion: string
          cliente_id: number
          availability_status: string
          current_leave_start: null | null
          current_leave_end: null | null
          last_availability_change: string
          dias_comunicacion: null | null
        }
        Insert: {
          id?: number
          nombre_completo: string
          direccion_calle: string
          direccion_ciudad: string
          direccion_codigo_postal: string
          direccion_pais: string
          telefono: string
          email: string
          idioma: string
          plataforma_preferida: string
          zona_horaria: string
          horario_inicio: string
          horario_fin: string
          nodo_asignado: string
          estado: string
          gestor_asignado_id: null | null
          fecha_alta?: string
          fecha_ultima_modificacion?: string
          cliente_id: number
          availability_status: string
          current_leave_start: null | null
          current_leave_end: null | null
          last_availability_change: string
          dias_comunicacion: null | null
        }
        Update: {
          id?: number
          nombre_completo?: string
          direccion_calle?: string
          direccion_ciudad?: string
          direccion_codigo_postal?: string
          direccion_pais?: string
          telefono?: string
          email?: string
          idioma?: string
          plataforma_preferida?: string
          zona_horaria?: string
          horario_inicio?: string
          horario_fin?: string
          nodo_asignado?: string
          estado?: string
          gestor_asignado_id?: null | null
          fecha_alta?: string
          fecha_ultima_modificacion?: string
          cliente_id?: number
          availability_status?: string
          current_leave_start?: null | null
          current_leave_end?: null | null
          last_availability_change?: string
          dias_comunicacion?: null | null
        }
      }
      carriers: {
        Row: {
          id: number
          carrier_code: null | null
          legal_name: string
          commercial_name: string
          tax_id: null | null
          operator_type: string
          license_number: null | null
          regulatory_status: string
          authorization_date: null | null
          license_expiration_date: null | null
          guarantee_amount: null | null
          legal_representative: null | null
          legal_address: null | null
          phone: null | null
          email: null | null
          website: null | null
          geographic_scope: null | null
          declared_coverage: null | null
          number_of_branches: null | null
          tracking_api_url: null | null
          regulator_data_api_url: null | null
          report_format: null | null
          status: string
          notes: null | null
          created_at: string
          updated_at: string
          cliente_id: number
        }
        Insert: {
          id?: number
          carrier_code: null | null
          legal_name: string
          commercial_name: string
          tax_id: null | null
          operator_type: string
          license_number: null | null
          regulatory_status: string
          authorization_date: null | null
          license_expiration_date: null | null
          guarantee_amount: null | null
          legal_representative: null | null
          legal_address: null | null
          phone: null | null
          email: null | null
          website: null | null
          geographic_scope: null | null
          declared_coverage: null | null
          number_of_branches: null | null
          tracking_api_url: null | null
          regulator_data_api_url: null | null
          report_format: null | null
          status: string
          notes: null | null
          created_at?: string
          updated_at?: string
          cliente_id: number
        }
        Update: {
          id?: number
          carrier_code?: null | null
          legal_name?: string
          commercial_name?: string
          tax_id?: null | null
          operator_type?: string
          license_number?: null | null
          regulatory_status?: string
          authorization_date?: null | null
          license_expiration_date?: null | null
          guarantee_amount?: null | null
          legal_representative?: null | null
          legal_address?: null | null
          phone?: null | null
          email?: null | null
          website?: null | null
          geographic_scope?: null | null
          declared_coverage?: null | null
          number_of_branches?: null | null
          tracking_api_url?: null | null
          regulator_data_api_url?: null | null
          report_format?: null | null
          status?: string
          notes?: null | null
          created_at?: string
          updated_at?: string
          cliente_id?: number
        }
      }
      carrier_productos: {
        Row: {
          id: number
          producto_id: number
          carrier_id: number
          cliente_id: number
          created_at: string
        }
        Insert: {
          id?: number
          producto_id: number
          carrier_id: number
          cliente_id: number
          created_at?: string
        }
        Update: {
          id?: number
          producto_id?: number
          carrier_id?: number
          cliente_id?: number
          created_at?: string
        }
      }
      tipos_material: {
        Row: {
          id: number
          codigo: string
          nombre: string
          descripcion: string
          unidad_medida: string
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          cliente_id: number
        }
        Insert: {
          id?: number
          codigo: string
          nombre: string
          descripcion: string
          unidad_medida: string
          estado: string
          fecha_creacion?: string
          fecha_modificacion?: string
          cliente_id: number
        }
        Update: {
          id?: number
          codigo?: string
          nombre?: string
          descripcion?: string
          unidad_medida?: string
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          cliente_id?: number
        }
      }
      productos_cliente: {
        Row: {
          id: number
          cliente_id: number
          codigo_producto: string
          nombre_producto: string
          descripcion: null | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          standard_delivery_hours: null | null
        }
        Insert: {
          id?: number
          cliente_id: number
          codigo_producto: string
          nombre_producto: string
          descripcion: null | null
          estado: string
          fecha_creacion?: string
          fecha_modificacion?: string
          standard_delivery_hours: null | null
        }
        Update: {
          id?: number
          cliente_id?: number
          codigo_producto?: string
          nombre_producto?: string
          descripcion?: null | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          standard_delivery_hours?: null | null
        }
      }
      producto_materiales: {
        Row: {
          id: number
          producto_id: number
          tipo_material_id: number
          cantidad: number
          es_obligatorio: boolean
          notas: null | null
          fecha_creacion: string
          fecha_modificacion: string
        }
        Insert: {
          id?: number
          producto_id: number
          tipo_material_id: number
          cantidad: number
          es_obligatorio: boolean
          notas: null | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
        Update: {
          id?: number
          producto_id?: number
          tipo_material_id?: number
          cantidad?: number
          es_obligatorio?: boolean
          notas?: null | null
          fecha_creacion?: string
          fecha_modificacion?: string
        }
      }
      envios: {
        Row: {
          id: number
          cliente_id: number
          nodo_origen: string
          nodo_destino: string
          panelista_origen_id: null | null
          panelista_destino_id: null | null
          fecha_programada: string
          fecha_limite: null | null
          tipo_producto: string
          numero_etiqueta: null | null
          estado: string
          fecha_notificacion: null | null
          fecha_envio_real: null | null
          fecha_recepcion_real: null | null
          tiempo_transito_dias: null | null
          motivo_creacion: string
          observaciones: string
          fecha_creacion: string
          carrier_id: number
          carrier_name: string
          producto_id: number
          fecha_ultima_modificacion: string
        }
        Insert: {
          id?: number
          cliente_id: number
          nodo_origen: string
          nodo_destino: string
          panelista_origen_id: null | null
          panelista_destino_id: null | null
          fecha_programada?: string
          fecha_limite?: null | null
          tipo_producto: string
          numero_etiqueta: null | null
          estado: string
          fecha_notificacion?: null | null
          fecha_envio_real?: null | null
          fecha_recepcion_real?: null | null
          tiempo_transito_dias: null | null
          motivo_creacion: string
          observaciones: string
          fecha_creacion?: string
          carrier_id: number
          carrier_name: string
          producto_id: number
          fecha_ultima_modificacion?: string
        }
        Update: {
          id?: number
          cliente_id?: number
          nodo_origen?: string
          nodo_destino?: string
          panelista_origen_id?: null | null
          panelista_destino_id?: null | null
          fecha_programada?: string
          fecha_limite?: null | null
          tipo_producto?: string
          numero_etiqueta?: null | null
          estado?: string
          fecha_notificacion?: null | null
          fecha_envio_real?: null | null
          fecha_recepcion_real?: null | null
          tiempo_transito_dias?: null | null
          motivo_creacion?: string
          observaciones?: string
          fecha_creacion?: string
          carrier_id?: number
          carrier_name?: string
          producto_id?: number
          fecha_ultima_modificacion?: string
        }
      }
      configuracion_workflows: {
        Row: {
          id: number
          cliente_id: number
          tipo_dias: string
          fecha_creacion: string
          fecha_modificacion: string
          producto_id: null | null
          hours_sender_first_reminder: number
          hours_sender_second_reminder: number
          hours_sender_escalation: number
          hours_receiver_verification: number
          hours_receiver_escalation: number
        }
        Insert: {
          id?: number
          cliente_id: number
          tipo_dias: string
          fecha_creacion?: string
          fecha_modificacion?: string
          producto_id: null | null
          hours_sender_first_reminder: number
          hours_sender_second_reminder: number
          hours_sender_escalation: number
          hours_receiver_verification: number
          hours_receiver_escalation: number
        }
        Update: {
          id?: number
          cliente_id?: number
          tipo_dias?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          producto_id?: null | null
          hours_sender_first_reminder?: number
          hours_sender_second_reminder?: number
          hours_sender_escalation?: number
          hours_receiver_verification?: number
          hours_receiver_escalation?: number
        }
      }
      ciudad_transit_times: {
        Row: {
          id: number
          cliente_id: number
          ciudad_origen_id: number
          ciudad_destino_id: number
          dias_transito: number
          carrier_id: number
          producto_id: number
          target_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          cliente_id: number
          ciudad_origen_id: number
          ciudad_destino_id: number
          dias_transito: number
          carrier_id: number
          producto_id: number
          target_percentage: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          cliente_id?: number
          ciudad_origen_id?: number
          ciudad_destino_id?: number
          dias_transito?: number
          carrier_id?: number
          producto_id?: number
          target_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      generated_allocation_plans: {
        Row: {
          id: number
          cliente_id: number
          plan_name: string
          generation_date: string
          created_by: number
          status: string
          notes: null | null
          calculated_events: number
          carrier_id: number
          end_date: string
          total_events: number
          max_events_per_week: number
          unassigned_events: number
          unassigned_breakdown: any
          merge_strategy: string
          generation_params: any
          merged_at: string
          producto_id: number
          start_date: string
        }
        Insert: {
          id?: number
          cliente_id: number
          plan_name: string
          generation_date: string
          created_by: number
          status: string
          notes: null | null
          calculated_events: number
          carrier_id: number
          end_date: string
          total_events: number
          max_events_per_week: number
          unassigned_events: number
          unassigned_breakdown: any
          merge_strategy: string
          generation_params: any
          merged_at: string
          producto_id: number
          start_date: string
        }
        Update: {
          id?: number
          cliente_id?: number
          plan_name?: string
          generation_date?: string
          created_by?: number
          status?: string
          notes?: null | null
          calculated_events?: number
          carrier_id?: number
          end_date?: string
          total_events?: number
          max_events_per_week?: number
          unassigned_events?: number
          unassigned_breakdown?: any
          merge_strategy?: string
          generation_params?: any
          merged_at?: string
          producto_id?: number
          start_date?: string
        }
      }
      generated_allocation_plan_details: {
        Row: {
          id: number
          plan_id: number
          nodo_origen: string
          nodo_destino: string
          fecha_programada: string
          producto_id: number
          carrier_id: number
          cliente_id: number
          created_at: string
          status: string
          fecha_envio_real: null | null
          fecha_recepcion_real: null | null
          numero_etiqueta: null | null
        }
        Insert: {
          id?: number
          plan_id: number
          nodo_origen: string
          nodo_destino: string
          fecha_programada?: string
          producto_id: number
          carrier_id: number
          cliente_id: number
          created_at?: string
          status: string
          fecha_envio_real?: null | null
          fecha_recepcion_real?: null | null
          numero_etiqueta: null | null
        }
        Update: {
          id?: number
          plan_id?: number
          nodo_origen?: string
          nodo_destino?: string
          fecha_programada?: string
          producto_id?: number
          carrier_id?: number
          cliente_id?: number
          created_at?: string
          status?: string
          fecha_envio_real?: null | null
          fecha_recepcion_real?: null | null
          numero_etiqueta?: null | null
        }
      }
      scheduled_leaves: {
        Row: {
          id: number
          panelista_id: number
          cliente_id: number
          leave_start_date: string
          leave_end_date: string
          reason: string
          notes: null | null
          status: string
          created_by: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          panelista_id: number
          cliente_id: number
          leave_start_date: string
          leave_end_date: string
          reason: string
          notes: null | null
          status: string
          created_by: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          panelista_id?: number
          cliente_id?: number
          leave_start_date?: string
          leave_end_date?: string
          reason?: string
          notes?: null | null
          status?: string
          created_by?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
