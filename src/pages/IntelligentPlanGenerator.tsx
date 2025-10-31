import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2 } from "lucide-react";
import { PlanConfigurationForm, PlanConfiguration } from "@/components/intelligent-plan/PlanConfigurationForm";
import { PlanPreviewSummary } from "@/components/intelligent-plan/PlanPreviewSummary";
import { UnassignedEventsAlert } from "@/components/intelligent-plan/UnassignedEventsAlert";
import { GeneratedPlansList } from "@/components/intelligent-plan/GeneratedPlansList";
import { PlanMergeDialog } from "@/components/intelligent-plan/PlanMergeDialog";
import { ImportModifiedPlanCSV } from "@/components/intelligent-plan/ImportModifiedPlanCSV";
import { generateIntelligentPlan } from "@/lib/planGeneratorAlgorithm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInWeeks, format } from "date-fns";
import Papa from "papaparse";
import JSZip from "jszip";

export default function IntelligentPlanGenerator() {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState<'config' | 'review'>('config');
  const [planConfig, setPlanConfig] = useState<PlanConfiguration | null>(null);
  const [planPreview, setPlanPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [draftPlans, setDraftPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedPlanForMerge, setSelectedPlanForMerge] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    initializeUser();
    loadDraftPlans();
  }, []);

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (!error && usuario?.id) {
        setUserId(usuario.id);
      }
    }
  };

  const loadDraftPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_allocation_plans' as any)
        .select(`
          *,
          carriers (commercial_name),
          productos_cliente (codigo_producto, nombre_producto)
        `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDraftPlans(data || []);
    } catch (error: any) {
      console.error("Error loading draft plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSubmit = async (config: PlanConfiguration) => {
    setPlanConfig(config);
    
    // Calculate preview
    try {
      const { data: cityReqs } = await supabase
        .from('city_allocation_requirements')
        .select(`
          ciudad_id,
          from_classification_a,
          from_classification_b,
          from_classification_c,
          ciudades (id, nombre, clasificacion)
        `)
        .eq('cliente_id', config.cliente_id);

      // Load active nodes for all cities
      const ciudadIds = cityReqs?.map(c => c.ciudad_id) || [];
      const { data: nodos } = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad_id,
          estado,
          panelistas (nombre_completo)
        `)
        .eq('cliente_id', config.cliente_id)
        .in('ciudad_id', ciudadIds)
        .eq('estado', 'activo');

      const totalWeeks = differenceInWeeks(config.end_date, config.start_date);
      const calculatedEvents = Math.round((config.total_events / 52) * totalWeeks);
      
      // Calculate distribution by cities
      const totalRequirements = cityReqs?.reduce((sum: number, city: any) => 
        sum + city.from_classification_a + city.from_classification_b + city.from_classification_c, 0) || 1;
      
      const cityDistribution = cityReqs?.map((city: any) => {
        const cityEvents = city.from_classification_a + city.from_classification_b + city.from_classification_c;
        const cityNodos = nodos?.filter((n: any) => n.ciudad_id === city.ciudad_id).map((n: any) => ({
          codigo: n.codigo,
          panelista_nombre: n.panelistas?.nombre_completo || null,
          estado: n.estado,
        })) || [];

        return {
          ciudad_id: city.ciudad_id,
          ciudad_nombre: city.ciudades.nombre,
          clasificacion: city.ciudades.clasificacion,
          events: Math.round((cityEvents / totalRequirements) * calculatedEvents),
          percentage: (cityEvents / totalRequirements) * 100,
          nodos: cityNodos,
        };
      }) || [];

      setPlanPreview({
        totalEvents: config.total_events,
        calculatedEvents,
        totalWeeks,
        maxWeeklyCapacity: Math.round(calculatedEvents / totalWeeks),
        cityDistribution,
      });
    } catch (error) {
      console.error("Error calculating preview:", error);
      toast({
        title: "Preview Error",
        description: "Could not calculate plan preview",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePlan = async () => {
    if (!planConfig) return;

    if (!userId || Number.isNaN(userId)) {
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      await generateIntelligentPlan({
        ...planConfig,
        created_by: userId,
      });

      toast({
        title: "Plan generated successfully",
        description: "Your allocation plan has been generated and saved as draft",
      });

      setPlanConfig(null);
      setPlanPreview(null);
      setCurrentTab('review');
      await loadDraftPlans();
    } catch (error: any) {
      console.error("Error generating plan:", error);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPlan = async (planId: number) => {
    try {
      const { data: plan, error } = await supabase
        .from('generated_allocation_plans' as any)
        .select(`
          *,
          carriers (id, commercial_name),
          productos_cliente (id, codigo_producto),
          generated_allocation_plan_details (*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      const csvRows = (plan as any).generated_allocation_plan_details.map((detail: any) => ({
        carrier_id: (plan as any).carrier_id,
        carrier_name: (plan as any).carriers.commercial_name,
        producto_id: (plan as any).producto_id,
        producto_code: (plan as any).productos_cliente.codigo_producto,
        nodo_origen: detail.nodo_origen,
        nodo_destino: detail.nodo_destino,
        fecha_programada: detail.fecha_programada,
        motivo_creacion: 'programado',
        estado: 'PENDING',
        observaciones: `Generated on ${format(new Date((plan as any).created_at), 'yyyy-MM-dd')}`,
      }));

      const csv = Papa.unparse(csvRows);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `allocation-plan-${planId}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Plan exported to CSV",
      });
    } catch (error: any) {
      console.error("Error exporting plan:", error);
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMergePlan = async (plan: any) => {
    setSelectedPlanForMerge(plan);
    setMergeDialogOpen(true);
  };

  const confirmMerge = async () => {
    if (!selectedPlanForMerge) return;

    try {
      const { data: plan } = await supabase
        .from('generated_allocation_plans' as any)
        .select(`
          *,
          carriers (commercial_name),
          productos_cliente (codigo_producto),
          generated_allocation_plan_details (*)
        `)
        .eq('id', selectedPlanForMerge.id)
        .single();

      if (!plan) throw new Error("Plan not found");

      const planData = plan as any;

      // Replace strategy: delete existing PENDING events
      if (planData.merge_strategy === 'replace') {
        await supabase
          .from('envios')
          .delete()
          .eq('cliente_id', planData.cliente_id)
          .eq('carrier_id', planData.carrier_id)
          .eq('producto_id', planData.producto_id)
          .eq('estado', 'PENDING');
      }

      // Insert new events
      const enviosData = planData.generated_allocation_plan_details.map((detail: any) => ({
        cliente_id: planData.cliente_id,
        carrier_id: planData.carrier_id,
        carrier_name: planData.carriers.commercial_name,
        producto_id: planData.producto_id,
        tipo_producto: planData.productos_cliente.codigo_producto,
        nodo_origen: detail.nodo_origen,
        nodo_destino: detail.nodo_destino,
        fecha_programada: detail.fecha_programada,
        motivo_creacion: 'programado',
        estado: 'PENDING',
        observaciones: `Generated from intelligent plan #${planData.id}`,
      }));

      const { error: insertError } = await supabase
        .from('envios')
        .insert(enviosData);

      if (insertError) throw insertError;

      // Mark plan as merged
      await supabase
        .from('generated_allocation_plans' as any)
        .update({ status: 'merged', merged_at: new Date().toISOString() })
        .eq('id', planData.id);

      toast({
        title: "Plan merged successfully",
        description: `${enviosData.length} events added to allocation plan`,
      });

      setMergeDialogOpen(false);
      setSelectedPlanForMerge(null);
      await loadDraftPlans();
    } catch (error: any) {
      console.error("Error merging plan:", error);
      toast({
        title: "Merge failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm("Are you sure you want to delete this draft plan?")) return;

    try {
      await supabase
        .from('generated_allocation_plans' as any)
        .delete()
        .eq('id', planId);

      toast({
        title: "Plan deleted",
        description: "Draft plan has been deleted",
      });

      await loadDraftPlans();
    } catch (error: any) {
      console.error("Error deleting plan:", error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Intelligent Plan Generator</h1>
            <p className="text-muted-foreground">
              Generate allocation plans using AI-powered distribution
            </p>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="review">Review Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <Card className="p-6">
              <PlanConfigurationForm
                initialConfig={planConfig || undefined}
                onSubmit={handleConfigSubmit}
                onCancel={() => {
                  setPlanConfig(null);
                  setPlanPreview(null);
                }}
              />
            </Card>

            {planPreview && (
              <div className="mt-6">
                <PlanPreviewSummary {...planPreview} />
              </div>
            )}

            {planConfig && planPreview && (
              <div className="mt-6 space-y-4">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  size="lg"
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Plan...
                    </>
                  ) : (
                    'Generate Plan'
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-6 space-y-6">
            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading draft plans...</p>
              </Card>
            ) : (
              <>
                <GeneratedPlansList
                  plans={draftPlans}
                  onMerge={handleMergePlan}
                  onDelete={handleDeletePlan}
                  onExport={handleExportPlan}
                />

                {draftPlans.length > 0 && draftPlans[0] && (
                  <ImportModifiedPlanCSV
                    planId={draftPlans[0].id}
                    onSuccess={loadDraftPlans}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <PlanMergeDialog
          open={mergeDialogOpen}
          plan={selectedPlanForMerge}
          onConfirm={confirmMerge}
          onCancel={() => {
            setMergeDialogOpen(false);
            setSelectedPlanForMerge(null);
          }}
        />
      </div>
    </AppLayout>
  );
}
