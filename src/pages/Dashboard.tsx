import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { AlertsCenter } from "@/components/dashboard/AlertsCenter";
import { KPICard } from "@/components/dashboard/KPICard";
import { PerformanceByCarrier } from "@/components/dashboard/PerformanceByCarrier";
import { PerformanceByProduct } from "@/components/dashboard/PerformanceByProduct";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { TopPerformers } from "@/components/dashboard/TopPerformers";
import { QuickSummary } from "@/components/dashboard/QuickSummary";
import { TrendingUp, Clock, AlertTriangle, Users } from "lucide-react";

interface DashboardData {
  // Alertas
  delayedShipments: number;
  criticalIssues: number;
  inactivePanelists: number;
  pendingConfirmations: number;

  // KPIs
  onTimeDeliveryRate: number;
  onTimeDeliveryChange: number;
  avgDeliveryTime: number;
  avgDeliveryTimeChange: number;
  incidentRate: number;
  incidentRateChange: number;
  panelistUtilization: number;

  // Análisis dimensional
  carrierPerformance: Array<{ name: string; successRate: number; total: number }>;
  productPerformance: Array<{ name: string; successRate: number; total: number }>;

  // Tendencias
  trendData: Array<{ date: string; volume: number; successRate: number }>;

  // Top performers
  topPerformers: Array<{ id: string; name: string; shipments: number; successRate: number }>;
  needsAttention: Array<{ id: string; name: string; shipments: number; successRate: number; reason?: string }>;

  // Resumen operativo
  thisWeekShipments: number;
  nextWeekShipments: number;
  inTransitShipments: number;
  pendingShipments: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    delayedShipments: 0,
    criticalIssues: 0,
    inactivePanelists: 0,
    pendingConfirmations: 0,
    onTimeDeliveryRate: 0,
    onTimeDeliveryChange: 0,
    avgDeliveryTime: 0,
    avgDeliveryTimeChange: 0,
    incidentRate: 0,
    incidentRateChange: 0,
    panelistUtilization: 0,
    carrierPerformance: [],
    productPerformance: [],
    trendData: [],
    topPerformers: [],
    needsAttention: [],
    thisWeekShipments: 0,
    nextWeekShipments: 0,
    inTransitShipments: 0,
    pendingShipments: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Cargar datos en paralelo
      const [
        alertsData,
        kpiData,
        carrierData,
        productData,
        trendsData,
        performersData,
        summaryData,
      ] = await Promise.all([
        loadAlertsData(),
        loadKPIData(),
        loadCarrierPerformance(),
        loadProductPerformance(),
        loadTrendData(),
        loadPerformersData(),
        loadSummaryData(),
      ]);

