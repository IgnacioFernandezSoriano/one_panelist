import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CalendarCheck, Package, PackageCheck } from "lucide-react";

interface QuickSummaryProps {
  thisWeek: number;
  nextWeek: number;
  inTransit: number;
  pending: number;
}

export function QuickSummary({
  thisWeek,
  nextWeek,
  inTransit,
  pending,
}: QuickSummaryProps) {
  const items = [
    {
      icon: Calendar,
      label: "Esta Semana",
      value: thisWeek,
      sublabel: "planificados",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: CalendarCheck,
      label: "Próxima Semana",
      value: nextWeek,
      sublabel: "planificados",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      icon: Package,
      label: "En Tránsito",
      value: inTransit,
      sublabel: "activos",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      icon: PackageCheck,
      label: "Pendientes",
      value: pending,
      sublabel: "por enviar",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">
                  {item.label}
                </p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sublabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
