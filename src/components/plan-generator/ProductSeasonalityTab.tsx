import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, Save, HelpCircle, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import Papa from "papaparse";

interface Seasonality {
  id?: number;
  producto_id: number;
  year: number;
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
  cliente_id: number;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const ProductSeasonalityTab = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [seasonality, setSeasonality] = useState<Seasonality | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId && selectedYear) {
      fetchSeasonality();
    }
  }, [selectedProductId, selectedYear]);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: userData } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("email", user.email)
        .single();

      if (!userData?.cliente_id) throw new Error("No cliente_id found");
      setClienteId(userData.cliente_id);

      const { data, error } = await supabase
        .from("productos_cliente")
        .select("*")
        .eq("cliente_id", userData.cliente_id)
        .eq("estado", "activo")
        .order("nombre_producto");

      if (error) throw error;
      setProducts(data || []);
      
      if (data && data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t('common.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonality = async () => {
    if (!selectedProductId || !clienteId) return;

    try {
      const { data, error } = await supabase
        .from("product_seasonality" as any)
        .select("*")
        .eq("producto_id", selectedProductId)
        .eq("year", selectedYear)
        .eq("cliente_id", clienteId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSeasonality(data as any);
      } else {
        // Initialize with default values (uniform distribution)
        setSeasonality({
          producto_id: selectedProductId,
          year: selectedYear,
          cliente_id: clienteId,
          january_percentage: 8.33,
          february_percentage: 8.33,
          march_percentage: 8.33,
          april_percentage: 8.33,
          may_percentage: 8.33,
          june_percentage: 8.33,
          july_percentage: 8.33,
          august_percentage: 8.33,
          september_percentage: 8.34,
          october_percentage: 8.34,
          november_percentage: 8.34,
          december_percentage: 8.34,
        });
      }
    } catch (error) {
      console.error("Error fetching seasonality:", error);
      toast.error(t('common.error_loading'));
    }
  };

  const handlePercentageChange = (month: string, value: string) => {
    if (!seasonality) return;
    
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) return;

    setSeasonality({
      ...seasonality,
      [`${month}_percentage`]: numValue,
    });
  };

  const calculateTotal = () => {
    if (!seasonality) return 0;
    return MONTHS.reduce((sum, month) => {
      return sum + (seasonality[`${month}_percentage` as keyof Seasonality] as number || 0);
    }, 0);
  };

  const total = calculateTotal();
  const isValid = Math.abs(total - 100) < 0.01;

  const handleAutoDistribute = () => {
    if (!seasonality) return;
    
    const perMonth = 100 / 12;
    const updated = { ...seasonality };
    MONTHS.forEach((month, index) => {
      // Distribute the remaining cents in the last months
      updated[`${month}_percentage` as keyof Seasonality] = 
        index < 8 ? parseFloat(perMonth.toFixed(2)) : parseFloat((perMonth + 0.01).toFixed(2));
    });
    setSeasonality(updated);
  };

  const handleSave = async () => {
    if (!seasonality || !isValid) {
      toast.error(t('plan_generator.seasonality_not_100'));
      return;
    }

    try {
      setSaving(true);

      if (seasonality.id) {
        await supabase
          .from("product_seasonality" as any)
          .update({
            january_percentage: seasonality.january_percentage,
            february_percentage: seasonality.february_percentage,
            march_percentage: seasonality.march_percentage,
            april_percentage: seasonality.april_percentage,
            may_percentage: seasonality.may_percentage,
            june_percentage: seasonality.june_percentage,
            july_percentage: seasonality.july_percentage,
            august_percentage: seasonality.august_percentage,
            september_percentage: seasonality.september_percentage,
            october_percentage: seasonality.october_percentage,
            november_percentage: seasonality.november_percentage,
            december_percentage: seasonality.december_percentage,
          } as any)
          .eq("id", seasonality.id);
      } else {
        await supabase
          .from("product_seasonality" as any)
          .insert(seasonality as any);
      }

      toast.success(t('common.save_success'));
      fetchSeasonality();
    } catch (error: any) {
      console.error("Error saving seasonality:", error);
      toast.error(error.message || t('common.error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!seasonality) return;

    const product = products.find(p => p.id === selectedProductId);
    const csvData = [{
      producto_codigo: product?.codigo_producto,
      producto_nombre: product?.nombre_producto,
      year: selectedYear,
      ...MONTHS.reduce((acc, month) => ({
        ...acc,
        [month]: seasonality[`${month}_percentage` as keyof Seasonality]
      }), {}),
      total: total.toFixed(2),
    }];

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Product_Seasonality_${product?.codigo_producto}_${selectedYear}.csv`);
    link.click();
    toast.success(t('plan_generator.export_success'));
  };

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t('plan_generator.product_seasonality')}</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t('plan_generator.seasonality_help')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">{t('product.label')}</label>
          <Select
            value={selectedProductId?.toString()}
            onValueChange={(value) => setSelectedProductId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.codigo_producto} - {product.nombre_producto}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-32">
          <label className="text-sm font-medium mb-2 block">{t('common.year')}</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={handleAutoDistribute}>
          <Shuffle className="h-4 w-4 mr-2" />
          {t('plan_generator.auto_distribute')}
        </Button>
      </div>

      {seasonality && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('plan_generator.total_percentage')}</span>
              <span className={isValid ? "text-success" : "text-destructive"}>
                {total.toFixed(2)}%
              </span>
            </div>
            <Progress value={total} className={isValid ? "" : "bg-destructive/20"} />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.month')}</TableHead>
                  <TableHead className="text-right">{t('plan_generator.percentage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MONTHS.map((month) => (
                  <TableRow key={month}>
                    <TableCell className="font-medium">
                      {t(`month.${month}`)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={seasonality[`${month}_percentage` as keyof Seasonality]}
                        onChange={(e) => handlePercentageChange(month, e.target.value)}
                        className="w-24 ml-auto text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t('plan_generator.export_csv')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !isValid}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductSeasonalityTab;
