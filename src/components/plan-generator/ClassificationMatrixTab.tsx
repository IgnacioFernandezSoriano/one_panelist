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
    { destination_classification: 'A', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
    { destination_classification: 'B', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
    { destination_classification: 'C', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
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

  const getTotalPercentage = (row: ClassificationMatrix): number => {
    return row.percentage_from_a + row.percentage_from_b + row.percentage_from_c;
  };

  const isValidRow = (row: ClassificationMatrix): boolean => {
    const total = getTotalPercentage(row);
    return Math.abs(total - 100) < 0.1;
  };

  const allValid = matrix.every(isValidRow);

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
        description: "All rows must sum to 100%",
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
            Define how events are distributed to cities based on their classification (A, B, C)
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
                  <strong>How it works:</strong> For each destination city type (A, B, or C), specify what percentage of events should come from cities of type A, B, and C. Each row must sum to 100%.
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
                      {matrix.map((row) => {
                        const total = getTotalPercentage(row);
                        const isValid = isValidRow(row);
                        const rowClass = !isValid ? "bg-destructive/10" : "";

                        return (
                          <TableRow key={row.destination_classification} className={rowClass}>
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
                            <TableCell className="text-center">
                              <span className={!isValid ? "text-destructive font-bold" : "text-muted-foreground"}>
                                {total.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {!allValid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        All rows must sum to 100%. Please adjust the percentages.
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
