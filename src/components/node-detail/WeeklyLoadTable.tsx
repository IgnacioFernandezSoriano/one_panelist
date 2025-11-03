import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { WeekInfo } from "@/lib/weekCalculations";

export interface NodeWeeklyLoad {
  nodo_codigo: string;
  panelista_nombre: string | null;
  panelista_id: number | null;
  week_minus_2: number;
  week_minus_1: number;
  week_0: number;
  week_plus_1: number;
  week_plus_2: number;
  week_plus_3: number;
  week_plus_4: number;
  total: number;
  maxPerWeek: number;
}

interface WeeklyLoadTableProps {
  loads: NodeWeeklyLoad[];
  weekRange: WeekInfo[];
  maxEventsPerWeek: number;
}

export const WeeklyLoadTable = ({ loads, weekRange, maxEventsPerWeek }: WeeklyLoadTableProps) => {
  const getColorClass = (count: number, hasNoPanel: boolean) => {
    if (hasNoPanel) return "bg-muted text-muted-foreground";
    if (count > maxEventsPerWeek) return "bg-destructive/20 text-destructive font-bold";
    if (count >= maxEventsPerWeek * 0.8) return "bg-warning/20 text-warning-foreground";
    return "bg-success/10 text-success";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Carga Semanal por Nodo</h3>
        <div className="text-sm font-medium text-muted-foreground">
          Límite: <span className="text-foreground">{maxEventsPerWeek}</span> eventos/semana
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nodo</TableHead>
                <TableHead className="w-[180px]">Panelista</TableHead>
                {weekRange.map((week, idx) => (
                  <TableHead key={idx} className="text-center min-w-[80px]">
                    <div className="space-y-1">
                      <div className="font-medium">{week.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {week.weekNumber === 0 ? (
                          <span className="text-primary font-bold">★ S0</span>
                        ) : (
                          `S${week.weekNumber > 0 ? '+' : ''}${week.weekNumber}`
                        )}
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No hay nodos en esta ubicación
                  </TableCell>
                </TableRow>
              ) : (
                loads.map((load) => {
                  const weekValues = [
                    load.week_minus_2,
                    load.week_minus_1,
                    load.week_0,
                    load.week_plus_1,
                    load.week_plus_2,
                    load.week_plus_3,
                    load.week_plus_4,
                  ];

                  return (
                    <TableRow key={load.nodo_codigo}>
                      <TableCell className="font-mono text-sm">
                        {load.nodo_codigo}
                      </TableCell>
                      <TableCell>
                        {load.panelista_nombre || (
                          <span className="text-muted-foreground italic">Sin panelista</span>
                        )}
                      </TableCell>
                      {weekValues.map((count, idx) => (
                        <TableCell
                          key={idx}
                          className={cn(
                            "text-center font-medium transition-colors",
                            getColorClass(count, !load.panelista_id),
                            idx === 2 && "ring-2 ring-primary ring-inset"
                          )}
                        >
                          {count}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">
                        {load.total}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success/10 border border-success/20 rounded"></div>
            <span>Normal (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-warning/20 border border-warning/30 rounded"></div>
            <span>Alta (80-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive/20 border border-destructive/30 rounded"></div>
            <span>Sobrecarga (&gt;100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted border border-border rounded"></div>
            <span>Sin panelista</span>
          </div>
        </div>
      </div>
    </div>
  );
};
