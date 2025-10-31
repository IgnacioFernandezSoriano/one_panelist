import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProductSeasonalityTableVerticalProps {
  clienteId: number | null;
  productoId: number | null;
  year?: number;
  onChange?: (data: ProductSeasonality | null) => void;
}

const MONTH_GROUPS = [
  [
    { key: 'january_percentage', label_key: 'month.january' },
    { key: 'february_percentage', label_key: 'month.february' },
    { key: 'march_percentage', label_key: 'month.march' },
    { key: 'april_percentage', label_key: 'month.april' },
  ],
  [
    { key: 'may_percentage', label_key: 'month.may' },
    { key: 'june_percentage', label_key: 'month.june' },
    { key: 'july_percentage', label_key: 'month.july' },
    { key: 'august_percentage', label_key: 'month.august' },
  ],
  [
    { key: 'september_percentage', label_key: 'month.september' },
    { key: 'october_percentage', label_key: 'month.october' },
    { key: 'november_percentage', label_key: 'month.november' },
    { key: 'december_percentage', label_key: 'month.december' },
  ],
] as const;

export function ProductSeasonalityTableVertical({ 
  clienteId, 
  productoId, 
  year = new Date().getFullYear(),
  onChange 
}: ProductSeasonalityTableVerticalProps) {
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
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {t('intelligent_plan.seasonality_title')} ({year})
        </CardTitle>
        <CardDescription>
          {t('intelligent_plan.seasonality_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Grid de 3 columnas para los meses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MONTH_GROUPS.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm">{t('intelligent_plan.month_column')}</TableHead>
                      <TableHead className="text-right text-sm w-24">{t('intelligent_plan.percentage_column')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.map((month) => (
                      <TableRow key={month.key}>
                        <TableCell className="font-medium py-2">{t(month.label_key)}</TableCell>
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={seasonality?.[month.key] || 0}
                            onChange={(e) => handleValueChange(month.key, e.target.value)}
                            className="w-full text-right"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>

          {/* Indicador de validación y total */}
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{t('intelligent_plan.total_row')}:</span>
              <span className={`font-bold text-lg ${isValid ? 'text-green-600' : 'text-destructive'}`}>
                {total.toFixed(2)}%
              </span>
            </div>
            <div className="flex-shrink-0">
              {isValid ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{t('intelligent_plan.valid_distribution')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{t('intelligent_plan.invalid_distribution')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
