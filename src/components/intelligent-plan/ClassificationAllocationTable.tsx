import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
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
    { destination_classification: 'A', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
    { destination_classification: 'B', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
    { destination_classification: 'C', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
  ]);
  const [loading, setLoading] = useState(false);
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
        // Use defaults if no data exists
        const defaults: ClassificationMatrix[] = [
          { destination_classification: 'A', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
          { destination_classification: 'B', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
          { destination_classification: 'C', percentage_from_a: 33.33, percentage_from_b: 33.33, percentage_from_c: 33.34 },
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
  };

  const getTotalPercentage = (row: ClassificationMatrix): number => {
    return row.percentage_from_a + row.percentage_from_b + row.percentage_from_c;
  };

  const isValidRow = (row: ClassificationMatrix): boolean => {
    const total = getTotalPercentage(row);
    return Math.abs(total - 100) < 0.1;
  };

  const allValid = matrix.every(isValidRow);

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
          Each row must sum to 100%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How it works:</strong> For each destination city type (A, B, or C), specify what percentage of events should come from cities of type A, B, and C.
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

          {allValid && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                All percentages are valid and sum to 100%.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
