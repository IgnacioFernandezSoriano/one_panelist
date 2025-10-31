import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Save, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClassificationMatrix {
  id?: number;
  destination_classification: 'A' | 'B' | 'C';
  percentage_from_a: number;
  percentage_from_b: number;
  percentage_from_c: number;
}

interface Cliente {
  id: number;
  nombre: string;
}

export function ClassificationMatrixTab() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [matrix, setMatrix] = useState<ClassificationMatrix[]>([
    { destination_classification: 'A', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
    { destination_classification: 'B', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
    { destination_classification: 'C', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      fetchMatrix();
    }
  }, [selectedCliente]);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, cliente_id')
        .eq('email', user.email)
        .single();

      if (!userData) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.id);

      const isSuperAdmin = roles?.some(r => r.role === 'superadmin') || false;
      setIsSuperAdmin(isSuperAdmin);

      if (isSuperAdmin) {
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('estado', 'activo')
          .order('nombre');
        
        if (clientesData) {
          setClientes(clientesData);
        }
      } else if (userData.cliente_id) {
        setSelectedCliente(userData.cliente_id);
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('id, nombre')
          .eq('id', userData.cliente_id)
          .single();
        
        if (clienteData) {
          setClientes([clienteData]);
        }
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const fetchMatrix = async () => {
    if (!selectedCliente) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classification_allocation_matrix')
        .select('*')
        .eq('cliente_id', selectedCliente)
        .order('destination_classification');

      if (error) throw error;

      if (data && data.length > 0) {
        setMatrix(data as ClassificationMatrix[]);
      } else {
        // Reset to defaults if no data exists
        resetToDefaults();
      }
    } catch (error) {
      console.error('Error fetching classification matrix:', error);
      toast({
        title: "Error",
        description: "Failed to load classification allocation matrix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (
    classification: 'A' | 'B' | 'C',
    field: 'percentage_from_a' | 'percentage_from_b' | 'percentage_from_c',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));

    setMatrix(prev => prev.map(row =>
      row.destination_classification === classification
        ? { ...row, [field]: clampedValue }
        : row
    ));
  };

  const getMatrixTotalPercentage = (): number => {
    return matrix.reduce((sum, row) => 
      sum + row.percentage_from_a + row.percentage_from_b + row.percentage_from_c, 
      0
    );
  };

  const isMatrixValid = (): boolean => {
    const total = getMatrixTotalPercentage();
    return Math.abs(total - 100) < 0.1;
  };

  const allValid = isMatrixValid();

  const handleSave = async () => {
    if (!selectedCliente) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!allValid) {
      toast({
        title: "Validation Error",
        description: `The entire matrix must sum to 100%. Current total: ${getMatrixTotalPercentage().toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Delete existing records
      await supabase
        .from('classification_allocation_matrix')
        .delete()
        .eq('cliente_id', selectedCliente);

      // Insert new records
      const records = matrix.map(row => ({
        cliente_id: selectedCliente,
        destination_classification: row.destination_classification,
        percentage_from_a: row.percentage_from_a,
        percentage_from_b: row.percentage_from_b,
        percentage_from_c: row.percentage_from_c,
      }));

      const { error } = await supabase
        .from('classification_allocation_matrix')
        .insert(records);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Classification allocation matrix saved successfully",
      });
    } catch (error) {
      console.error('Error saving classification matrix:', error);
      toast({
        title: "Error",
        description: "Failed to save classification allocation matrix",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setMatrix([
      { destination_classification: 'A', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
      { destination_classification: 'B', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
      { destination_classification: 'C', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
    ]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Classification Allocation Matrix</CardTitle>
          <CardDescription>
            Define how events are distributed to cities based on their classification (A, B, C).
            The entire matrix (all 9 cells) must sum to 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSuperAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select
                value={selectedCliente?.toString() || ""}
                onValueChange={(value) => setSelectedCliente(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedCliente && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>How it works:</strong> The entire matrix represents 100% of all events. 
                  Each cell shows what percentage of total events go from source classification to destination classification.
                  For example: 25% in "Cities Type A → From Type A" means 25% of all events originate and end in Type A cities.
                </AlertDescription>
              </Alert>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Destination Type</TableHead>
                        <TableHead className="text-center">From Type A (%)</TableHead>
                        <TableHead className="text-center">From Type B (%)</TableHead>
                        <TableHead className="text-center">From Type C (%)</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrix.map((row) => (
                        <TableRow key={row.destination_classification}>
                          <TableCell className="font-medium">
                            Cities Type {row.destination_classification}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.percentage_from_a}
                              onChange={(e) =>
                                handleValueChange(
                                  row.destination_classification,
                                  'percentage_from_a',
                                  e.target.value
                                )
                              }
                              className="text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.percentage_from_b}
                              onChange={(e) =>
                                handleValueChange(
                                  row.destination_classification,
                                  'percentage_from_b',
                                  e.target.value
                                )
                              }
                              className="text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={row.percentage_from_c}
                              onChange={(e) =>
                                handleValueChange(
                                  row.destination_classification,
                                  'percentage_from_c',
                                  e.target.value
                                )
                              }
                              className="text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {(row.percentage_from_a + row.percentage_from_b + row.percentage_from_c).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-bold bg-muted/50">
                        <TableCell>Column Totals</TableCell>
                        <TableCell className="text-center">
                          {matrix.reduce((sum, r) => sum + r.percentage_from_a, 0).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-center">
                          {matrix.reduce((sum, r) => sum + r.percentage_from_b, 0).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-center">
                          {matrix.reduce((sum, r) => sum + r.percentage_from_c, 0).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-center text-lg">
                          {getMatrixTotalPercentage().toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {!allValid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        The entire matrix must sum to 100%. Current total: {getMatrixTotalPercentage().toFixed(2)}%
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={!allValid || saving}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Matrix"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetToDefaults}
                      disabled={saving}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset to Default
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {!selectedCliente && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Please select a client to view and edit the classification allocation matrix.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
