export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      carrier_productos: {
        Row: {
          carrier_id: number
          cliente_id: number
          created_at: string
          id: number
          producto_id: number
        }
        Insert: {
          carrier_id: number
          cliente_id: number
          created_at?: string
          id?: number
          producto_id: number
        }
        Update: {
          carrier_id?: number
          cliente_id?: number
          created_at?: string
          id?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "carrier_productos_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_productos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_productos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      carriers: {
        Row: {
          authorization_date: string | null
          carrier_code: string | null
          cliente_id: number
          commercial_name: string | null
          created_at: string | null
          declared_coverage: string | null
          email: string | null
          geographic_scope:
            | Database["public"]["Enums"]["geographic_scope"]
            | null
          guarantee_amount: number | null
          id: number
          legal_address: string | null
          legal_name: string
          legal_representative: string | null
          license_expiration_date: string | null
          license_number: string | null
          notes: string | null
          number_of_branches: number | null
          operator_type: Database["public"]["Enums"]["operator_type"]
          phone: string | null
          regulator_data_api_url: string | null
          regulatory_status: Database["public"]["Enums"]["regulatory_status"]
          report_format: Database["public"]["Enums"]["report_format"] | null
          status: string
          tax_id: string | null
          tracking_api_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          authorization_date?: string | null
          carrier_code?: string | null
          cliente_id: number
          commercial_name?: string | null
          created_at?: string | null
          declared_coverage?: string | null
          email?: string | null
          geographic_scope?:
            | Database["public"]["Enums"]["geographic_scope"]
            | null
          guarantee_amount?: number | null
          id?: number
          legal_address?: string | null
          legal_name: string
          legal_representative?: string | null
          license_expiration_date?: string | null
          license_number?: string | null
          notes?: string | null
          number_of_branches?: number | null
          operator_type: Database["public"]["Enums"]["operator_type"]
          phone?: string | null
          regulator_data_api_url?: string | null
          regulatory_status: Database["public"]["Enums"]["regulatory_status"]
          report_format?: Database["public"]["Enums"]["report_format"] | null
          status?: string
          tax_id?: string | null
          tracking_api_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          authorization_date?: string | null
          carrier_code?: string | null
          cliente_id?: number
          commercial_name?: string | null
          created_at?: string | null
          declared_coverage?: string | null
          email?: string | null
          geographic_scope?:
            | Database["public"]["Enums"]["geographic_scope"]
            | null
          guarantee_amount?: number | null
          id?: number
          legal_address?: string | null
          legal_name?: string
          legal_representative?: string | null
          license_expiration_date?: string | null
          license_number?: string | null
          notes?: string | null
          number_of_branches?: number | null
          operator_type?: Database["public"]["Enums"]["operator_type"]
          phone?: string | null
          regulator_data_api_url?: string | null
          regulatory_status?: Database["public"]["Enums"]["regulatory_status"]
          report_format?: Database["public"]["Enums"]["report_format"] | null
          status?: string
          tax_id?: string | null
          tracking_api_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carriers_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      city_allocation_requirements: {
        Row: {
          ciudad_id: number
          cliente_id: number
          created_at: string
          id: number
          percentage_from_a: number | null
          percentage_from_b: number | null
          percentage_from_c: number | null
          updated_at: string
        }
        Insert: {
          ciudad_id: number
          cliente_id: number
          created_at?: string
          id?: number
          percentage_from_a?: number | null
          percentage_from_b?: number | null
          percentage_from_c?: number | null
          updated_at?: string
        }
        Update: {
          ciudad_id?: number
          cliente_id?: number
          created_at?: string
          id?: number
          percentage_from_a?: number | null
          percentage_from_b?: number | null
          percentage_from_c?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_allocation_requirements_ciudad_id_fkey"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_allocation_requirements_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ciudades: {
        Row: {
          clasificacion: string
          cliente_id: number
          codigo: string
          codigo_postal_principal: string | null
          criterio_clasificacion: string | null
          descripcion: string | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          latitud: number | null
          longitud: number | null
          nombre: string
          pais: string
          region_id: number
          volumen_poblacional: number | null
          volumen_trafico_postal: number | null
        }
        Insert: {
          clasificacion: string
          cliente_id: number
          codigo: string
          codigo_postal_principal?: string | null
          criterio_clasificacion?: string | null
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre: string
          pais: string
          region_id: number
          volumen_poblacional?: number | null
          volumen_trafico_postal?: number | null
        }
        Update: {
          clasificacion?: string
          cliente_id?: number
          codigo?: string
          codigo_postal_principal?: string | null
          criterio_clasificacion?: string | null
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          pais?: string
          region_id?: number
          volumen_poblacional?: number | null
          volumen_trafico_postal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ciudades_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ciudades_region"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regiones"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_allocation_matrix: {
        Row: {
          cliente_id: number
          created_at: string
          destination_classification: string
          id: number
          percentage_from_a: number
          percentage_from_b: number
          percentage_from_c: number
          updated_at: string
        }
        Insert: {
          cliente_id: number
          created_at?: string
          destination_classification: string
          id?: number
          percentage_from_a?: number
          percentage_from_b?: number
          percentage_from_c?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: number
          created_at?: string
          destination_classification?: string
          id?: number
          percentage_from_a?: number
          percentage_from_b?: number
          percentage_from_c?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_allocation_matrix_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          codigo: string
          estado: string
          fecha_alta: string
          id: number
          max_events_per_panelist_week: number | null
          nombre: string
          pais: string
        }
        Insert: {
          codigo: string
          estado?: string
          fecha_alta?: string
          id?: number
          max_events_per_panelist_week?: number | null
          nombre: string
          pais: string
        }
        Update: {
          codigo?: string
          estado?: string
          fecha_alta?: string
          id?: number
          max_events_per_panelist_week?: number | null
          nombre?: string
          pais?: string
        }
        Relationships: []
      }
      configuracion_workflows: {
        Row: {
          cliente_id: number
          fecha_creacion: string
          fecha_modificacion: string
          hours_receiver_escalation: number
          hours_receiver_verification: number
          hours_sender_escalation: number
          hours_sender_first_reminder: number
          hours_sender_second_reminder: number
          id: number
          producto_id: number | null
          tipo_dias: string
        }
        Insert: {
          cliente_id: number
          fecha_creacion?: string
          fecha_modificacion?: string
          hours_receiver_escalation?: number
          hours_receiver_verification?: number
          hours_sender_escalation?: number
          hours_sender_first_reminder?: number
          hours_sender_second_reminder?: number
          id?: number
          producto_id?: number | null
          tipo_dias: string
        }
        Update: {
          cliente_id?: number
          fecha_creacion?: string
          fecha_modificacion?: string
          hours_receiver_escalation?: number
          hours_receiver_verification?: number
          hours_sender_escalation?: number
          hours_sender_first_reminder?: number
          hours_sender_second_reminder?: number
          id?: number
          producto_id?: number | null
          tipo_dias?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_workflows_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracion_workflows_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      envios: {
        Row: {
          carrier_id: number | null
          carrier_name: string | null
          cliente_id: number
          estado: Database["public"]["Enums"]["estado_envio"]
          fecha_creacion: string
          fecha_envio_real: string | null
          fecha_limite: string | null
          fecha_notificacion: string | null
          fecha_programada: string
          fecha_recepcion_real: string | null
          fecha_ultima_modificacion: string
          id: number
          motivo_creacion: string
          nodo_destino: string
          nodo_origen: string
          numero_etiqueta: string | null
          observaciones: string | null
          panelista_destino_id: number | null
          panelista_origen_id: number | null
          producto_id: number | null
          tiempo_transito_dias: number | null
          tipo_producto: string | null
        }
        Insert: {
          carrier_id?: number | null
          carrier_name?: string | null
          cliente_id: number
          estado?: Database["public"]["Enums"]["estado_envio"]
          fecha_creacion?: string
          fecha_envio_real?: string | null
          fecha_limite?: string | null
          fecha_notificacion?: string | null
          fecha_programada: string
          fecha_recepcion_real?: string | null
          fecha_ultima_modificacion?: string
          id?: number
          motivo_creacion: string
          nodo_destino: string
          nodo_origen: string
          numero_etiqueta?: string | null
          observaciones?: string | null
          panelista_destino_id?: number | null
          panelista_origen_id?: number | null
          producto_id?: number | null
          tiempo_transito_dias?: number | null
          tipo_producto?: string | null
        }
        Update: {
          carrier_id?: number | null
          carrier_name?: string | null
          cliente_id?: number
          estado?: Database["public"]["Enums"]["estado_envio"]
          fecha_creacion?: string
          fecha_envio_real?: string | null
          fecha_limite?: string | null
          fecha_notificacion?: string | null
          fecha_programada?: string
          fecha_recepcion_real?: string | null
          fecha_ultima_modificacion?: string
          id?: number
          motivo_creacion?: string
          nodo_destino?: string
          nodo_origen?: string
          numero_etiqueta?: string | null
          observaciones?: string | null
          panelista_destino_id?: number | null
          panelista_origen_id?: number | null
          producto_id?: number | null
          tiempo_transito_dias?: number | null
          tipo_producto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "envios_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_nodo_destino_fkey"
            columns: ["nodo_destino"]
            isOneToOne: false
            referencedRelation: "nodos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "envios_nodo_origen_fkey"
            columns: ["nodo_origen"]
            isOneToOne: false
            referencedRelation: "nodos"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "envios_panelista_destino_id_fkey"
            columns: ["panelista_destino_id"]
            isOneToOne: false
            referencedRelation: "panelistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_panelista_origen_id_fkey"
            columns: ["panelista_origen_id"]
            isOneToOne: false
            referencedRelation: "panelistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "envios_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_allocation_plan_details: {
        Row: {
          carrier_id: number
          cliente_id: number
          created_at: string
          fecha_programada: string
          id: number
          nodo_destino: string
          nodo_origen: string
          plan_id: number
          producto_id: number
        }
        Insert: {
          carrier_id: number
          cliente_id: number
          created_at?: string
          fecha_programada: string
          id?: number
          nodo_destino: string
          nodo_origen: string
          plan_id: number
          producto_id: number
        }
        Update: {
          carrier_id?: number
          cliente_id?: number
          created_at?: string
          fecha_programada?: string
          id?: number
          nodo_destino?: string
          nodo_origen?: string
          plan_id?: number
          producto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_allocation_plan_details_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plan_details_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plan_details_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "generated_allocation_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plan_details_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_allocation_plans: {
        Row: {
          calculated_events: number
          carrier_id: number
          cliente_id: number
          created_at: string
          created_by: number | null
          end_date: string
          generation_params: Json | null
          id: number
          max_events_per_week: number | null
          merge_strategy: string
          merged_at: string | null
          producto_id: number
          start_date: string
          status: string
          total_events: number
          unassigned_breakdown: Json | null
          unassigned_events: number | null
        }
        Insert: {
          calculated_events?: number
          carrier_id: number
          cliente_id: number
          created_at?: string
          created_by?: number | null
          end_date: string
          generation_params?: Json | null
          id?: number
          max_events_per_week?: number | null
          merge_strategy?: string
          merged_at?: string | null
          producto_id: number
          start_date: string
          status?: string
          total_events: number
          unassigned_breakdown?: Json | null
          unassigned_events?: number | null
        }
        Update: {
          calculated_events?: number
          carrier_id?: number
          cliente_id?: number
          created_at?: string
          created_by?: number | null
          end_date?: string
          generation_params?: Json | null
          id?: number
          max_events_per_week?: number | null
          merge_strategy?: string
          merged_at?: string | null
          producto_id?: number
          start_date?: string
          status?: string
          total_events?: number
          unassigned_breakdown?: Json | null
          unassigned_events?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_allocation_plans_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plans_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_allocation_plans_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_incidencias: {
        Row: {
          accion: string
          cliente_id: number | null
          comentario: string | null
          estado_anterior: string | null
          estado_nuevo: string | null
          fecha: string
          id: number
          incidencia_id: number
          usuario_id: number | null
        }
        Insert: {
          accion: string
          cliente_id?: number | null
          comentario?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha?: string
          id?: number
          incidencia_id: number
          usuario_id?: number | null
        }
        Update: {
          accion?: string
          cliente_id?: number | null
          comentario?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha?: string
          id?: number
          incidencia_id?: number
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historial_incidencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_incidencias_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_incidencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      idiomas_disponibles: {
        Row: {
          activo: boolean
          bandera_emoji: string | null
          codigo: string
          es_default: boolean
          fecha_creacion: string
          id: number
          nombre_ingles: string
          nombre_nativo: string
        }
        Insert: {
          activo?: boolean
          bandera_emoji?: string | null
          codigo: string
          es_default?: boolean
          fecha_creacion?: string
          id?: number
          nombre_ingles: string
          nombre_nativo: string
        }
        Update: {
          activo?: boolean
          bandera_emoji?: string | null
          codigo?: string
          es_default?: boolean
          fecha_creacion?: string
          id?: number
          nombre_ingles?: string
          nombre_nativo?: string
        }
        Relationships: []
      }
      incidencias: {
        Row: {
          cliente_id: number | null
          datos_adicionales: Json | null
          descripcion: string
          envio_id: number | null
          estado: Database["public"]["Enums"]["estado_incidencia"]
          fecha_creacion: string
          fecha_resolucion: string | null
          fecha_ultima_actualizacion: string
          gestor_asignado_id: number | null
          id: number
          origen: Database["public"]["Enums"]["origen_incidencia"]
          panelista_id: number
          prioridad: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo: Database["public"]["Enums"]["tipo_incidencia"]
        }
        Insert: {
          cliente_id?: number | null
          datos_adicionales?: Json | null
          descripcion: string
          envio_id?: number | null
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          fecha_creacion?: string
          fecha_resolucion?: string | null
          fecha_ultima_actualizacion?: string
          gestor_asignado_id?: number | null
          id?: number
          origen: Database["public"]["Enums"]["origen_incidencia"]
          panelista_id: number
          prioridad: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo: Database["public"]["Enums"]["tipo_incidencia"]
        }
        Update: {
          cliente_id?: number | null
          datos_adicionales?: Json | null
          descripcion?: string
          envio_id?: number | null
          estado?: Database["public"]["Enums"]["estado_incidencia"]
          fecha_creacion?: string
          fecha_resolucion?: string | null
          fecha_ultima_actualizacion?: string
          gestor_asignado_id?: number | null
          id?: number
          origen?: Database["public"]["Enums"]["origen_incidencia"]
          panelista_id?: number
          prioridad?: Database["public"]["Enums"]["prioridad_incidencia"]
          tipo?: Database["public"]["Enums"]["tipo_incidencia"]
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_gestor_asignado_id_fkey"
            columns: ["gestor_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_panelista_id_fkey"
            columns: ["panelista_id"]
            isOneToOne: false
            referencedRelation: "panelistas"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          id: string
          menu_item: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          id?: string
          menu_item: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          id?: string
          menu_item?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      nodos: {
        Row: {
          ciudad: string
          ciudad_id: number | null
          cliente_id: number
          codigo: string
          estado: string
          pais: string
          panelista_id: number | null
          region_id: number | null
        }
        Insert: {
          ciudad: string
          ciudad_id?: number | null
          cliente_id: number
          codigo: string
          estado?: string
          pais: string
          panelista_id?: number | null
          region_id?: number | null
        }
        Update: {
          ciudad?: string
          ciudad_id?: number | null
          cliente_id?: number
          codigo?: string
          estado?: string
          pais?: string
          panelista_id?: number | null
          region_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_nodos_ciudad"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_nodos_panelista"
            columns: ["panelista_id"]
            isOneToOne: false
            referencedRelation: "panelistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_nodos_region"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      panelistas: {
        Row: {
          ciudad_id: number | null
          cliente_id: number
          dias_comunicacion: Database["public"]["Enums"]["dias_comunicacion"]
          direccion_calle: string
          direccion_ciudad: string
          direccion_codigo_postal: string
          direccion_pais: string
          email: string | null
          estado: string
          fecha_alta: string
          fecha_ultima_modificacion: string
          gestor_asignado_id: number | null
          horario_fin: string
          horario_inicio: string
          id: number
          idioma: string
          nodo_asignado: string | null
          nombre_completo: string
          plataforma_preferida: string
          telefono: string
          zona_horaria: string
        }
        Insert: {
          ciudad_id?: number | null
          cliente_id: number
          dias_comunicacion?: Database["public"]["Enums"]["dias_comunicacion"]
          direccion_calle: string
          direccion_ciudad: string
          direccion_codigo_postal: string
          direccion_pais: string
          email?: string | null
          estado?: string
          fecha_alta?: string
          fecha_ultima_modificacion?: string
          gestor_asignado_id?: number | null
          horario_fin: string
          horario_inicio: string
          id?: number
          idioma: string
          nodo_asignado?: string | null
          nombre_completo: string
          plataforma_preferida: string
          telefono: string
          zona_horaria: string
        }
        Update: {
          ciudad_id?: number | null
          cliente_id?: number
          dias_comunicacion?: Database["public"]["Enums"]["dias_comunicacion"]
          direccion_calle?: string
          direccion_ciudad?: string
          direccion_codigo_postal?: string
          direccion_pais?: string
          email?: string | null
          estado?: string
          fecha_alta?: string
          fecha_ultima_modificacion?: string
          gestor_asignado_id?: number | null
          horario_fin?: string
          horario_inicio?: string
          id?: number
          idioma?: string
          nodo_asignado?: string | null
          nombre_completo?: string
          plataforma_preferida?: string
          telefono?: string
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_panelistas_ciudad"
            columns: ["ciudad_id"]
            isOneToOne: false
            referencedRelation: "ciudades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panelistas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panelistas_gestor_asignado_id_fkey"
            columns: ["gestor_asignado_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panelistas_nodo_asignado_fkey"
            columns: ["nodo_asignado"]
            isOneToOne: false
            referencedRelation: "nodos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      plantillas_mensajes: {
        Row: {
          codigo: string
          contenido: string
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          idioma: string
          tipo: string
          variables: Json | null
        }
        Insert: {
          codigo: string
          contenido: string
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          idioma: string
          tipo: string
          variables?: Json | null
        }
        Update: {
          codigo?: string
          contenido?: string
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          idioma?: string
          tipo?: string
          variables?: Json | null
        }
        Relationships: []
      }
      product_seasonality: {
        Row: {
          april_percentage: number
          august_percentage: number
          cliente_id: number
          created_at: string
          december_percentage: number
          february_percentage: number
          id: number
          january_percentage: number
          july_percentage: number
          june_percentage: number
          march_percentage: number
          may_percentage: number
          november_percentage: number
          october_percentage: number
          producto_id: number
          september_percentage: number
          updated_at: string
          year: number
        }
        Insert: {
          april_percentage?: number
          august_percentage?: number
          cliente_id: number
          created_at?: string
          december_percentage?: number
          february_percentage?: number
          id?: number
          january_percentage?: number
          july_percentage?: number
          june_percentage?: number
          march_percentage?: number
          may_percentage?: number
          november_percentage?: number
          october_percentage?: number
          producto_id: number
          september_percentage?: number
          updated_at?: string
          year?: number
        }
        Update: {
          april_percentage?: number
          august_percentage?: number
          cliente_id?: number
          created_at?: string
          december_percentage?: number
          february_percentage?: number
          id?: number
          january_percentage?: number
          july_percentage?: number
          june_percentage?: number
          march_percentage?: number
          may_percentage?: number
          november_percentage?: number
          october_percentage?: number
          producto_id?: number
          september_percentage?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      producto_materiales: {
        Row: {
          cantidad: number
          es_obligatorio: boolean
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          notas: string | null
          producto_id: number
          tipo_material_id: number
        }
        Insert: {
          cantidad?: number
          es_obligatorio?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          notas?: string | null
          producto_id: number
          tipo_material_id: number
        }
        Update: {
          cantidad?: number
          es_obligatorio?: boolean
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          notas?: string | null
          producto_id?: number
          tipo_material_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "producto_materiales_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_materiales_tipo_material_id_fkey"
            columns: ["tipo_material_id"]
            isOneToOne: false
            referencedRelation: "tipos_material"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_cliente: {
        Row: {
          cliente_id: number
          codigo_producto: string
          descripcion: string | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          nombre_producto: string
          standard_delivery_hours: number | null
        }
        Insert: {
          cliente_id: number
          codigo_producto: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre_producto: string
          standard_delivery_hours?: number | null
        }
        Update: {
          cliente_id?: number
          codigo_producto?: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre_producto?: string
          standard_delivery_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      regiones: {
        Row: {
          cliente_id: number
          codigo: string
          descripcion: string | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          nombre: string
          pais: string
        }
        Insert: {
          cliente_id: number
          codigo: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre: string
          pais: string
        }
        Update: {
          cliente_id?: number
          codigo?: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre?: string
          pais?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_regiones_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_material: {
        Row: {
          cliente_id: number
          codigo: string
          descripcion: string | null
          estado: string
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          nombre: string
          unidad_medida: string
        }
        Insert: {
          cliente_id: number
          codigo: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre: string
          unidad_medida?: string
        }
        Update: {
          cliente_id?: number
          codigo?: string
          descripcion?: string | null
          estado?: string
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          nombre?: string
          unidad_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipos_material_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      traducciones: {
        Row: {
          categoria: string | null
          clave: string
          descripcion: string | null
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          idioma: string
          texto: string
        }
        Insert: {
          categoria?: string | null
          clave: string
          descripcion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          idioma: string
          texto: string
        }
        Update: {
          categoria?: string | null
          clave?: string
          descripcion?: string | null
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          idioma?: string
          texto?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          avatar_url: string | null
          cliente_id: number | null
          email: string
          estado: string
          fecha_creacion: string
          fecha_ultimo_acceso: string | null
          id: number
          idioma_preferido: string
          nombre_completo: string
          password_hash: string
          telefono: string | null
          whatsapp_telegram_cuenta: string | null
        }
        Insert: {
          avatar_url?: string | null
          cliente_id?: number | null
          email: string
          estado?: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: string | null
          id?: number
          idioma_preferido?: string
          nombre_completo: string
          password_hash: string
          telefono?: string | null
          whatsapp_telegram_cuenta?: string | null
        }
        Update: {
          avatar_url?: string | null
          cliente_id?: number | null
          email?: string
          estado?: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: string | null
          id?: number
          idioma_preferido?: string
          nombre_completo?: string
          password_hash?: string
          telefono?: string | null
          whatsapp_telegram_cuenta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_idioma_preferido_fkey"
            columns: ["idioma_preferido"]
            isOneToOne: false
            referencedRelation: "idiomas_disponibles"
            referencedColumns: ["codigo"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_next_material_code: {
        Args: { p_cliente_id: number }
        Returns: string
      }
      generate_next_nodo_code: {
        Args: { p_ciudad_id: number; p_region_id: number }
        Returns: string
      }
      generate_next_product_code: {
        Args: { p_cliente_id: number }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: number }
      get_user_cliente_id: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: number
        }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "coordinator" | "manager"
      dias_comunicacion: "dias_laborables" | "fines_semana" | "ambos"
      estado_envio: "PENDING" | "NOTIFIED" | "SENT" | "RECEIVED" | "CANCELLED"
      estado_general: "activo" | "inactivo" | "suspendido"
      estado_incidencia: "abierta" | "en_proceso" | "resuelta" | "cerrada"
      geographic_scope: "local" | "regional" | "national" | "international"
      operator_type:
        | "designated_usp"
        | "licensed_postal"
        | "express_courier"
        | "ecommerce_parcel"
        | "exempt"
        | "others"
      origen_incidencia: "agente" | "gestor" | "sistema"
      prioridad_incidencia: "baja" | "media" | "alta" | "critica"
      regulatory_status: "authorized" | "suspended" | "sanctioned" | "revoked"
      report_format: "xml" | "json" | "csv"
      tipo_incidencia:
        | "cambio_direccion"
        | "no_disponible"
        | "muestra_dañada"
        | "extravio"
        | "problema_generico"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "coordinator", "manager"],
      dias_comunicacion: ["dias_laborables", "fines_semana", "ambos"],
      estado_envio: ["PENDING", "NOTIFIED", "SENT", "RECEIVED", "CANCELLED"],
      estado_general: ["activo", "inactivo", "suspendido"],
      estado_incidencia: ["abierta", "en_proceso", "resuelta", "cerrada"],
      geographic_scope: ["local", "regional", "national", "international"],
      operator_type: [
        "designated_usp",
        "licensed_postal",
        "express_courier",
        "ecommerce_parcel",
        "exempt",
        "others",
      ],
      origen_incidencia: ["agente", "gestor", "sistema"],
      prioridad_incidencia: ["baja", "media", "alta", "critica"],
      regulatory_status: ["authorized", "suspended", "sanctioned", "revoked"],
      report_format: ["xml", "json", "csv"],
      tipo_incidencia: [
        "cambio_direccion",
        "no_disponible",
        "muestra_dañada",
        "extravio",
        "problema_generico",
      ],
    },
  },
} as const
