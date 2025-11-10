import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rpasddacpejcjgyiyrsx.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYXNkZGFjcGVqY2pneWl5cnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk1MTU0MzIsImV4cCI6MjA0NTA5MTQzMn0.YHfkpWHPRVBhPMIx0dKpZCCXUyMQ-vDlOGpuFJRzHJo';

const supabase = createClient(supabaseUrl, anonKey);

console.log('=== TESTEO DEL SISTEMA DE TRADUCCIONES ===\n');

// Test 1: Verificar idiomas disponibles
console.log('1. Verificando idiomas disponibles...');
const { data: languages, error: langError } = await supabase
  .from('idiomas_disponibles')
  .select('*')
  .eq('activo', true);

if (langError) {
  console.error('❌ Error al obtener idiomas:', langError.message);
} else {
  console.log(`✅ Idiomas disponibles: ${languages.length}`);
  languages.forEach(lang => {
    console.log(`   - ${lang.codigo}: ${lang.nombre_nativo} (default: ${lang.es_default})`);
  });
}

// Test 2: Verificar traducciones por idioma
console.log('\n2. Verificando traducciones por idioma...');
for (const lang of languages || []) {
  const { data: translations, error: transError } = await supabase
    .from('traducciones')
    .select('clave', { count: 'exact' })
    .eq('idioma', lang.codigo);
  
  if (transError) {
    console.error(`❌ Error al obtener traducciones para ${lang.codigo}:`, transError.message);
  } else {
    console.log(`✅ ${lang.codigo}: ${translations.length} traducciones`);
  }
}

// Test 3: Verificar traducciones específicas del dashboard
console.log('\n3. Verificando traducciones del dashboard...');
const dashboardKeys = [
  'dashboard.executive_dashboard',
  'dashboard.dashboard',
  'dashboard.topology',
  'dashboard.panelists',
  'dashboard.active_plans',
  'dashboard.active_panelists',
  'dashboard.open_incidents',
  'dashboard.shipments_this_month'
];

for (const key of dashboardKeys) {
  const { data: trans, error } = await supabase
    .from('traducciones')
    .select('idioma, texto')
    .eq('clave', key);
  
  if (error) {
    console.error(`❌ Error al buscar ${key}:`, error.message);
  } else if (trans.length === 0) {
    console.log(`❌ Falta traducción: ${key}`);
  } else {
    console.log(`✅ ${key}:`);
    trans.forEach(t => console.log(`   ${t.idioma}: ${t.texto}`));
  }
}

// Test 4: Verificar usuario y su idioma preferido
console.log('\n4. Verificando configuración de usuario...');
const { data: users, error: userError } = await supabase
  .from('usuarios')
  .select('email, idioma_preferido')
  .eq('email', 'ignacio.fernandez@upu.int')
  .single();

if (userError) {
  console.error('❌ Error al obtener usuario:', userError.message);
} else {
  console.log(`✅ Usuario: ${users.email}`);
  console.log(`   Idioma preferido: ${users.idioma_preferido || 'No configurado'}`);
}

console.log('\n=== FIN DEL TESTEO ===');
