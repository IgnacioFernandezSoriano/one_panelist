import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface CityAllocation {
  ciudad_id: number;
  ciudad_codigo: string;
  ciudad_nombre: string;
  clasificacion: string;
  percentage_from_a: number;
  percentage_from_b: number;
  percentage_from_c: number;
}

interface CityAllocationTableProps {
  clienteId: number | null;
  onChange?: (data: CityAllocation[]) => void;
}

export function CityAllocationTable({ clienteId, onChange }: CityAllocationTableProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [allocations, setAllocations] = useState<CityAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clienteId) {
      fetchAllocations();
    }
  }, [clienteId]);

  const fetchAllocations = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);
      
      // Fetch active cities
      const { data: cities, error: citiesError } = await supabase
        .from('ciudades')
        .select('id, codigo, nombre, clasificacion')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('nombre');

      if (citiesError) throw citiesError;

      // Fetch existing allocations
      const { data: existingAllocations, error: allocError } = await supabase
        .from('city_allocation_requirements')
        .select('*')
        .eq('cliente_id', clienteId);

      if (allocError) throw allocError;

      // Merge data
      const merged = (cities || []).map(city => {
        const existing = existingAllocations?.find(a => a.ciudad_id === city.id);
        return {
          ciudad_id: city.id,
          ciudad_codigo: city.codigo,
          ciudad_nombre: city.nombre,
          clasificacion: city.clasificacion,
          percentage_from_a: existing?.percentage_from_a || 33.33,
          percentage_from_b: existing?.percentage_from_b || 33.33,
          percentage_from_c: existing?.percentage_from_c || 33.34,
        };
      });

      setAllocations(merged);
      if (onChange) {
        onChange(merged);
      }
    } catch (error: any) {
      console.error("Error fetching allocations:", error);
      toast({
        title: "Error",
        description: "Failed to load city allocations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (ciudadId: number, field: 'percentage_from_a' | 'percentage_from_b' | 'percentage_from_c', value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = allocations.map(alloc =>
      alloc.ciudad_id === ciudadId
        ? { ...alloc, [field]: Math.max(0, Math.min(100, numValue)) }
        : alloc
    );
    setAllocations(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const getTotalPercentage = (alloc: CityAllocation) => {
    return alloc.percentage_from_a + alloc.percentage_from_b + alloc.percentage_from_c;
  };

  const isValidRow = (alloc: CityAllocation) => {
    const total = getTotalPercentage(alloc);
    return Math.abs(total - 100) < 0.1;
  };

  const allValid = allocations.every(isValidRow);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!clienteId) {
    return (
      <Alert>
        <AlertDescription>
          {t('intelligent_plan.select_account_first')}
        </AlertDescription>
      </Alert>
    );
  }

  if (allocations.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          {t('intelligent_plan.no_cities_found')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t('intelligent_plan.city_allocation_title')}
        </h3>
        {allValid ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t('intelligent_plan.all_valid')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{t('intelligent_plan.validation_sum_not_100')}</span>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('city.city')}</TableHead>
              <TableHead className="text-center">{t('city.classification')}</TableHead>
              <TableHead className="text-center">{t('intelligent_plan.percentage_from_a')}</TableHead>
              <TableHead className="text-center">{t('intelligent_plan.percentage_from_b')}</TableHead>
              <TableHead className="text-center">{t('intelligent_plan.percentage_from_c')}</TableHead>
              <TableHead className="text-center">{t('intelligent_plan.total_percentage')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((alloc) => {
              const total = getTotalPercentage(alloc);
              const isValid = isValidRow(alloc);
              
              return (
                <TableRow key={alloc.ciudad_id} className={!isValid ? 'bg-destructive/10' : ''}>
                  <TableCell className="font-medium">
                    {alloc.ciudad_codigo} - {alloc.ciudad_nombre}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{alloc.clasificacion}</span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={alloc.percentage_from_a}
                      onChange={(e) => handleValueChange(alloc.ciudad_id, 'percentage_from_a', e.target.value)}
                      className="w-24 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={alloc.percentage_from_b}
                      onChange={(e) => handleValueChange(alloc.ciudad_id, 'percentage_from_b', e.target.value)}
                      className="w-24 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={alloc.percentage_from_c}
                      onChange={(e) => handleValueChange(alloc.ciudad_id, 'percentage_from_c', e.target.value)}
                      className="w-24 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${isValid ? 'text-green-600' : 'text-destructive'}`}>
                      {total.toFixed(2)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {!allValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('intelligent_plan.city_allocation_help')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}