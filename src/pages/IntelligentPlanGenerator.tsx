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
import { PlanDetailsDialog } from "@/components/intelligent-plan/PlanDetailsDialog";

import { generateIntelligentPlan } from "@/lib/planGeneratorAlgorithm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { differenceInWeeks, format } from "date-fns";
import Papa from "papaparse";
import JSZip from "jszip";

export default function IntelligentPlanGenerator() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState<'config' | 'review'>('config');
  const [planConfig, setPlanConfig] = useState<PlanConfiguration | null>(null);
  const [planPreview, setPlanPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [draftPlans, setDraftPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedPlanForMerge, setSelectedPlanForMerge] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<number | null>(null);
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
    
    console.log('[Preview] Starting preview calculation with config:', {
      cliente_id: config.cliente_id,
      carrier_id: config.carrier_id,
      producto_id: config.producto_id,
      start_date: config.start_date,
      end_date: config.end_date,
      total_events: config.total_events,
    });
    
    // Calculate preview
    try {
      // 1. Load city requirements
      const { data: cityReqs, error: cityReqsError } = await supabase
        .from('city_allocation_requirements')
        .select(`
          ciudad_id,
          from_classification_a,
          from_classification_b,
          from_classification_c,
          ciudades (id, nombre, clasificacion)
        `)
        .eq('cliente_id', config.cliente_id);

      if (cityReqsError) {
        console.error('[Preview] Error loading city requirements:', cityReqsError);
        throw cityReqsError;
      }

      console.log('[Preview] City requirements loaded:', {
        count: cityReqs?.length || 0,
        cityReqs: cityReqs?.map(c => ({
          ciudad_id: c.ciudad_id,
          nombre: (c.ciudades as any)?.nombre,
          clasificacion: (c.ciudades as any)?.clasificacion,
        }))
      });

      // 2. Load active nodes for all cities
      const ciudadIds = cityReqs?.map(c => c.ciudad_id) || [];
      
      console.log('[Preview] Loading nodes for cities:', ciudadIds);

      const { data: nodos, error: nodosError } = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad_id,
          estado,
          panelista_id
        `)
        .eq('cliente_id', config.cliente_id)
        .in('ciudad_id', ciudadIds)
        .eq('estado', 'activo');

      if (nodosError) {
        console.error('[Preview] Error loading nodos:', nodosError);
        throw nodosError;
      }

      console.log('[Preview] Nodos loaded:', {
        total: nodos?.length || 0,
        nodos: nodos?.map(n => ({
          codigo: n.codigo,
          ciudad_id: n.ciudad_id,
          estado: n.estado,
          has_panelista: n.panelista_id !== null,
        })),
        byCity: ciudadIds.map(cid => ({
          ciudad_id: cid,
          count: nodos?.filter((n: any) => n.ciudad_id === cid).length || 0,
        }))
      });

      // 3. Count existing events for each node in the date range
      const nodeCodes = nodos?.map((n: any) => n.codigo) || [];
      const { data: existingEvents } = await supabase
        .from('envios')
        .select('nodo_destino')
        .eq('cliente_id', config.cliente_id)
        .gte('fecha_programada', config.start_date.toISOString().split('T')[0])
        .lte('fecha_programada', config.end_date.toISOString().split('T')[0])
        .in('nodo_destino', nodeCodes);

      // Count events per node
      const eventCountByNode = (existingEvents || []).reduce((acc: Record<string, number>, event: any) => {
        acc[event.nodo_destino] = (acc[event.nodo_destino] || 0) + 1;
        return acc;
      }, {});

      console.log('[Preview] Existing events by node:', eventCountByNode);

      const totalWeeks = differenceInWeeks(config.end_date, config.start_date);
      const calculatedEvents = Math.round((config.total_events / 52) * totalWeeks);
      
      // Calculate distribution by cities
      const totalRequirements = cityReqs?.reduce((sum: number, city: any) => 
        sum + city.from_classification_a + city.from_classification_b + city.from_classification_c, 0) || 1;
      
      const cityDistribution = cityReqs?.map((city: any) => {
        const cityEvents = city.from_classification_a + city.from_classification_b + city.from_classification_c;
        const totalCityEvents = Math.round((cityEvents / totalRequirements) * calculatedEvents);
        
        const cityNodesData = nodos?.filter((n: any) => n.ciudad_id === city.ciudad_id) || [];
        const activeNodesCount = cityNodesData.length || 1;
        
        const cityNodos = cityNodesData.map((n: any) => {
          // Calculate new events to be distributed to this node
          const newEvents = Math.round(totalCityEvents / activeNodesCount);
          const existingEvents = eventCountByNode[n.codigo] || 0;
          const totalEvents = existingEvents + newEvents;
          const eventsPerWeek = totalEvents / totalWeeks;
          
          console.log('[Preview] Mapping node for ciudad', city.ciudad_id, ':', {
            codigo: n.codigo,
            ciudad_id: n.ciudad_id,
            has_panelista: n.panelista_id !== null,
            estado: n.estado,
            existingEvents,
            newEvents,
            totalEvents,
            eventsPerWeek,
          });
          
          return {
            codigo: n.codigo,
            has_panelista: n.panelista_id !== null,
            estado: n.estado,
            existing_events: existingEvents,
            new_events: newEvents,
            total_events: totalEvents,
            events_per_week: eventsPerWeek,
          };
        });

        console.log('[Preview] City distribution for', city.ciudades.nombre, ':', {
          ciudad_id: city.ciudad_id,
          nodosCount: cityNodos.length,
          totalCityEvents,
        });

        return {
          ciudad_id: city.ciudad_id,
          ciudad_nombre: city.ciudades.nombre,
          clasificacion: city.ciudades.clasificacion,
          events: totalCityEvents,
          percentage: (cityEvents / totalRequirements) * 100,
          nodos: cityNodos,
        };
      }) || [];

      console.log('[Preview] Final city distribution:', cityDistribution);

      setPlanPreview({
        totalEvents: config.total_events,
        calculatedEvents,
        totalWeeks,
        maxWeeklyCapacity: Math.round(calculatedEvents / totalWeeks),
        cityDistribution,
      });
    } catch (error) {
      console.error("[Preview] Error calculating preview:", error);
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
    try {
      // Recargar el plan con todas sus relaciones para asegurar datos completos
      const { data: fullPlan, error } = await supabase
        .from('generated_allocation_plans' as any)
        .select(`
          *,
          carriers (commercial_name),
          productos_cliente (codigo_producto, nombre_producto)
        `)
        .eq('id', plan.id)
        .single();

      if (error) throw error;
      
      setSelectedPlanForMerge(fullPlan);
      setMergeDialogOpen(true);
    } catch (error: any) {
      console.error("Error loading plan details:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del plan",
        variant: "destructive",
      });
    }
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

  const handleViewDetails = (planId: number) => {
    setSelectedPlanForDetails(planId);
    setDetailsDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('intelligent_plan.title')}</h1>
            <p className="text-muted-foreground">
              {t('intelligent_plan.description')}
            </p>
          </div>
        </div>

        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="config">{t('intelligent_plan.configuration')}</TabsTrigger>
            <TabsTrigger value="review">{t('intelligent_plan.review_plans')}</TabsTrigger>
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
                      {t('intelligent_plan.generating_plan')}
                    </>
                  ) : (
                    t('intelligent_plan.generate_plan')
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-6 space-y-6">
            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">{t('intelligent_plan.loading_plans')}</p>
              </Card>
            ) : (
              <>
                <GeneratedPlansList
                  plans={draftPlans}
                  onMerge={handleMergePlan}
                  onDelete={handleDeletePlan}
                  onExport={handleExportPlan}
                  onViewDetails={handleViewDetails}
                />

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

        <PlanDetailsDialog
          planId={selectedPlanForDetails}
          open={detailsDialogOpen}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedPlanForDetails(null);
          }}
        />
      </div>
    </AppLayout>
  );
}