      setData({
        ...alertsData,
        ...kpiData,
        carrierPerformance: carrierData,
        productPerformance: productData,
        trendData: trendsData,
        ...performersData,
        ...summaryData,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlertsData = async () => {
    // Envíos retrasados: envíos en estado SENT que superan el tiempo estándar
    const { data: delayed } = await supabase
      .from("envios")
      .select("id, fecha_programada, producto_id")
      .eq("estado", "SENT")
      .lt("fecha_programada", new Date().toISOString());

    // Incidencias críticas: prioridad alta y estado abierta
    const { data: critical } = await supabase
      .from("incidencias")
      .select("id")
      .eq("prioridad", "alta")
      .eq("estado", "abierta");

    // Panelistas inactivos: sin envíos en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: allPanelists } = await supabase
      .from("panelistas")
      .select("id")
      .eq("estado", "activo");

    const { data: activePanelists } = await supabase
      .from("envios")
      .select("panelista_origen_id, panelista_destino_id")
      .gte("fecha_programada", thirtyDaysAgo.toISOString());

    const activePanelistIds = new Set([
      ...(activePanelists?.map((e) => e.panelista_origen_id) || []),
      ...(activePanelists?.map((e) => e.panelista_destino_id) || []),
    ]);

    const inactivePanelists = allPanelists?.filter(
      (p) => !activePanelistIds.has(p.id)
    ).length || 0;

    // Pendientes de confirmación: enviados pero no recibidos
    const { data: pending } = await supabase
      .from("envios")
      .select("id")
      .eq("estado", "SENT");

    return {
      delayedShipments: delayed?.length || 0,
      criticalIssues: critical?.length || 0,
      inactivePanelists,
      pendingConfirmations: pending?.length || 0,
    };
  };

  const loadKPIData = async () => {
    // Tasa de entrega a tiempo
    const { data: deliveredShipments } = await supabase
      .from("envios")
      .select("fecha_programada, fecha_recepcion_real")
      .eq("estado", "RECEIVED")
      .not("fecha_recepcion_real", "is", null);

    const onTimeCount = deliveredShipments?.filter((s) => {
      const scheduled = new Date(s.fecha_programada);
      const received = new Date(s.fecha_recepcion_real!);
      // Asumimos 2 días como estándar
      scheduled.setDate(scheduled.getDate() + 2);
      return received <= scheduled;
    }).length || 0;

    const onTimeRate = deliveredShipments?.length
      ? Math.round((onTimeCount / deliveredShipments.length) * 100)
      : 0;

    // Tiempo promedio de entrega
    const avgTime = deliveredShipments?.length
      ? deliveredShipments.reduce((acc, s) => {
          const scheduled = new Date(s.fecha_programada);
          const received = new Date(s.fecha_recepcion_real!);
          const diff = (received.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24);
          return acc + diff;
        }, 0) / deliveredShipments.length
      : 0;

    // Tasa de incidencias
    const { count: allShipmentsCount } = await supabase
      .from("envios")
      .select("id", { count: "exact", head: true });

    const { data: shipmentsWithIssues } = await supabase
      .from("incidencias")
      .select("envio_id")
      .not("envio_id", "is", null);

    const uniqueShipmentsWithIssues = new Set(
      shipmentsWithIssues?.map((i) => i.envio_id)
    ).size;

    const incidentRate = allShipmentsCount
      ? Math.round((uniqueShipmentsWithIssues / allShipmentsCount) * 100 * 10) / 10
      : 0;

    // Utilización de panelistas (simplificado)
    const { count: panelistsCount } = await supabase
      .from("panelistas")
      .select("id", { count: "exact", head: true })
      .eq("estado", "activo");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentShipments } = await supabase
      .from("envios")
      .select("panelista_origen_id, panelista_destino_id")
      .gte("fecha_programada", sevenDaysAgo.toISOString());

    const assignedPanelists = new Set([
      ...(recentShipments?.map((e) => e.panelista_origen_id) || []),
      ...(recentShipments?.map((e) => e.panelista_destino_id) || []),
    ]);

    const utilization = panelistsCount
      ? Math.round((assignedPanelists.size / panelistsCount) * 100)
      : 0;

    return {
      onTimeDeliveryRate: onTimeRate,
      onTimeDeliveryChange: 2.3, // Simulado - requeriría comparación con período anterior
      avgDeliveryTime: Math.round(avgTime * 10) / 10,
      avgDeliveryTimeChange: -0.3, // Simulado
      incidentRate,
      incidentRateChange: 0.5, // Simulado
      panelistUtilization: utilization,
    };
  };

  const loadCarrierPerformance = async () => {
    const { data: shipments } = await supabase
      .from("envios")
      .select(`
        id,
        estado,
        fecha_programada,
        fecha_recepcion_real,
        carriers (
          commercial_name
        )
      `)
      .eq("estado", "RECEIVED")
      .not("fecha_recepcion_real", "is", null);

    const carrierStats: Record<string, { total: number; onTime: number }> = {};

    shipments?.forEach((s: any) => {
      const carrierName = s.carriers?.commercial_name || "Desconocido";
      if (!carrierStats[carrierName]) {
        carrierStats[carrierName] = { total: 0, onTime: 0 };
      }
      carrierStats[carrierName].total++;

      const scheduled = new Date(s.fecha_programada);
      const received = new Date(s.fecha_recepcion_real);
      scheduled.setDate(scheduled.getDate() + 2);
      if (received <= scheduled) {
        carrierStats[carrierName].onTime++;
      }
    });

    return Object.entries(carrierStats).map(([name, stats]) => ({
      name,
      successRate: Math.round((stats.onTime / stats.total) * 100),
      total: stats.total,
    }));
  };

  const loadProductPerformance = async () => {
    const { data: shipments } = await supabase
      .from("envios")
      .select(`
        id,
        estado,
        fecha_programada,
        fecha_recepcion_real,
        productos (
          nombre_producto
        )
      `)
      .eq("estado", "RECEIVED")
      .not("fecha_recepcion_real", "is", null);

    const productStats: Record<string, { total: number; onTime: number }> = {};

    shipments?.forEach((s: any) => {
      const productName = s.productos?.nombre_producto || "Desconocido";
      if (!productStats[productName]) {
        productStats[productName] = { total: 0, onTime: 0 };
      }
      productStats[productName].total++;

      const scheduled = new Date(s.fecha_programada);
      const received = new Date(s.fecha_recepcion_real);
      scheduled.setDate(scheduled.getDate() + 2);
      if (received <= scheduled) {
        productStats[productName].onTime++;
      }
    });

    return Object.entries(productStats).map(([name, stats]) => ({
      name,
      successRate: Math.round((stats.onTime / stats.total) * 100),
      total: stats.total,
    }));
  };

  const loadTrendData = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: shipments } = await supabase
      .from("envios")
      .select("fecha_programada, fecha_recepcion_real, estado")
      .gte("fecha_programada", thirtyDaysAgo.toISOString())
      .order("fecha_programada");

