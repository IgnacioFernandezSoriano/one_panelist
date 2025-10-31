import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Calendar, TrendingUp, ChevronDown, MapPin, User } from "lucide-react";
import { useState } from "react";

interface NodeInfo {
  codigo: string;
  has_panelista: boolean;
  estado: string;
  existing_events: number;
  new_events: number;
  total_events: number;
  events_per_week: number;
}

interface CityDistribution {
  ciudad_id: number;
  ciudad_nombre: string;
  clasificacion: 'A' | 'B' | 'C';
  events: number;
  percentage: number;
  nodos: NodeInfo[];
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
  const [openCities, setOpenCities] = useState<number[]>([]);

  const toggleCity = (ciudadId: number) => {
    setOpenCities(prev => 
      prev.includes(ciudadId) 
        ? prev.filter(id => id !== ciudadId)
        : [...prev, ciudadId]
    );
  };

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
          <h4 className="text-md font-semibold mb-3">City Distribution & Nodes</h4>
          <div className="space-y-2">
            {cityDistribution.map((city) => {
              const isOpen = openCities.includes(city.ciudad_id);
              
              return (
                <Collapsible 
                  key={city.ciudad_id}
                  open={isOpen}
                  onOpenChange={() => toggleCity(city.ciudad_id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                        <Badge variant={
                          city.clasificacion === 'A' ? 'default' :
                          city.clasificacion === 'B' ? 'secondary' : 'outline'
                        }>
                          {city.clasificacion}
                        </Badge>
                        <span className="font-medium">{city.ciudad_nombre}</span>
                        <Badge variant="outline" className="ml-2">
                          {city.nodos.length} nodes
                        </Badge>
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
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-1">
                      {city.nodos.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">
                          No active nodes in this city
                        </p>
                      ) : (
                        city.nodos.map((nodo, idx) => (
                          <div 
                            key={idx}
                            className="grid grid-cols-[auto,1fr,auto,auto,auto,auto,auto] gap-3 items-center p-3 bg-background rounded border border-border text-sm"
                          >
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{nodo.codigo}</span>
                              <Badge 
                                variant={nodo.has_panelista ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {nodo.has_panelista ? 'Assigned' : 'Unassigned'}
                              </Badge>
                            </div>
                            <div className="text-xs text-right">
                              <div className="text-muted-foreground">Current</div>
                              <div className="font-semibold">{nodo.existing_events}</div>
                            </div>
                            <div className="text-xs text-right">
                              <div className="text-muted-foreground">New</div>
                              <div className="font-semibold text-primary">+{nodo.new_events}</div>
                            </div>
                            <div className="text-xs text-right">
                              <div className="text-muted-foreground">Total</div>
                              <div className="font-bold">{nodo.total_events}</div>
                            </div>
                            <div className="text-xs text-right">
                              <div className="text-muted-foreground">Per Week</div>
                              <div className="font-semibold text-muted-foreground">{nodo.events_per_week.toFixed(2)}</div>
                            </div>
                            <Badge 
                              variant={nodo.estado === 'activo' ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {nodo.estado}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
