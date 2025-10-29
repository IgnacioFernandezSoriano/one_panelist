import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Plus, Search } from 'lucide-react';
import Papa from 'papaparse';

interface Translation {
  id: number;
  clave: string;
  idioma: string;
  texto: string;
  categoria: string;
  descripcion: string;
}

export default function Traducciones() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTranslation, setNewTranslation] = useState({
    clave: '',
    categoria: '',
    descripcion: '',
    es: '',
    en: '',
    pt: ''
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const addTranslationMutation = useMutation({
    mutationFn: async (data: typeof newTranslation) => {
      const translations = [];
      
      // Usar los idiomas disponibles dinámicamente
      for (const language of languages) {
        const langCode = language.codigo;
        if (data[langCode as keyof typeof data]) {
          translations.push({
            clave: data.clave,
            idioma: langCode,
            texto: data[langCode as keyof typeof data] as string,
            categoria: data.categoria,
            descripcion: data.descripcion
          });
        }
      }
      
      // Validar que hay al menos una traducción
      if (translations.length === 0) {
        throw new Error('Debe completar al menos un idioma');
      }
      
      const { error } = await supabase
        .from('traducciones')
        .upsert(translations);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Traducción agregada exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['all-translations'] });
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      setIsAddDialogOpen(false);
      
      // Resetear el formulario dinámicamente
      const resetState: any = { clave: '', categoria: '', descripcion: '' };
      languages.forEach(lang => {
        resetState[lang.codigo] = '';
      });
      setNewTranslation(resetState);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error al agregar traducción', 
        description: error.message || 'Por favor, verifica los datos e intenta nuevamente',
        variant: 'destructive' 
      });
    }
  });

  const handleExportCSV = () => {
    const grouped = new Map<string, any>();
    
    translations.forEach(t => {
      if (!grouped.has(t.clave)) {
        grouped.set(t.clave, {
          clave: t.clave,
          categoria: t.categoria,
          descripcion: t.descripcion
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

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const translations: any[] = [];
        
        results.data.forEach((row: any) => {
          if (!row.clave) return;
          
          languages.forEach((lang: any) => {
            if (row[lang.codigo]) {
              translations.push({
                clave: row.clave,
                idioma: lang.codigo,
                texto: row[lang.codigo],
                categoria: row.categoria || '',
                descripcion: row.descripcion || ''
              });
            }
          });
        });

        try {
          const { error } = await supabase
            .from('traducciones')
            .upsert(translations, {
              onConflict: 'clave,idioma',
              ignoreDuplicates: false
            });
          
          if (error) throw error;
          
          toast({ 
            title: 'Importación exitosa',
            description: `${translations.length} traducciones importadas`
          });
          queryClient.invalidateQueries({ queryKey: ['all-translations'] });
          queryClient.invalidateQueries({ queryKey: ['translations'] });
        } catch (error) {
          toast({ 
            title: 'Error al importar',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const groupedTranslations = new Map<string, Map<string, string>>();
  translations.forEach(t => {
    if (!groupedTranslations.has(t.clave)) {
      groupedTranslations.set(t.clave, new Map());
    }
    groupedTranslations.get(t.clave)!.set(t.idioma, t.texto);
  });

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
              <Button variant="outline" asChild>
                <label>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                </label>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Traducción
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nueva Traducción</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Clave</Label>
                      <Input
                        value={newTranslation.clave}
                        onChange={(e) => setNewTranslation({ ...newTranslation, clave: e.target.value })}
                        placeholder="ej: menu.dashboard"
                      />
                    </div>
                    <div>
                      <Label>Categoría</Label>
                      <Input
                        value={newTranslation.categoria}
                        onChange={(e) => setNewTranslation({ ...newTranslation, categoria: e.target.value })}
                        placeholder="ej: menu"
                      />
                    </div>
                    <div>
                      <Label>Descripción</Label>
                      <Textarea
                        value={newTranslation.descripcion}
                        onChange={(e) => setNewTranslation({ ...newTranslation, descripcion: e.target.value })}
                        placeholder="Contexto para traductores"
                      />
                    </div>
                    {languages.map((lang: any) => (
                      <div key={lang.codigo}>
                        <Label>{lang.bandera_emoji} {lang.nombre_nativo}</Label>
                        <Input
                          value={newTranslation[lang.codigo as keyof typeof newTranslation] || ''}
                          onChange={(e) => setNewTranslation({ 
                            ...newTranslation, 
                            [lang.codigo]: e.target.value 
                          })}
                        />
                      </div>
                    ))}
                    <Button 
                      onClick={() => addTranslationMutation.mutate(newTranslation)}
                      disabled={!newTranslation.clave || addTranslationMutation.isPending}
                    >
                      Agregar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Clave</TableHead>
                <TableHead className="min-w-[120px]">Categoría</TableHead>
                {languages.map((lang: any) => (
                  <TableHead key={lang.codigo} className="min-w-[200px]">
                    {lang.bandera_emoji} {lang.nombre_nativo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2 + languages.length} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + languages.length} className="text-center">
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
                          {langTexts.get(lang.codigo) || (
                            <span className="text-destructive">⚠️ Falta</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
