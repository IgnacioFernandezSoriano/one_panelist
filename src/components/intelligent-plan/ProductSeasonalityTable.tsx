import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ProductSeasonality {
  producto_id: number;
  january_percentage: number;
  february_percentage: number;
  march_percentage: number;
  april_percentage: number;
  may_percentage: number;
  june_percentage: number;
  july_percentage: number;
  august_percentage: number;
  september_percentage: number;
  october_percentage: number;
  november_percentage: number;
  december_percentage: number;
}

interface ProductSeasonalityTableProps {
  clienteId: number | null;
  productoId: number | null;
  year?: number;
  onChange?: (data: ProductSeasonality | null) => void;
}

export function ProductSeasonalityTable({ 
  clienteId, 
  productoId, 
  year = new Date().getFullYear(),
  onChange 
}: ProductSeasonalityTableProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [seasonality, setSeasonality] = useState<ProductSeasonality | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clienteId && productoId) {
      fetchSeasonality();
    } else {
      setSeasonality(null);
    }
  }, [clienteId, productoId, year]);

  const fetchSeasonality = async () => {
    if (!clienteId || !productoId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('product_seasonality')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('producto_id', productoId)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;

      const defaultValue = 8.33;
      const seasonalityData: ProductSeasonality = data || {
        producto_id: productoId,
        january_percentage: defaultValue,
        february_percentage: defaultValue,
        march_percentage: defaultValue,
        april_percentage: defaultValue,
        may_percentage: defaultValue,
        june_percentage: defaultValue,
        july_percentage: defaultValue,
        august_percentage: defaultValue,
        september_percentage: 8.34,
        october_percentage: 8.34,
        november_percentage: 8.34,
        december_percentage: 8.34,
      };

      setSeasonality(seasonalityData);
      if (onChange) {
        onChange(seasonalityData);
      }
    } catch (error: any) {
      console.error("Error fetching seasonality:", error);
      toast({
        title: "Error",
        description: "Failed to load product seasonality",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (month: keyof Omit<ProductSeasonality, 'producto_id'>, value: string) => {
    if (!seasonality) return;
    
    const numValue = parseFloat(value) || 0;
    const updated = {
      ...seasonality,
      [month]: Math.max(0, Math.min(100, numValue)),
    };
    setSeasonality(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const getTotalPercentage = () => {
    if (!seasonality) return 0;
    return (
      seasonality.january_percentage +
      seasonality.february_percentage +
      seasonality.march_percentage +
      seasonality.april_percentage +
      seasonality.may_percentage +
      seasonality.june_percentage +
      seasonality.july_percentage +
      seasonality.august_percentage +
      seasonality.september_percentage +
      seasonality.october_percentage +
      seasonality.november_percentage +
      seasonality.december_percentage
    );
  };

  const total = getTotalPercentage();
  const isValid = Math.abs(total - 100) < 0.1;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!clienteId || !productoId) {
    return (
      <Alert>
        <AlertDescription>
          {t('intelligent_plan.select_product_first')}
        </AlertDescription>
      </Alert>
    );
  }

  const months = [
    { key: 'january_percentage', label: t('month.january') },
    { key: 'february_percentage', label: t('month.february') },
    { key: 'march_percentage', label: t('month.march') },
    { key: 'april_percentage', label: t('month.april') },
    { key: 'may_percentage', label: t('month.may') },
    { key: 'june_percentage', label: t('month.june') },
    { key: 'july_percentage', label: t('month.july') },
    { key: 'august_percentage', label: t('month.august') },
    { key: 'september_percentage', label: t('month.september') },
    { key: 'october_percentage', label: t('month.october') },
    { key: 'november_percentage', label: t('month.november') },
    { key: 'december_percentage', label: t('month.december') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t('intelligent_plan.seasonality_title')} ({year})
        </h3>
        {isValid ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{total.toFixed(2)}% - {t('intelligent_plan.all_valid')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{total.toFixed(2)}% - {t('intelligent_plan.validation_sum_not_100')}</span>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {months.map((month) => (
                <TableHead key={month.key} className="text-center">
                  {month.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className={!isValid ? 'bg-destructive/10' : ''}>
              {months.map((month) => (
                <TableCell key={month.key}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={seasonality?.[month.key as keyof Omit<ProductSeasonality, 'producto_id'>] || 0}
                    onChange={(e) => handleValueChange(month.key as keyof Omit<ProductSeasonality, 'producto_id'>, e.target.value)}
                    className="w-20 text-center"
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {!isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('intelligent_plan.seasonality_help')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}