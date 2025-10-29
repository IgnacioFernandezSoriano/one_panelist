import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Calendar, TrendingUp } from "lucide-react";

interface CityDistribution {
  ciudad_nombre: string;
  clasificacion: 'A' | 'B' | 'C';
  events: number;
  percentage: number;
}

interface PlanPreviewSummaryProps {
  totalEvents: number;
  calculatedEvents: number;
  totalWeeks: number;
  maxWeeklyCapacity: number;
  cityDistribution: CityDistribution[];
}

export function PlanPreviewSummary({
  totalEvents,
  calculatedEvents,
  totalWeeks,
  maxWeeklyCapacity,
  cityDistribution,
}: PlanPreviewSummaryProps) {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Generation Summary
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Events (Annual)</p>
              <p className="text-2xl font-bold">{totalEvents.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Calculated Events (Period)</p>
              <p className="text-2xl font-bold">{calculatedEvents.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Total Weeks
              </p>
              <p className="text-xl font-semibold">{totalWeeks}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Max Weekly Capacity
              </p>
              <p className="text-xl font-semibold">{maxWeeklyCapacity.toLocaleString()} events/week</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3">City Distribution</h4>
          <div className="space-y-2">
            {cityDistribution.map((city, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    city.clasificacion === 'A' ? 'default' :
                    city.clasificacion === 'B' ? 'secondary' : 'outline'
                  }>
                    {city.clasificacion}
                  </Badge>
                  <span className="font-medium">{city.ciudad_nombre}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {city.percentage.toFixed(1)}%
                  </span>
                  <span className="font-semibold">
                    {city.events.toLocaleString()} events
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
