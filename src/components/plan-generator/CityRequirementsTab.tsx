import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, Save, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserRole } from "@/hooks/useUserRole";
import Papa from "papaparse";

interface CityRequirement {
  id?: number;
  ciudad_id: number;
  ciudad_nombre: string;
  ciudad_codigo: string;
  clasificacion: string;
  from_classification_a: number;
  from_classification_b: number;
  from_classification_c: number;
  cliente_id: number;
}

const CityRequirementsTab = () => {
  const { t } = useTranslation();
  const { isSuperAdmin } = useUserRole();
  const [requirements, setRequirements] = useState<CityRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      fetchRequirements(selectedCliente);
    }
  }, [selectedCliente]);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: userData } = await supabase
        .from("usuarios")
        .select("cliente_id")
        .eq("email", user.email)
        .single();

      if (isSuperAdmin()) {
        // Load all clientes for superadmin
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id, codigo, nombre")
          .eq("estado", "activo")
          .order("nombre");
        
        setClientes(clientesData || []);
        if (clientesData && clientesData.length > 0) {
          setSelectedCliente(clientesData[0].id);
        } else {
          setLoading(false);
        }
      } else if (userData?.cliente_id) {
        setSelectedCliente(userData.cliente_id);
      } else {
        toast.error(t('common.no_cliente_assigned'));
        setLoading(false);
      }
    } catch (error) {
      console.error("Error initializing:", error);
      toast.error(t('common.error_loading'));
      setLoading(false);
    }
  };

  const fetchRequirements = async (clienteId: number) => {
    try {
      setLoading(true);

      // Fetch all active cities for the cliente
      const { data: cities, error: citiesError } = await supabase
        .from("ciudades")
        .select("id, codigo, nombre, clasificacion")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("nombre");

      if (citiesError) throw citiesError;

      // Fetch existing requirements (handle 404 gracefully if table doesn't exist yet)
      const { data: existingReqs, error: reqsError } = await supabase
        .from("city_allocation_requirements" as any)
        .select("*")
        .eq("cliente_id", clienteId);

      // If table doesn't exist (404), treat as empty - this allows UI to work before first save
      if (reqsError && reqsError.code !== 'PGRST116') {
        throw reqsError;
      }

      // Merge cities with requirements
      const merged = cities?.map(city => {
        const req = existingReqs?.find((r: any) => r?.ciudad_id === city.id) as any;
        return {
          id: req?.id as number | undefined,
          ciudad_id: city.id,
          ciudad_nombre: city.nombre,
          ciudad_codigo: city.codigo,
          clasificacion: city.clasificacion || "C",
          from_classification_a: req?.from_classification_a || 0,
          from_classification_b: req?.from_classification_b || 0,
          from_classification_c: req?.from_classification_c || 0,
          cliente_id: clienteId,
        };
      }) || [];

      setRequirements(merged);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      toast.error(t('common.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (ciudadId: number, field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) return;

    setRequirements(prev =>
      prev.map(req =>
        req.ciudad_id === ciudadId
          ? { ...req, [field]: numValue }
          : req
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Use upsert to efficiently create/update all requirements in one call
      const dataToSave = requirements.map(req => ({
        cliente_id: req.cliente_id,
        ciudad_id: req.ciudad_id,
        from_classification_a: req.from_classification_a,
        from_classification_b: req.from_classification_b,
        from_classification_c: req.from_classification_c,
      }));

      const { error } = await supabase
        .from("city_allocation_requirements" as any)
        .upsert(dataToSave, { 
          onConflict: 'cliente_id,ciudad_id',
          ignoreDuplicates: false 
        } as any);

      if (error) throw error;

      toast.success(t('common.save_success'));
      if (selectedCliente) fetchRequirements(selectedCliente);
    } catch (error) {
      console.error("Error saving requirements:", error);
      toast.error(t('common.error_saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const csvData = requirements.map(req => ({
      ciudad_codigo: req.ciudad_codigo,
      ciudad_nombre: req.ciudad_nombre,
      clasificacion: req.clasificacion,
      from_A: req.from_classification_a,
      from_B: req.from_classification_b,
      from_C: req.from_classification_c,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `City_Requirements_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success(t('plan_generator.export_success'));
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const imported = results.data as any[];
          setRequirements(prev =>
            prev.map(req => {
              const match = imported.find(
                (imp: any) => imp.ciudad_codigo === req.ciudad_codigo
              );
              if (match) {
                return {
                  ...req,
                  from_classification_a: parseInt(match.from_A) || 0,
                  from_classification_b: parseInt(match.from_B) || 0,
                  from_classification_c: parseInt(match.from_C) || 0,
                };
              }
              return req;
            })
          );
          toast.success(t('plan_generator.import_success'));
        } catch (error) {
          toast.error(t('plan_generator.import_error'));
        }
      },
    });
  };

  if (loading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  if (!selectedCliente) {
    return <div className="text-center py-8">{t('common.select_cliente')}</div>;
  }

  if (requirements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('plan_generator.no_cities_found')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isSuperAdmin() && (
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <label className="text-sm font-medium">{t('common.select_cliente')}:</label>
          <Select
            value={selectedCliente?.toString()}
            onValueChange={(value) => setSelectedCliente(parseInt(value))}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id.toString()}>
                  {cliente.nombre} ({cliente.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{t('plan_generator.city_requirements')}</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t('plan_generator.city_requirements_help')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('plan_generator.export_csv')}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <Upload className="h-4 w-4 mr-2" />
              {t('plan_generator.import_csv')}
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('city.code')}</TableHead>
              <TableHead>{t('city.name')}</TableHead>
              <TableHead>{t('city.classification')}</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {t('plan_generator.from_a')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('plan_generator.from_a_help')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {t('plan_generator.from_b')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('plan_generator.from_b_help')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {t('plan_generator.from_c')}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('plan_generator.from_c_help')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requirements.map((req) => (
              <TableRow key={req.ciudad_id}>
                <TableCell className="font-medium">{req.ciudad_codigo}</TableCell>
                <TableCell>{req.ciudad_nombre}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {req.clasificacion}
                  </span>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={req.from_classification_a}
                    onChange={(e) =>
                      handleValueChange(req.ciudad_id, "from_classification_a", e.target.value)
                    }
                    className="w-24 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={req.from_classification_b}
                    onChange={(e) =>
                      handleValueChange(req.ciudad_id, "from_classification_b", e.target.value)
                    }
                    className="w-24 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    value={req.from_classification_c}
                    onChange={(e) =>
                      handleValueChange(req.ciudad_id, "from_classification_c", e.target.value)
                    }
                    className="w-24 text-center"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CityRequirementsTab;
