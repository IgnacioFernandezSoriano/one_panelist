import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2, HelpCircle } from "lucide-react";
import { PlanConfigurationForm, PlanConfiguration } from "@/components/intelligent-plan/PlanConfigurationForm";
import { PlanPreviewSummary } from "@/components/intelligent-plan/PlanPreviewSummary";
import { UnassignedEventsAlert } from "@/components/intelligent-plan/UnassignedEventsAlert";
import { GeneratedPlansList } from "@/components/intelligent-plan/GeneratedPlansList";
import { PlanMergeDialog } from "@/components/intelligent-plan/PlanMergeDialog";
import { PlanDetailsDialog } from "@/components/intelligent-plan/PlanDetailsDialog";
import { SeasonalityHelpDialog } from "@/components/intelligent-plan/SeasonalityHelpDialog";

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
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

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
        .order('generation_date', { ascending: false });

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
    
    console.log('[Preview] Starting preview calculation with config:', config);
    
    // Calculate preview using same logic as generator
    try {
      // 1. Load classification allocation matrix
      const { data: classificationMatrix, error: matrixError } = await supabase
        .from('classification_allocation_matrix')
        .select('*')
        .eq('cliente_id', config.cliente_id);

      if (matrixError) throw matrixError;

      // 2. Load active cities with classification
      const { data: ciudades, error: ciudadesError } = await supabase
        .from('ciudades')
        .select('id, nombre, clasificacion')
        .eq('cliente_id', config.cliente_id)
        .eq('estado', 'activo');

      if (ciudadesError) throw ciudadesError;

      // 3. Load product seasonality
      const startYear = config.start_date.getFullYear();
      const { data: seasonalityData, error: seasonalityError } = await supabase
        .from('product_seasonality')
        .select('*')
        .eq('cliente_id', config.cliente_id)
        .eq('producto_id', config.producto_id)
        .eq('year', startYear)
        .maybeSingle();

      // Use default values if no seasonality data found
      const defaultPercentage = 8.33;
      const seasonality = {
        january: seasonalityData?.january_percentage || defaultPercentage,
        february: seasonalityData?.february_percentage || defaultPercentage,
        march: seasonalityData?.march_percentage || defaultPercentage,
        april: seasonalityData?.april_percentage || defaultPercentage,
        may: seasonalityData?.may_percentage || defaultPercentage,
        june: seasonalityData?.june_percentage || defaultPercentage,
        july: seasonalityData?.july_percentage || defaultPercentage,
        august: seasonalityData?.august_percentage || defaultPercentage,
        september: seasonalityData?.september_percentage || defaultPercentage,
        october: seasonalityData?.october_percentage || defaultPercentage,
        november: seasonalityData?.november_percentage || defaultPercentage,
        december: seasonalityData?.december_percentage || defaultPercentage,
      };

      // 4. Load active nodes with panelist names
      const ciudadIds = ciudades?.map(c => c.id) || [];
      const { data: nodos, error: nodosError} = await supabase
        .from('nodos')
        .select(`
          codigo,
          ciudad_id,
          estado,
          panelista_id,
          panelistas (nombre_completo)
        `)
        .eq('cliente_id', config.cliente_id)
        .in('ciudad_id', ciudadIds)
        .eq('estado', 'activo');

      if (nodosError) throw nodosError;

      // 5. Count existing events
      const nodeCodes = nodos?.map(n => n.codigo) || [];
      const { data: existingEvents } = await supabase
        .from('envios')
        .select('nodo_destino')
        .eq('cliente_id', config.cliente_id)
        .gte('fecha_programada', config.start_date.toISOString().split('T')[0])
        .lte('fecha_programada', config.end_date.toISOString().split('T')[0])
        .in('nodo_destino', nodeCodes);

      const eventCountByNode = (existingEvents || []).reduce((acc: Record<string, number>, event: any) => {
        acc[event.nodo_destino] = (acc[event.nodo_destino] || 0) + 1;
        return acc;
      }, {});

      // 6. Calculate events using generator's formula
      const startDate = config.start_date;
      const endDate = config.end_date;
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const calculatedEvents = Math.ceil((config.total_events * totalDays) / 365);
      const totalWeeks = differenceInWeeks(endDate, startDate);

      // 7. Distribute by month using seasonality
      const getMonthsInRange = (start: Date, end: Date): Date[] => {
        const months: Date[] = [];
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        while (current <= endMonth) {
          months.push(new Date(current));
          current.setMonth(current.getMonth() + 1);
        }
        return months;
      };

      const months = getMonthsInRange(startDate, endDate);
      const monthlyDistribution: Record<string, number> = {};
      
      months.forEach(month => {
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
        const monthName = month.toLocaleString('en', { month: 'long' }).toLowerCase() as keyof typeof seasonality;
        const percentage = seasonality[monthName] || 8.33;
        
        // Calculate events for the full month based on annual volume and seasonality
        const monthEventsTotal = (config.total_events * percentage) / 100;
        
        // Calculate days in this month that fall within the period
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const periodStart = startDate > monthStart ? startDate : monthStart;
        const periodEnd = endDate < monthEnd ? endDate : monthEnd;
        const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysInMonth = monthEnd.getDate();
        
        // Prorate by days in period
        monthlyDistribution[monthKey] = Math.round((monthEventsTotal * daysInPeriod) / daysInMonth);
        
        console.log(`[Preview] Month ${monthKey}: ${monthEventsTotal.toFixed(1)} events/month × ${daysInPeriod}/${daysInMonth} days = ${monthlyDistribution[monthKey]} events`);
      });

      // 8. Helper to distribute by city and classification (same as generator)
      const distributeByCitiesAndClassification = (monthlyEvents: number) => {
        const result: Record<number, { from_a: number; from_b: number; from_c: number }> = {};
        const citiesByType: Record<string, typeof ciudades> = { A: [], B: [], C: [] };
        
        console.log('[Distribute] Monthly events:', monthlyEvents);
        console.log('[Distribute] Cities:', ciudades);
        console.log('[Distribute] Classification matrix:', classificationMatrix);
        
        ciudades?.forEach(city => {
          const type = city.clasificacion.toUpperCase();
          if (type === 'A' || type === 'B' || type === 'C') {
            citiesByType[type].push(city);
          }
        });
        
        console.log('[Distribute] Cities by type:', citiesByType);

        classificationMatrix?.forEach((matrix: any) => {
          const destType = matrix.destination_classification.toUpperCase();
          const citiesOfType = citiesByType[destType];
          
          console.log(`[Distribute] Processing matrix for type ${destType}:`, matrix);
          console.log(`[Distribute] Cities of type ${destType}:`, citiesOfType);
          
          if (!citiesOfType || citiesOfType.length === 0) {
            console.log(`[Distribute] No cities of type ${destType}, skipping`);
            return;
          }

          const eventsFromA = (monthlyEvents * matrix.percentage_from_a) / 100;
          const eventsFromB = (monthlyEvents * matrix.percentage_from_b) / 100;
          const eventsFromC = (monthlyEvents * matrix.percentage_from_c) / 100;
          
          console.log(`[Distribute] Events from A/B/C: ${eventsFromA}/${eventsFromB}/${eventsFromC}`);
          
          const totalEventsForType = eventsFromA + eventsFromB + eventsFromC;
          const eventsPerCity = totalEventsForType / citiesOfType.length;
          
          console.log(`[Distribute] Total events for type: ${totalEventsForType}, per city: ${eventsPerCity}`);

          citiesOfType.forEach(city => {
            result[city.id] = {
              from_a: Math.ceil(eventsPerCity * (eventsFromA / totalEventsForType)),
              from_b: Math.ceil(eventsPerCity * (eventsFromB / totalEventsForType)),
              from_c: Math.ceil(eventsPerCity * (eventsFromC / totalEventsForType)),
            };
            console.log(`[Distribute] City ${city.nombre} (${city.id}):`, result[city.id]);
          });
        });
        
        console.log('[Distribute] Final result:', result);

        return result;
      };

      // 9. Helper to fill nodes sequentially considering existing events
      const fillNodesSequentially = (
        cityNodes: any[],
        totalNewEvents: number,
        maxEventsPerWeek: number,
        eventCountByNode: Record<string, number>
      ): { newEvents: Record<string, number>, totalEvents: Record<string, number> } => {
        const nodeAssignment: Record<string, number> = {};
        cityNodes.forEach(n => { nodeAssignment[n.codigo] = 0; });
        
        // Calculate total capacity per node based on the number of weeks in the period
        const maxEventsPerNode = Math.ceil(maxEventsPerWeek * Math.max(totalWeeks, 1));
        
        const sortedNodes = [...cityNodes].sort((a, b) => a.codigo.localeCompare(b.codigo));
        let remaining = totalNewEvents;
        let nodeIndex = 0;

        // First pass: try to respect capacity limits
        let attempts = 0;
        while (remaining > 0 && nodeIndex < sortedNodes.length && attempts < sortedNodes.length) {
          const node = sortedNodes[nodeIndex];
          const existingEvents = eventCountByNode[node.codigo] || 0;
          const currentAssigned = nodeAssignment[node.codigo];
          const totalAfterAssignment = existingEvents + currentAssigned + 1;
          
          if (totalAfterAssignment <= maxEventsPerNode) {
            nodeAssignment[node.codigo]++;
            remaining--;
            attempts = 0; // Reset attempts when progress is made
          } else {
            nodeIndex++;
            attempts++;
          }
        }

        // Second pass: assign remaining events even if exceeding capacity
        // This ensures ALL events are assigned, user can adjust manually later
        nodeIndex = 0;
        while (remaining > 0) {
          const node = sortedNodes[nodeIndex % sortedNodes.length];
          nodeAssignment[node.codigo]++;
          remaining--;
          nodeIndex++;
        }

        // Calculate totals
        const newEvents: Record<string, number> = {};
        const totalEvents: Record<string, number> = {};
        cityNodes.forEach(n => {
          const existing = eventCountByNode[n.codigo] || 0;
          const assigned = nodeAssignment[n.codigo] || 0;
          newEvents[n.codigo] = assigned;
          totalEvents[n.codigo] = existing + assigned;
        });

        return { newEvents, totalEvents };
      };

      // 10. Calculate distribution per city
      const cityTotals: Record<number, number> = {};
      const nodeAssignments: Record<string, number> = {};

      console.log('[Preview] Monthly distribution:', monthlyDistribution);
      console.log('[Preview] Total calculated events:', calculatedEvents);

      for (const [monthKey, monthEvents] of Object.entries(monthlyDistribution)) {
        const monthlyCityDistribution = distributeByCitiesAndClassification(monthEvents);
        console.log(`[Preview] Month ${monthKey}: ${monthEvents} events, distribution:`, monthlyCityDistribution);

        for (const [ciudadIdStr, allocation] of Object.entries(monthlyCityDistribution)) {
          const ciudadId = parseInt(ciudadIdStr);
          const cityTotal = allocation.from_a + allocation.from_b + allocation.from_c;
          cityTotals[ciudadId] = (cityTotals[ciudadId] || 0) + cityTotal;

          const cityNodes = nodos?.filter(n => n.ciudad_id === ciudadId) || [];
          console.log(`[Preview] City ${ciudadId}: ${cityTotal} events, ${cityNodes.length} nodes`);
          
          if (cityNodes.length > 0) {
            const { newEvents } = fillNodesSequentially(cityNodes, cityTotal, config.max_events_per_week, eventCountByNode);
            console.log(`[Preview] New events for city ${ciudadId}:`, newEvents);
            
            for (const [codigo, events] of Object.entries(newEvents)) {
              nodeAssignments[codigo] = (nodeAssignments[codigo] || 0) + events;
            }
          }
        }
      }

      console.log('[Preview] Final node assignments:', nodeAssignments);
      console.log('[Preview] City totals:', cityTotals);

      // 11. Build city distribution for UI
      const cityDistribution = ciudades?.map(city => {
        const totalCityEvents = cityTotals[city.id] || 0;
        const cityNodes = nodos?.filter(n => n.ciudad_id === city.id) || [];
        
        const cityNodos = cityNodes.map(n => {
          const newEvents = nodeAssignments[n.codigo] || 0;
          const existingEventsCount = eventCountByNode[n.codigo] || 0;
          const totalEvents = existingEventsCount + newEvents;
          const eventsPerWeek = totalWeeks > 0 ? totalEvents / totalWeeks : 0;

          const panelistaName = (n as any).panelistas?.nombre_completo || null;

          return {
            codigo: n.codigo,
            has_panelista: n.panelista_id !== null,
            panelista_name: panelistaName,
            estado: n.estado,
            existing_events: existingEventsCount,
            new_events: newEvents,
            total_events: totalEvents,
            events_per_week: eventsPerWeek,
            exceeds_capacity: totalEvents > config.max_events_per_week,
          };
        });

        const totalEvents = cityTotals[city.id] || 0;
        const percentage = calculatedEvents > 0 ? (totalEvents / calculatedEvents) * 100 : 0;

        return {
          ciudad_id: city.id,
          ciudad_nombre: city.nombre,
          clasificacion: city.clasificacion,
          events: totalEvents,
          percentage,
          nodos: cityNodos,
        };
      }) || [];

      setPlanPreview({
        totalEvents: config.total_events,
        calculatedEvents,
        totalWeeks,
        maxWeeklyCapacity: config.max_events_per_week,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Intelligent Allocation Plan Generator</h1>
              <p className="text-muted-foreground">
                Create optimized allocation plans based on city distribution, product seasonality, and network topology
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="default"
            onClick={() => setHelpDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <HelpCircle className="h-5 w-5" />
            {t('intelligent_plan.help_calculation')}
          </Button>
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

        <SeasonalityHelpDialog 
          open={helpDialogOpen} 
          onOpenChange={setHelpDialogOpen} 
        />
      </div>
    </AppLayout>
  );
}
