import { useState, useEffect } from 'react';
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
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Fetch languages with detailed error handling
  const { data: languages = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['all-languages'],
    queryFn: async () => {
      console.log('[Idiomas] Fetching languages...');
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Idiomas] Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('[Idiomas] No active session');
        throw new Error('No active session. Please log in again.');
      }
      
      console.log('[Idiomas] Session active:', session.user.email);
      
      // Fetch languages
      const { data, error } = await supabase
        .from('idiomas_disponibles')
        .select('*')
        .order('es_default', { ascending: false });
      
      console.log('[Idiomas] Query result:', { data, error });
      
      if (error) {
        console.error('[Idiomas] Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!data) {
        console.warn('[Idiomas] No data returned');
        return [];
      }
      
      console.log(`[Idiomas] Successfully fetched ${data.length} languages`);
      return data as Language[];
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Log render state
  useEffect(() => {
    console.log('[Idiomas] Render state:', { 
      languagesCount: languages?.length || 0, 
      isLoading, 
      hasError: !!queryError 
    });
  }, [languages, isLoading, queryError]);

  const addLanguageMutation = useMutation({
    mutationFn: async (data: typeof newLanguage) => {
      console.log('[Idiomas] Adding language:', data);
      const { error } = await supabase
        .from('idiomas_disponibles')
        .insert([data]);
      
      if (error) {
        console.error('[Idiomas] Insert error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Language added successfully' });
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
    onError: (error: any) => {
      console.error('[Idiomas] Add mutation error:', error);
      toast({ 
        title: 'Error adding language', 
        description: error.message,
        variant: 'destructive' 
      });
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
      toast({ title: 'Default language updated' });
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
      toast({ title: 'Language deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['all-languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error deleting language', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Languages</h1>
          <p className="text-muted-foreground">Manage available languages in the application</p>
        </div>

        {queryError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading languages: {(queryError as Error).message}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-4">
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Language
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Language</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>ISO Code</Label>
                    <Input
                      value={newLanguage.codigo}
                      onChange={(e) => setNewLanguage({ ...newLanguage, codigo: e.target.value })}
                      placeholder="e.g.: es, en, pt"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <Label>Native Name</Label>
                    <Input
                      value={newLanguage.nombre_nativo}
                      onChange={(e) => setNewLanguage({ ...newLanguage, nombre_nativo: e.target.value })}
                      placeholder="e.g.: Español"
                    />
                  </div>
                  <div>
                    <Label>English Name</Label>
                    <Input
                      value={newLanguage.nombre_ingles}
                      onChange={(e) => setNewLanguage({ ...newLanguage, nombre_ingles: e.target.value })}
                      placeholder="e.g.: Spanish"
                    />
                  </div>
                  <div>
                    <Label>Flag Emoji</Label>
                    <Input
                      value={newLanguage.bandera_emoji}
                      onChange={(e) => setNewLanguage({ ...newLanguage, bandera_emoji: e.target.value })}
                      placeholder="e.g.: 🇪🇸"
                      maxLength={10}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newLanguage.es_default}
                      onCheckedChange={(checked) => setNewLanguage({ ...newLanguage, es_default: checked })}
                    />
                    <Label>Default language</Label>
                  </div>
                  <Button 
                    onClick={() => addLanguageMutation.mutate(newLanguage)}
                    disabled={!newLanguage.codigo || !newLanguage.nombre_nativo || addLanguageMutation.isPending}
                  >
                    {addLanguageMutation.isPending ? 'Adding...' : 'Add'}
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
                <TableHead>Code</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Native Name</TableHead>
                <TableHead>English Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : languages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No languages configured
                    {!queryError && (
                      <Button 
                        variant="link" 
                        onClick={() => refetch()}
                        className="ml-2"
                      >
                        Refresh
                      </Button>
                    )}
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
                        <span className="text-primary font-semibold">✓ Default</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(lang.id)}
                        >
                          Set as default
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
