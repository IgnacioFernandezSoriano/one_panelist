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
      carriers: {
        Row: {
          authorization_date: string | null
          carrier_code: string
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
          carrier_code: string
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
          carrier_code?: string
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
        Relationships: []
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
      clientes: {
        Row: {
          codigo: string
          estado: string
          fecha_alta: string
          id: number
          nombre: string
          pais: string
        }
        Insert: {
          codigo: string
          estado?: string
          fecha_alta?: string
          id?: number
          nombre: string
          pais: string
        }
        Update: {
          codigo?: string
          estado?: string
          fecha_alta?: string
          id?: number
          nombre?: string
          pais?: string
        }
        Relationships: []
      }
      configuracion_workflows: {
        Row: {
          cliente_id: number
          dias_declarar_extravio: number
          dias_escalamiento: number
          dias_recordatorio: number
          dias_segunda_verificacion: number | null
          dias_verificacion_recepcion: number
          fecha_creacion: string
          fecha_modificacion: string
          id: number
          servicio_postal: string | null
          tipo_dias: string
        }
        Insert: {
          cliente_id: number
          dias_declarar_extravio: number
          dias_escalamiento: number
          dias_recordatorio: number
          dias_segunda_verificacion?: number | null
          dias_verificacion_recepcion: number
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          servicio_postal?: string | null
          tipo_dias: string
        }
        Update: {
          cliente_id?: number
          dias_declarar_extravio?: number
          dias_escalamiento?: number
          dias_recordatorio?: number
          dias_segunda_verificacion?: number | null
          dias_verificacion_recepcion?: number
          fecha_creacion?: string
          fecha_modificacion?: string
          id?: number
          servicio_postal?: string | null
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
          id: number
          motivo_creacion: string
          nodo_destino: string
          nodo_origen: string
          numero_etiqueta: string | null
          observaciones: string | null
          panelista_destino_id: number | null
          panelista_origen_id: number | null
          tiempo_transito_dias: number | null
          tipo_producto: string
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
          id?: number
          motivo_creacion: string
          nodo_destino: string
          nodo_origen: string
          numero_etiqueta?: string | null
          observaciones?: string | null
          panelista_destino_id?: number | null
          panelista_origen_id?: number | null
          tiempo_transito_dias?: number | null
          tipo_producto: string
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
          id?: number
          motivo_creacion?: string
          nodo_destino?: string
          nodo_origen?: string
          numero_etiqueta?: string | null
          observaciones?: string | null
          panelista_destino_id?: number | null
          panelista_origen_id?: number | null
          tiempo_transito_dias?: number | null
          tipo_producto?: string
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
        ]
      }
      historial_incidencias: {
        Row: {
          accion: string
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
      incidencias: {
        Row: {
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
      nodos: {
        Row: {
          ciudad: string
          ciudad_id: number | null
          codigo: string
          estado: string
          pais: string
          panelista_id: number | null
          region_id: number | null
        }
        Insert: {
          ciudad: string
          ciudad_id?: number | null
          codigo: string
          estado?: string
          pais: string
          panelista_id?: number | null
          region_id?: number | null
        }
        Update: {
          ciudad?: string
          ciudad_id?: number | null
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
        ]
      }
      panelistas: {
        Row: {
          ciudad_id: number | null
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
      usuarios: {
        Row: {
          email: string
          estado: string
          fecha_creacion: string
          fecha_ultimo_acceso: string | null
          id: number
          nombre_completo: string
          password_hash: string
          rol: Database["public"]["Enums"]["app_role"]
          telefono: string | null
          whatsapp_telegram_cuenta: string | null
        }
        Insert: {
          email: string
          estado?: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: string | null
          id?: number
          nombre_completo: string
          password_hash: string
          rol: Database["public"]["Enums"]["app_role"]
          telefono?: string | null
          whatsapp_telegram_cuenta?: string | null
        }
        Update: {
          email?: string
          estado?: string
          fecha_creacion?: string
          fecha_ultimo_acceso?: string | null
          id?: number
          nombre_completo?: string
          password_hash?: string
          rol?: Database["public"]["Enums"]["app_role"]
          telefono?: string | null
          whatsapp_telegram_cuenta?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "gestor" | "coordinador" | "administrador"
      dias_comunicacion: "dias_laborables" | "fines_semana" | "ambos"
      estado_envio:
        | "PENDIENTE"
        | "NOTIFICADO"
        | "ENVIADO"
        | "RECIBIDO"
        | "CANCELADO"
      estado_general: "activo" | "inactivo" | "suspendido"
      estado_incidencia: "abierta" | "en_proceso" | "resuelta" | "cerrada"
      geographic_scope: "local" | "regional" | "national" | "international"
      operator_type:
        | "universal_postal"
        | "private_postal"
        | "courier"
        | "logistics"
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
      app_role: ["gestor", "coordinador", "administrador"],
      dias_comunicacion: ["dias_laborables", "fines_semana", "ambos"],
      estado_envio: [
        "PENDIENTE",
        "NOTIFICADO",
        "ENVIADO",
        "RECIBIDO",
        "CANCELADO",
      ],
      estado_general: ["activo", "inactivo", "suspendido"],
      estado_incidencia: ["abierta", "en_proceso", "resuelta", "cerrada"],
      geographic_scope: ["local", "regional", "national", "international"],
      operator_type: [
        "universal_postal",
        "private_postal",
        "courier",
        "logistics",
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