    const dailyStats: Record<string, { volume: number; onTime: number; total: number }> = {};

    shipments?.forEach((s) => {
      const date = new Date(s.fecha_programada).toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { volume: 0, onTime: 0, total: 0 };
      }
      dailyStats[date].volume++;

      if (s.estado === "RECEIVED" && s.fecha_recepcion_real) {
        dailyStats[date].total++;
        const scheduled = new Date(s.fecha_programada);
        const received = new Date(s.fecha_recepcion_real);
        scheduled.setDate(scheduled.getDate() + 2);
        if (received <= scheduled) {
          dailyStats[date].onTime++;
        }
      }
    });

    return Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      volume: stats.volume,
      successRate: stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 100,
    }));
  };

  const loadPerformersData = async () => {
    const { data: panelists } = await supabase
      .from("panelistas")
      .select("id, nombre_completo")
      .eq("estado", "activo");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: shipments } = await supabase
      .from("envios")
      .select("panelista_origen_id, panelista_destino_id, estado, fecha_programada, fecha_recepcion_real")
      .gte("fecha_programada", thirtyDaysAgo.toISOString());

    const panelistStats: Record<string, { shipments: number; onTime: number; total: number }> = {};

    shipments?.forEach((s) => {
      [s.panelista_origen_id, s.panelista_destino_id].forEach((pId) => {
        if (pId) {
          if (!panelistStats[pId]) {
            panelistStats[pId] = { shipments: 0, onTime: 0, total: 0 };
          }
          panelistStats[pId].shipments++;

          if (s.estado === "RECEIVED" && s.fecha_recepcion_real) {
            panelistStats[pId].total++;
            const scheduled = new Date(s.fecha_programada);
            const received = new Date(s.fecha_recepcion_real);
            scheduled.setDate(scheduled.getDate() + 2);
            if (received <= scheduled) {
              panelistStats[pId].onTime++;
            }
          }
        }
      });
    });

    const panelistsWithStats = panelists?.map((p) => {
      const stats = panelistStats[p.id] || { shipments: 0, onTime: 0, total: 0 };
      return {
        id: p.id.toString(),
        name: p.nombre_completo,
        shipments: stats.shipments,
        successRate: stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0,
      };
    }) || [];

    const sorted = panelistsWithStats
      .filter((p) => p.shipments > 0)
      .sort((a, b) => b.successRate - a.successRate || b.shipments - a.shipments);

    const topPerformers = sorted.slice(0, 5);
    const needsAttention = sorted
      .filter((p) => p.successRate < 80 && p.shipments >= 5)
      .slice(0, 3)
      .map((p) => ({
        ...p,
        reason: p.successRate < 70 ? "Retrasos frecuentes" : "Bajo % de éxito",
      }));

    return { topPerformers, needsAttention };
  };

  const loadSummaryData = async () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

    const [thisWeek, nextWeek, inTransit, pending] = await Promise.all([
      supabase
        .from("envios")
        .select("id", { count: "exact", head: true })
        .gte("fecha_programada", startOfWeek.toISOString())
        .lte("fecha_programada", endOfWeek.toISOString()),
      supabase
        .from("envios")
        .select("id", { count: "exact", head: true })
        .gte("fecha_programada", startOfNextWeek.toISOString())
        .lte("fecha_programada", endOfNextWeek.toISOString()),
      supabase
        .from("envios")
        .select("id", { count: "exact", head: true })
        .eq("estado", "SENT"),
      supabase
        .from("envios")
        .select("id", { count: "exact", head: true })
        .eq("estado", "PENDING"),
    ]);

    return {
      thisWeekShipments: thisWeek.count || 0,
      nextWeekShipments: nextWeek.count || 0,
      inTransitShipments: inTransit.count || 0,
      pendingShipments: pending.count || 0,
    };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard de Gestión
          </h1>
          <p className="text-muted-foreground">
            Visión completa del rendimiento operativo y calidad postal
          </p>
        </div>

        {/* Sección 1: Centro de Alertas */}
        <AlertsCenter
          delayedShipments={data.delayedShipments}
          criticalIssues={data.criticalIssues}
          inactivePanelists={data.inactivePanelists}
          pendingConfirmations={data.pendingConfirmations}
        />

        {/* Sección 2: KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Tasa de Entrega a Tiempo"
            value={data.onTimeDeliveryRate}
            unit="%"
            change={data.onTimeDeliveryChange}
            target={90}
            targetLabel="Objetivo"
            icon={TrendingUp}
            color="text-green-600"
            bgColor="bg-green-50"
            trendData={[85, 86, 87, 88, 87, 88, data.onTimeDeliveryRate]}
          />
          <KPICard
            title="Tiempo Promedio de Entrega"
            value={data.avgDeliveryTime}
            unit=" días"
            change={data.avgDeliveryTimeChange}
            target={2.5}
            targetLabel="Estándar"
            icon={Clock}
            color="text-blue-600"
            bgColor="bg-blue-50"
            trendData={[3.1, 3.0, 2.9, 2.9, 2.8, 2.8, data.avgDeliveryTime]}
          />
          <KPICard
            title="Tasa de Incidencias"
            value={data.incidentRate}
            unit="%"
            change={data.incidentRateChange}
            target={2}
            targetLabel="Objetivo"
            icon={AlertTriangle}
            color="text-orange-600"
            bgColor="bg-orange-50"
            trendData={[2.5, 2.7, 2.8, 3.0, 3.2, 3.1, data.incidentRate]}
          />
          <KPICard
            title="Utilización de Panelistas"
            value={data.panelistUtilization}
            unit="%"
            icon={Users}
            color="text-purple-600"
            bgColor="bg-purple-50"
            trendData={[65, 66, 67, 68, 67, 68, data.panelistUtilization]}
          />
        </div>

        {/* Sección 3: Análisis por Dimensiones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceByCarrier data={data.carrierPerformance} />
          <PerformanceByProduct data={data.productPerformance} />
        </div>

        {/* Sección 4: Tendencias Temporales */}
        <TrendChart data={data.trendData} targetRate={90} />

        {/* Sección 5: Top Performers */}
        <TopPerformers
          topPerformers={data.topPerformers}
          needsAttention={data.needsAttention}
        />

        {/* Sección 6: Resumen Operativo */}
        <QuickSummary
          thisWeek={data.thisWeekShipments}
          nextWeek={data.nextWeekShipments}
          inTransit={data.inTransitShipments}
          pending={data.pendingShipments}
        />
      </div>
    </AppLayout>
  );
}
