import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { Download, Upload, Search, Loader2 } from 'lucide-react';
import Papa from 'papaparse';

interface Translation {
  id: number;
  clave: string;
  idioma: string;
  texto: string;
  categoria: string;
  descripcion: string;
}

export default function TraduccionesNew() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAnyRole } = useUserRole();
  
  const canManageTranslations = hasAnyRole(['admin', 'superadmin']);

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ['all-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traducciones')
        .select('*')
        .order('clave');
      
      if (error) throw error;
      return data as Translation[];
    },
  });

  const { data: languages = [] } = useQuery({
    queryKey: ['languages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('idiomas_disponibles')
        .select('*')
        .eq('activo', true)
        .order('es_default', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleExportCSV = () => {
    const grouped = new Map<string, any>();
    
    translations.forEach(t => {
      if (!grouped.has(t.clave)) {
        grouped.set(t.clave, {
          Clave: t.clave,
          Categoría: t.categoria || '',
        });
      }
      grouped.get(t.clave)[t.idioma] = t.texto;
    });

    const rows = Array.from(grouped.values());
    const csv = Papa.unparse(rows);
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traducciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    
    try {
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const translations: any[] = [];
            
            // Procesar cada fila
            for (const row of results.data as any[]) {
              // Normalizar claves de columna
              const normalizedRow: any = {};
              Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase().trim()] = row[key];
              });
              
              const clave = normalizedRow['clave'];
              if (!clave || !clave.trim()) continue;
              
              const categoria = normalizedRow['categoria'] || normalizedRow['categoría'] || '';
              
              // Procesar cada idioma
              for (const lang of languages) {
                const langCode = lang.codigo.toLowerCase();
                const texto = normalizedRow[langCode];
                
                if (texto && texto.trim()) {
                  translations.push({
                    clave: clave.trim(),
                    idioma: lang.codigo,
                    texto: texto.trim(),
                    categoria: categoria.trim(),
                    descripcion: ''
                  });
                }
              }
            }
            
            if (translations.length === 0) {
              toast({
                title: 'Error',
                description: 'No se encontraron traducciones válidas en el archivo',
                variant: 'destructive'
              });
              setIsImporting(false);
              return;
            }
            
            // Insertar en la base de datos
            const { error } = await supabase
              .from('traducciones')
              .upsert(translations, {
                onConflict: 'clave,idioma',
                ignoreDuplicates: false
              });
            
            if (error) throw error;
            
            toast({
              title: 'Éxito',
              description: `${translations.length} traducciones importadas correctamente`
            });
            
            queryClient.invalidateQueries({ queryKey: ['all-translations'] });
            queryClient.invalidateQueries({ queryKey: ['translations'] });
            
          } catch (error: any) {
            console.error('Error processing CSV:', error);
            toast({
              title: 'Error al importar',
              description: error.message || 'Error desconocido',
              variant: 'destructive'
            });
          } finally {
            setIsImporting(false);
          }
        },
        error: (error) => {
          console.error('Papa parse error:', error);
          toast({
            title: 'Error al leer el archivo',
            description: error.message,
            variant: 'destructive'
          });
          setIsImporting(false);
        }
      });
    } catch (error: any) {
      console.error('File read error:', error);
      toast({
        title: 'Error al leer el archivo',
        description: error.message,
        variant: 'destructive'
      });
      setIsImporting(false);
    }
    
    // Reset input
    event.target.value = '';
  };

  // Agrupar traducciones por clave
  const groupedTranslations = new Map<string, Map<string, string>>();
  translations.forEach(t => {
    if (!groupedTranslations.has(t.clave)) {
      groupedTranslations.set(t.clave, new Map());
    }
    groupedTranslations.get(t.clave)!.set(t.idioma, t.texto);
  });

  // Filtrar claves
  const filteredKeys = Array.from(groupedTranslations.keys()).filter(key => {
    const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase());
    const translation = translations.find(t => t.clave === key);
    const matchesCategory = !selectedCategory || translation?.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(translations.map(t => t.categoria).filter(Boolean)));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Traducciones</h1>
          <p className="text-muted-foreground">Gestiona las traducciones de la aplicación</p>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por clave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              {canManageTranslations && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={handleImportClick}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar CSV
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Categoría</TableHead>
                {languages.map((lang: any) => (
                  <TableHead key={lang.codigo}>
                    {lang.bandera_emoji} {lang.nombre_nativo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2 + languages.length} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + languages.length} className="text-center py-8 text-muted-foreground">
                    No se encontraron traducciones
                  </TableCell>
                </TableRow>
              ) : (
                filteredKeys.map(key => {
                  const translation = translations.find(t => t.clave === key);
                  const langTexts = groupedTranslations.get(key)!;
                  
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-sm">{key}</TableCell>
                      <TableCell>{translation?.categoria}</TableCell>
                      {languages.map((lang: any) => (
                        <TableCell key={lang.codigo}>
                          {langTexts.get(lang.codigo) || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
