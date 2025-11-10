#!/bin/bash

echo "=== EXTRAYENDO CLAVES DE TRADUCCIÓN DE LOS COMPONENTES ==="
echo ""

# Buscar todos los usos de t("clave") o t('clave')
echo "1. Buscando llamadas a t() en archivos .tsx y .ts..."
grep -r "t(['\"]" src/ --include="*.tsx" --include="*.ts" | \
  sed -E "s/.*t\(['\"]([^'\"]+)['\"].*/\1/" | \
  sort -u > /tmp/translation_keys_used.txt

echo "   Total de claves únicas encontradas: $(wc -l < /tmp/translation_keys_used.txt)"
echo ""

# Mostrar las primeras 20 claves
echo "2. Primeras 20 claves de traducción encontradas:"
head -20 /tmp/translation_keys_used.txt
echo ""

# Buscar componentes que usan useTranslation
echo "3. Componentes que usan useTranslation:"
grep -l "useTranslation" src/**/*.tsx src/**/*.ts 2>/dev/null | wc -l
echo ""

# Buscar componentes que NO usan useTranslation pero tienen texto hardcodeado
echo "4. Buscando textos hardcodeados en inglés (sample)..."
grep -r "Dashboard\|Panelists\|Topology\|Configuration" src/pages/ --include="*.tsx" | head -10
echo ""

echo "=== EXTRACCIÓN COMPLETA ==="
