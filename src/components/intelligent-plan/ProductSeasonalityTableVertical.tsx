import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    { key: 'january_percentage', labelKey: 'intelligent_plan.month_jan' },
    { key: 'february_percentage', labelKey: 'intelligent_plan.month_feb' },
    { key: 'march_percentage', labelKey: 'intelligent_plan.month_mar' },
    { key: 'april_percentage', labelKey: 'intelligent_plan.month_apr' },
  ],
  [
    { key: 'may_percentage', labelKey: 'intelligent_plan.month_may' },
    { key: 'june_percentage', labelKey: 'intelligent_plan.month_jun' },
    { key: 'july_percentage', labelKey: 'intelligent_plan.month_jul' },
    { key: 'august_percentage', labelKey: 'intelligent_plan.month_aug' },
  ],
  [
    { key: 'september_percentage', labelKey: 'intelligent_plan.month_sep' },
    { key: 'october_percentage', labelKey: 'intelligent_plan.month_oct' },
    { key: 'november_percentage', labelKey: 'intelligent_plan.month_nov' },
    { key: 'december_percentage', labelKey: 'intelligent_plan.month_dec' },
  ],
] as const;

export function ProductSeasonalityTableVertical({ 
  clienteId, 
  productoId, 
  year = new Date().getFullYear(),
  onChange 
}: ProductSeasonalityTableVerticalProps) {
  const { toast } = useToast();
  const { t, isLoading: translationsLoading } = useTranslation();
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

  if (translationsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

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
        <div className="space-y-3">
          {/* Grid de 3 columnas para los meses - sin headers de tabla */}
          <div className="grid grid-cols-3 gap-3">
            {MONTH_GROUPS.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-1.5">
                {group.map((month) => (
              <div key={month.key} className="flex items-center gap-2">
                <label className="text-sm font-medium w-10 flex-shrink-0">
                  {t(month.labelKey)}
                </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={seasonality?.[month.key] || 0}
                      onChange={(e) => handleValueChange(month.key, e.target.value)}
                      className="h-8 text-right text-sm"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Indicador de validación y total - más compacto */}
          <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('intelligent_plan.total_row')}:</span>
              <span className={`font-bold ${isValid ? 'text-green-600' : 'text-destructive'}`}>
                {total.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isValid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">{t('intelligent_plan.valid_distribution')}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{t('intelligent_plan.invalid_distribution')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
