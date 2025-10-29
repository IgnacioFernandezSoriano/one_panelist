import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserRole } from "@/hooks/useUserRole";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ProductSeasonalityData {
  producto_id: number;
  codigo_producto: string;
  nombre_producto: string;
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

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const ProductSeasonalityTab = () => {
  const { t } = useTranslation();
  const { clienteId: userClienteId, isSuperAdmin } = useUserRole();
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [productData, setProductData] = useState<ProductSeasonalityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const clienteId = isSuperAdmin() ? selectedClienteId : userClienteId;

  useEffect(() => {
    if (isSuperAdmin()) {
      fetchClientes();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (clienteId && selectedYear) {
      fetchProductData();
    }
  }, [clienteId, selectedYear]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, codigo, nombre")
        .eq("estado", "activo")
        .order("nombre");

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error fetching clientes:", error);
      toast.error(t('common.error_loading'));
    }
  };

  const fetchProductData = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from("productos_cliente")
        .select("id, codigo_producto, nombre_producto")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("nombre_producto");

      if (productsError) throw productsError;
      if (!products || products.length === 0) {
        setProductData([]);
        return;
      }

      // Fetch existing seasonality data
      const { data: existingSeasonality, error: seasonalityError } = await supabase
        .from("product_seasonality")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("year", selectedYear);

      // Handle 404 gracefully (table might not exist yet)
      const seasonalityMap = new Map();
      if (!seasonalityError || (seasonalityError as any)?.code === 'PGRST116') {
        (existingSeasonality || []).forEach((item: any) => {
          seasonalityMap.set(item.producto_id, item);
        });
      } else if (seasonalityError) {
        throw seasonalityError;
      }

      // Merge products with seasonality data
      const merged = products.map((product) => {
        const existing = seasonalityMap.get(product.id);
        return {
          producto_id: product.id,
          codigo_producto: product.codigo_producto,
          nombre_producto: product.nombre_producto,
          january_percentage: existing?.january_percentage || 8.33,
          february_percentage: existing?.february_percentage || 8.33,
          march_percentage: existing?.march_percentage || 8.33,
          april_percentage: existing?.april_percentage || 8.33,
          may_percentage: existing?.may_percentage || 8.33,
          june_percentage: existing?.june_percentage || 8.33,
          july_percentage: existing?.july_percentage || 8.33,
          august_percentage: existing?.august_percentage || 8.33,
          september_percentage: existing?.september_percentage || 8.34,
          october_percentage: existing?.october_percentage || 8.34,
          november_percentage: existing?.november_percentage || 8.34,
          december_percentage: existing?.december_percentage || 8.34,
        };
      });

      setProductData(merged);
    } catch (error: any) {
      console.error("Error fetching product data:", error);
      if ((error as any)?.code !== 'PGRST116') {
        toast.error(t('common.error_loading'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (productoId: number, month: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) return;

    setProductData((prev) =>
      prev.map((item) =>
        item.producto_id === productoId
          ? { ...item, [`${month}_percentage`]: numValue }
          : item
      )
    );
  };

  const handleSave = async () => {
    if (!clienteId || productData.length === 0) return;

    try {
      setSaving(true);

      const upsertData = productData.map((item) => ({
        cliente_id: clienteId,
        producto_id: item.producto_id,
        year: selectedYear,
        january_percentage: item.january_percentage,
        february_percentage: item.february_percentage,
        march_percentage: item.march_percentage,
        april_percentage: item.april_percentage,
        may_percentage: item.may_percentage,
        june_percentage: item.june_percentage,
        july_percentage: item.july_percentage,
        august_percentage: item.august_percentage,
        september_percentage: item.september_percentage,
        october_percentage: item.october_percentage,
        november_percentage: item.november_percentage,
        december_percentage: item.december_percentage,
      }));

      const { error } = await supabase
        .from("product_seasonality")
        .upsert(upsertData, {
          onConflict: "cliente_id,producto_id,year",
        });

      if (error) throw error;

      toast.success(t('common.save_success'));
      await fetchProductData();
    } catch (error: any) {
      console.error("Error saving seasonality:", error);
      toast.error(error.message || t('common.error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!clienteId) return;

    try {
      setSaving(true);

      // Reset to default distribution
      const resetData = productData.map((item) => ({
        cliente_id: clienteId,
        producto_id: item.producto_id,
        year: selectedYear,
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
      }));

      const { error } = await supabase
        .from("product_seasonality")
        .upsert(resetData, {
          onConflict: "cliente_id,producto_id,year",
        });

      if (error) throw error;

      toast.success(t('plan_generator.reset_success'));
      await fetchProductData();
    } catch (error: any) {
      console.error("Error resetting seasonality:", error);
      toast.error(t('common.error_saving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (!clienteId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {isSuperAdmin() ? t('common.select_client') : t('common.loading')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{t('plan_generator.product_seasonality')}</h3>
          <Button size="sm" onClick={handleSave} disabled={saving || productData.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={saving || productData.length === 0}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('plan_generator.reset')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('plan_generator.reset_seasonality_title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('plan_generator.reset_seasonality_description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>{t('plan_generator.reset')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex gap-4 items-end">
        {isSuperAdmin() && (
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">{t('client.label')}</label>
            <Select
              value={selectedClienteId?.toString() || ""}
              onValueChange={(value) => setSelectedClienteId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select_client')} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id.toString()}>
                    {cliente.codigo} - {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
      </div>

      {productData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('plan_generator.no_products_found')}
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <div className="relative">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-24 text-sm sticky left-0 bg-background z-20">
                    {t('product.code')}
                  </TableHead>
                  <TableHead className="max-w-[150px] text-sm sticky left-24 bg-background z-20">
                    {t('product.label')}
                  </TableHead>
                  {MONTHS.map((month) => (
                    <TableHead key={month} className="w-16 text-center text-sm">
                      {t(`month.${month}_short`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productData.map((product) => (
                  <TableRow key={product.producto_id}>
                    <TableCell className="text-sm font-medium sticky left-0 bg-background z-10">
                      {product.codigo_producto}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate sticky left-24 bg-background z-10" title={product.nombre_producto}>
                      {product.nombre_producto}
                    </TableCell>
                    {MONTHS.map((month) => (
                      <TableCell key={month} className="text-center">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={product[`${month}_percentage` as keyof ProductSeasonalityData]}
                          onChange={(e) =>
                            handlePercentageChange(product.producto_id, month, e.target.value)
                          }
                          className="w-16 h-8 text-center text-sm"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSeasonalityTab;
