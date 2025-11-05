import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClassificationMatrix {
  id?: number;
  destination_classification: 'A' | 'B' | 'C';
  percentage_from_a: number;
  percentage_from_b: number;
  percentage_from_c: number;
}

interface ClassificationAllocationTableProps {
  clienteId: number | null;
  onChange?: (data: ClassificationMatrix[]) => void;
}

export function ClassificationAllocationTable({ 
  clienteId, 
  onChange 
}: ClassificationAllocationTableProps) {
  const [matrix, setMatrix] = useState<ClassificationMatrix[]>([
    { destination_classification: 'A', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
    { destination_classification: 'B', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
    { destination_classification: 'C', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (clienteId) {
      fetchMatrix();
    }
  }, [clienteId]);

  const fetchMatrix = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classification_allocation_matrix')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('destination_classification');

      if (error) throw error;

      if (data && data.length > 0) {
        setMatrix(data as ClassificationMatrix[]);
        onChange?.(data as ClassificationMatrix[]);
      } else {
        // Use defaults if no data exists (sum to 100%)
        const defaults: ClassificationMatrix[] = [
          { destination_classification: 'A', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
          { destination_classification: 'B', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
          { destination_classification: 'C', percentage_from_a: 11.11, percentage_from_b: 11.11, percentage_from_c: 11.12 },
        ];
        setMatrix(defaults);
        onChange?.(defaults);
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

  const saveMatrix = async (matrixToSave: ClassificationMatrix[]) => {
    if (!clienteId) return;
    
    setSaving(true);
    try {
      // Delete existing records
      await supabase
        .from('classification_allocation_matrix')
        .delete()
        .eq('cliente_id', clienteId);

      // Insert new records
      const records = matrixToSave.map(row => ({
        cliente_id: clienteId,
        destination_classification: row.destination_classification,
        percentage_from_a: row.percentage_from_a,
        percentage_from_b: row.percentage_from_b,
        percentage_from_c: row.percentage_from_c,
      }));

      const { error } = await supabase
        .from('classification_allocation_matrix')
        .insert(records);

      if (error) throw error;

      console.log('[Matrix] Saved successfully:', matrixToSave);
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

  const handleValueChange = (
    classification: 'A' | 'B' | 'C',
    field: 'percentage_from_a' | 'percentage_from_b' | 'percentage_from_c',
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(0, Math.min(100, numValue));

    const updatedMatrix = matrix.map(row =>
      row.destination_classification === classification
        ? { ...row, [field]: clampedValue }
        : row
    );

    setMatrix(updatedMatrix);
    onChange?.(updatedMatrix);
    console.log('[Matrix] Changed:', updatedMatrix);

    // Auto-save with debounce (2 seconds)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveMatrix(updatedMatrix);
    }, 2000);
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

  if (!clienteId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Please select a client to configure the classification allocation matrix.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classification Allocation Matrix</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classification Allocation Matrix</CardTitle>
        <CardDescription>
          Define how events are distributed to cities based on their classification (A, B, C).
          The entire matrix (all 9 cells) must sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> The entire matrix represents 100% of all events. 
              Each cell shows what percentage of total events go from source classification to destination classification.
              For example: 25% in "Cities Type A → From Type A" means 25% of all events originate and end in Type A cities.
            </AlertDescription>
          </Alert>

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

          {allValid && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Matrix is valid and sums to 100%.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => saveMatrix(matrix)}
            disabled={!allValid || saving}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Matrix"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
