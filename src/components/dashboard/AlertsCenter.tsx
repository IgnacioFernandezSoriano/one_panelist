import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, UserX, PackageCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface Alert {
  id: string;
  title: string;
  count: number;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  action: string;
  actionPath: string;
}

interface AlertsCenterProps {
  delayedShipments: number;
  criticalIssues: number;
  inactivePanelists: number;
  pendingConfirmations: number;
}

export function AlertsCenter({
  delayedShipments,
  criticalIssues,
  inactivePanelists,
  pendingConfirmations,
}: AlertsCenterProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const alerts: Alert[] = [
    {
      id: "delayed",
      title: "Envíos Retrasados",
      count: delayedShipments,
      subtitle: "Superan tiempo estándar",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      action: "Ver Detalles",
      actionPath: "/envios",
    },
    {
      id: "critical",
      title: "Incidencias Críticas",
      count: criticalIssues,
      subtitle: "Prioridad alta sin resolver",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      action: "Gestionar",
      actionPath: "/incidencias",
    },
    {
      id: "inactive",
      title: "Panelistas Inactivos",
      count: inactivePanelists,
      subtitle: "Sin actividad reciente",
      icon: UserX,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      action: "Revisar",
      actionPath: "/panelistas",
    },
    {
      id: "pending",
      title: "Pendientes de Confirmación",
      count: pendingConfirmations,
      subtitle: "Enviados sin confirmar",
      icon: PackageCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      action: "Seguimiento",
      actionPath: "/envios",
    },
  ];

  const hasAlerts = alerts.some((alert) => alert.count > 0);

  if (!hasAlerts) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <PackageCheck className="w-5 h-5" />
            Centro de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">
            ✓ No hay alertas críticas en este momento. Todo funciona correctamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Centro de Alertas - Requiere Atención
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {alerts
            .filter((alert) => alert.count > 0)
            .map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${alert.bgColor} border-${alert.color.replace("text-", "")}-200`}
              >
                <div className="flex items-start justify-between mb-2">
                  <alert.icon className={`w-6 h-6 ${alert.color}`} />
                  <span className={`text-2xl font-bold ${alert.color}`}>
                    {alert.count}
                  </span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{alert.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {alert.subtitle}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(alert.actionPath)}
                >
                  {alert.action}
                </Button>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
