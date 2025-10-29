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
    if (user) {
      setUserId(parseInt(user.id));
    }
  };

  const loadDraftPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generated_allocation_plans')
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

  const handleConfigSubmit = (config: PlanConfiguration) => {
    setPlanConfig(config);
    setCurrentTab('review');
  };

  const handleGeneratePlan = async () => {
    if (!planConfig || !userId) return;

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
        .from('generated_allocation_plans')
        .select(`
          *,
          carriers (id, commercial_name),
          productos_cliente (id, codigo_producto),
          generated_allocation_plan_details (*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;

      const csvRows = plan.generated_allocation_plan_details.map((detail: any) => ({
        carrier_id: plan.carrier_id,
        carrier_name: plan.carriers.commercial_name,
        producto_id: plan.producto_id,
        producto_code: plan.productos_cliente.codigo_producto,
        nodo_origen: detail.nodo_origen,
        nodo_destino: detail.nodo_destino,
        fecha_programada: detail.fecha_programada,
        motivo_creacion: 'programado',
        estado: 'PENDING',
        observaciones: `Generated on ${format(new Date(plan.created_at), 'yyyy-MM-dd')}`,
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
        .from('generated_allocation_plans')
        .select(`
          *,
          carriers (commercial_name),
          productos_cliente (codigo_producto),
          generated_allocation_plan_details (*)
        `)
        .eq('id', selectedPlanForMerge.id)
        .single();

      if (!plan) throw new Error("Plan not found");

      // Replace strategy: delete existing PENDING events
      if (plan.merge_strategy === 'replace') {
        await supabase
          .from('envios')
          .delete()
          .eq('cliente_id', plan.cliente_id)
          .eq('carrier_id', plan.carrier_id)
          .eq('producto_id', plan.producto_id)
          .eq('estado', 'PENDING');
      }

      // Insert new events
      const enviosData = plan.generated_allocation_plan_details.map((detail: any) => ({
        cliente_id: plan.cliente_id,
        carrier_id: plan.carrier_id,
        carrier_name: plan.carriers.commercial_name,
        producto_id: plan.producto_id,
        tipo_producto: plan.productos_cliente.codigo_producto,
        nodo_origen: detail.nodo_origen,
        nodo_destino: detail.nodo_destino,
        fecha_programada: detail.fecha_programada,
        motivo_creacion: 'programado',
        estado: 'PENDING',
        observaciones: `Generated from intelligent plan #${plan.id}`,
      }));

      const { error: insertError } = await supabase
        .from('envios')
        .insert(enviosData);

      if (insertError) throw insertError;

      // Mark plan as merged
      await supabase
        .from('generated_allocation_plans')
        .update({ status: 'merged', merged_at: new Date().toISOString() })
        .eq('id', plan.id);

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
        .from('generated_allocation_plans')
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
                onCancel={() => setPlanConfig(null)}
              />
            </Card>

            {planConfig && (
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
