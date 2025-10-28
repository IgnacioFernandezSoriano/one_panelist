import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Send, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface Stats {
  totalPanelistas: number;
  panelistasActivos: number;
  totalEnvios: number;
  enviosPendientes: number;
  enviosRecibidos: number;
  totalIncidencias: number;
  incidenciasAbiertas: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalPanelistas: 0,
    panelistasActivos: 0,
    totalEnvios: 0,
    enviosPendientes: 0,
    enviosRecibidos: 0,
    totalIncidencias: 0,
    incidenciasAbiertas: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [panelistas, panelistasActivos, envios, enviosPendientes, enviosRecibidos, incidencias, incidenciasAbiertas] = await Promise.all([
        supabase.from("panelistas").select("id", { count: "exact", head: true }),
        supabase.from("panelistas").select("id", { count: "exact", head: true }).eq("estado", "activo"),
        supabase.from("envios").select("id", { count: "exact", head: true }),
        supabase.from("envios").select("id", { count: "exact", head: true }).eq("estado", "PENDING"),
        supabase.from("envios").select("id", { count: "exact", head: true }).eq("estado", "RECEIVED"),
        supabase.from("incidencias").select("id", { count: "exact", head: true }),
        supabase.from("incidencias").select("id", { count: "exact", head: true }).eq("estado", "abierta"),
      ]);

      setStats({
        totalPanelistas: panelistas.count || 0,
        panelistasActivos: panelistasActivos.count || 0,
        totalEnvios: envios.count || 0,
        enviosPendientes: enviosPendientes.count || 0,
        enviosRecibidos: enviosRecibidos.count || 0,
        totalIncidencias: incidencias.count || 0,
        incidenciasAbiertas: incidenciasAbiertas.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const statCards = [
    {
      title: t('dashboard.total_panelists'),
      value: stats.totalPanelistas,
      subtitle: t('dashboard.active_count', { count: stats.panelistasActivos.toString() }),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t('dashboard.total_allocation_plans'),
      value: stats.totalEnvios,
      subtitle: t('dashboard.pending_count', { count: stats.enviosPendientes.toString() }),
      icon: Send,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: t('dashboard.received_allocations'),
      value: stats.enviosRecibidos,
      subtitle: t('dashboard.successfully_completed'),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t('dashboard.issues'),
      value: stats.totalIncidencias,
      subtitle: t('dashboard.open_count', { count: stats.incidenciasAbiertas.toString() }),
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.allocation_plans_by_status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    <span className="font-medium">{t('status.pending')}</span>
                  </div>
                  <span className="text-2xl font-bold text-warning">{stats.enviosPendientes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="font-medium">{t('status.received')}</span>
                  </div>
                  <span className="text-2xl font-bold text-success">{stats.enviosRecibidos}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.recent_issues')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <span className="font-medium">{t('status.open')}</span>
                  </div>
                  <span className="text-2xl font-bold text-warning">{stats.incidenciasAbiertas}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{t('common.total')}</span>
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">{stats.totalIncidencias}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
