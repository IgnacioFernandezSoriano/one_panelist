import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTransitTimeDistribution } from "@/hooks/useTransitTimeDistribution";
import { cn } from "@/lib/utils";

interface TransitTimeMatrixProps {
  clienteId: number | null;
  period: number;
  carrierId: number | null;
  productId: number | null;
}

export function TransitTimeMatrix({
  clienteId,
  period,
  carrierId,
  productId
}: TransitTimeMatrixProps) {
  const [selectedOrigin, setSelectedOrigin] = useState<string>("");
  const [viewMode, setViewMode] = useState<'count' | 'cumulative'>('count');

  // Fetch available origin cities
  const { data: originCities, isLoading: citiesLoading } = useQuery({
    queryKey: ['origin-cities', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from('ciudades')
        .select('nombre')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('nombre');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId
  });

  // Auto-select first city when cities are loaded
  useEffect(() => {
    if (originCities && originCities.length > 0 && !selectedOrigin) {
      setSelectedOrigin(originCities[0].nombre);
    }
  }, [originCities, selectedOrigin]);

  const { data: matrixData, isLoading: matrixLoading } = useTransitTimeDistribution(
    clienteId,
    selectedOrigin || null,
    period,
    carrierId,
    productId
  );

  const getHeatMapColor = (
    data: { count: number; cumulativePercentage: number },
    mode: 'count' | 'cumulative',
    totalEvents: number
  ): string => {
    if (mode === 'cumulative') {
      const pct = data.cumulativePercentage;
      if (pct >= 80) return 'bg-green-500/20';
      if (pct >= 60) return 'bg-green-400/20';
      if (pct >= 40) return 'bg-yellow-400/20';
      if (pct >= 20) return 'bg-orange-400/20';
      return 'bg-red-400/20';
    } else {
      const ratio = data.count / totalEvents;
      if (ratio >= 0.4) return 'bg-green-500/20';
      if (ratio >= 0.2) return 'bg-green-400/20';
      if (ratio >= 0.1) return 'bg-yellow-400/20';
      if (ratio >= 0.05) return 'bg-orange-400/20';
      return 'bg-red-400/20';
    }
  };

  const getClassBadgeVariant = (clasificacion: string): "default" | "secondary" | "outline" => {
    if (clasificacion === 'A') return 'default';
    if (clasificacion === 'B') return 'secondary';
    return 'outline';
  };

  if (citiesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transit Time Distribution Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transit Time Distribution Matrix</CardTitle>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="origin-city">Origin City:</Label>
            <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
              <SelectTrigger id="origin-city" className="w-[200px]">
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {originCities?.map((city) => (
                  <SelectItem key={city.nombre} value={city.nombre}>
                    {city.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="view-mode">View:</Label>
            <span className="text-sm text-muted-foreground">
              {viewMode === 'count' ? 'Event Count' : '% Cumulative'}
            </span>
            <Switch
              id="view-mode"
              checked={viewMode === 'cumulative'}
              onCheckedChange={(checked) => setViewMode(checked ? 'cumulative' : 'count')}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!selectedOrigin ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select an origin city to view the transit time matrix
          </div>
        ) : matrixLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : !matrixData || matrixData.routes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available for the selected filters</p>
            <p className="text-sm mt-2">
              Period: Last {period} days | Origin: {selectedOrigin}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">
                    Destination City
                  </TableHead>
                  <TableHead className="min-w-[60px]">Class</TableHead>
                  <TableHead className="min-w-[80px]">Total</TableHead>
                  {Array.from(
                    { length: matrixData.maxDay - matrixData.minDay + 1 },
                    (_, i) => matrixData.minDay + i
                  ).map((day) => (
                    <TableHead key={day} className="text-center min-w-[80px]">
                      J+{day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {matrixData.routes.map((route) => (
                  <TableRow key={route.ciudadDestino}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {route.ciudadDestino}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getClassBadgeVariant(route.clasificacion)}>
                        {route.clasificacion}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{route.totalEvents}</TableCell>

                    {Array.from(
                      { length: matrixData.maxDay - matrixData.minDay + 1 },
                      (_, i) => matrixData.minDay + i
                    ).map((day) => {
                      const data = route.distribution.get(day);
                      const isStandard = day === route.standardDays;

                      return (
                        <TableCell
                          key={day}
                          className={cn(
                            "text-center",
                            isStandard && "font-bold",
                            data && getHeatMapColor(data, viewMode, route.totalEvents)
                          )}
                        >
                          {data ? (
                            viewMode === 'count' ? (
                              data.count
                            ) : (
                              `${data.cumulativePercentage.toFixed(1)}%`
                            )
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
