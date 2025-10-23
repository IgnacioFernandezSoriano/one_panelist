import { supabase } from "@/integrations/supabase/client";

/**
 * Genera un código único de 4 dígitos para una tabla específica
 * @param tableName Nombre de la tabla
 * @param codeColumn Nombre de la columna del código (por defecto 'codigo')
 * @returns Código de 4 dígitos (ej: "0001", "0002", etc.)
 */
export async function generateUniqueCode(
  tableName: string,
  codeColumn: string = "codigo"
): Promise<string> {
  // Obtener el último código usado
  const { data, error } = await supabase
    .from(tableName as any)
    .select(codeColumn)
    .order(codeColumn, { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching last code:", error);
    // Si hay error, comenzar desde 0001
    return "0001";
  }

  if (!data || data.length === 0) {
    // Si no hay registros, comenzar desde 0001
    return "0001";
  }

  // Obtener el último código y generar el siguiente
  const lastCode = data[0][codeColumn];
  const lastNumber = parseInt(lastCode) || 0;
  const nextNumber = lastNumber + 1;

  // Formatear a 4 dígitos con ceros a la izquierda
  return nextNumber.toString().padStart(4, "0");
}
