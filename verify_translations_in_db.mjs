import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://rpasddacpejcjgyiyrsx.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MTU0MzIsImV4cCI6MjA0NTA5MTQzMn0.YHfkpWHPRVBhPMIx0dKpZCCXUyMQ-vDlOGpuFJRzHJo';

const supabase = createClient(supabaseUrl, anonKey);

console.log('=== VERIFICANDO TRADUCCIONES EN LA BASE DE DATOS ===\n');

// Leer claves del archivo
const keysContent = readFileSync('/tmp/translation_keys_used.txt', 'utf-8');
const usedKeys = keysContent.split('\n').filter(k => k.trim() && k.length > 2 && k.includes('.'));

console.log(`Total de claves válidas a verificar: ${usedKeys.length}\n`);

// Obtener todas las traducciones de la BD
const { data: allTranslations, error } = await supabase
  .from('traducciones')
  .select('clave, idioma')
  .eq('idioma', 'es');

if (error) {
  console.error('Error al obtener traducciones:', error.message);
  process.exit(1);
}

const dbKeys = new Set(allTranslations.map(t => t.clave));

console.log(`Total de claves en BD (español): ${dbKeys.size}\n`);

// Verificar claves faltantes
const missingKeys = usedKeys.filter(key => !dbKeys.has(key));

console.log(`\n=== CLAVES FALTANTES EN LA BASE DE DATOS ===`);
console.log(`Total: ${missingKeys.length}\n`);

if (missingKeys.length > 0) {
  console.log('Primeras 30 claves faltantes:');
  missingKeys.slice(0, 30).forEach(key => console.log(`  ❌ ${key}`));
}

// Guardar todas las claves faltantes
import { writeFileSync } from 'fs';
writeFileSync('/tmp/missing_translation_keys.txt', missingKeys.join('\n'));
console.log(`\n✅ Lista completa guardada en: /tmp/missing_translation_keys.txt`);
