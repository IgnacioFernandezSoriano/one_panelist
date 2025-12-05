import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface Language {
  id: number;
  codigo: string;
  nombre_nativo: string;
  nombre_ingles: string;
  bandera_emoji: string;
  es_default: boolean;
  activo: boolean;
}

export default function Idiomas() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLanguage, setNewLanguage] = useState({
    codigo: '',
    nombre_nativo: '',
    nombre_ingles: '',
    bandera_emoji: '',
    es_default: false,
    activo: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: languages = [], isLoading, error: queryError } = useQuery({
    queryKey: ['all-languages'],
    queryFn: async () => {
      console.log('[DEBUG Idiomas] Fetching languages...');
      const { data, error } = await supabase
        .from('idiomas_disponibles')
        .select('*');
      
      // Sort by es_default in frontend to avoid schema cache issues
      const sortedData = data?.sort((a, b) => {
        if (a.es_default && !b.es_default) return -1;
        if (!a.es_default && b.es_default) return 1;
        return 0;
      });
      
      console.log('[DEBUG Idiomas] Response:', { data, error });
      
      if (error) {
        console.error('[ERROR Idiomas] Failed to fetch:', error);
        throw error;
      }
      return sortedData as Language[];
    },
  });

  console.log('[RENDER Idiomas]', { languages, isLoading, queryError });

  const addLanguageMutation = useMutation({
    mutationFn: async (data: typeof newLanguage) => {
      const { error } = await supabase
        .from('idiomas_disponibles')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Idioma agregado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      setIsAddDialogOpen(false);
      setNewLanguage({
        codigo: '',
        nombre_nativo: '',
        nombre_ingles: '',
        bandera_emoji: '',
        es_default: false,
        activo: true
      });
    },
    onError: () => {
      toast({ title: 'Error al agregar idioma', variant: 'destructive' });
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase
        .from('idiomas_disponibles')
        .update({ activo })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      // First, unset all defaults
      await supabase
        .from('idiomas_disponibles')
        .update({ es_default: false })
        .neq('id', 0);
      
      // Then set the new default
      const { error } = await supabase
        .from('idiomas_disponibles')
        .update({ es_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Idioma predeterminado actualizado' });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    }
  });

  const deleteLanguageMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('idiomas_disponibles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Idioma eliminado exitosamente' });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
    onError: () => {
      toast({ title: 'Error al eliminar idioma', variant: 'destructive' });
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Idiomas</h1>
          <p className="text-muted-foreground">Gestiona los idiomas disponibles en la aplicación</p>
        </div>

        <Card className="p-4">
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Idioma
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Idioma</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Código ISO</Label>
                    <Input
                      value={newLanguage.codigo}
                      onChange={(e) => setNewLanguage({ ...newLanguage, codigo: e.target.value })}
                      placeholder="ej: es, en, pt"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label>Nombre Nativo</Label>
                    <Input
                      value={newLanguage.nombre_nativo}
                      onChange={(e) => setNewLanguage({ ...newLanguage, nombre_nativo: e.target.value })}
                      placeholder="ej: Español"
                    />
                  </div>
                  <div>
                    <Label>Nombre en Inglés</Label>
                    <Input
                      value={newLanguage.nombre_ingles}
                      onChange={(e) => setNewLanguage({ ...newLanguage, nombre_ingles: e.target.value })}
                      placeholder="ej: Spanish"
                    />
                  </div>
                  <div>
                    <Label>Emoji de Bandera</Label>
                    <Input
                      value={newLanguage.bandera_emoji}
                      onChange={(e) => setNewLanguage({ ...newLanguage, bandera_emoji: e.target.value })}
                      placeholder="ej: 🇪🇸"
                      maxLength={10}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newLanguage.es_default}
                      onCheckedChange={(checked) => setNewLanguage({ ...newLanguage, es_default: checked })}
                    />
                    <Label>Idioma predeterminado</Label>
                  </div>
                  <Button 
                    onClick={() => addLanguageMutation.mutate(newLanguage)}
                    disabled={!newLanguage.codigo || !newLanguage.nombre_nativo || addLanguageMutation.isPending}
                  >
                    Agregar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Bandera</TableHead>
                <TableHead>Nombre Nativo</TableHead>
                <TableHead>Nombre en Inglés</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Predeterminado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : languages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No hay idiomas configurados
                  </TableCell>
                </TableRow>
              ) : (
                languages.map(lang => (
                  <TableRow key={lang.id}>
                    <TableCell className="font-mono">{lang.codigo}</TableCell>
                    <TableCell className="text-2xl">{lang.bandera_emoji}</TableCell>
                    <TableCell>{lang.nombre_nativo}</TableCell>
                    <TableCell>{lang.nombre_ingles}</TableCell>
                    <TableCell>
                      <Switch
                        checked={lang.activo}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: lang.id, activo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {lang.es_default ? (
                        <span className="text-primary font-semibold">✓ Predeterminado</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(lang.id)}
                        >
                          Establecer
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLanguageMutation.mutate(lang.id)}
                        disabled={lang.es_default}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}
