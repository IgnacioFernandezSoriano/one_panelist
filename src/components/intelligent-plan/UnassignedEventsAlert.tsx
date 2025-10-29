import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UnassignedCity {
  ciudad_id: number;
  ciudad_nombre: string;
  deficit: number;
}

interface UnassignedEventsAlertProps {
  unassignedEvents: number;
  breakdown: UnassignedCity[];
  onAdjustLimit: () => void;
}

export function UnassignedEventsAlert({ unassignedEvents, breakdown, onAdjustLimit }: UnassignedEventsAlertProps) {
  const navigate = useNavigate();

  if (unassignedEvents === 0) return null;

  const handleCreateNodes = (ciudadId: number) => {
    navigate(`/configuracion/nodos?quick=true&ciudad_id=${ciudadId}&return=/envios/intelligent-plan-generator`);
  };

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Capacity Warning</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-3">
          <p>
            Unable to assign <strong>{unassignedEvents}</strong> events due to weekly capacity limits.
          </p>
          
          <div className="space-y-2">
            <p className="font-semibold text-sm">Affected Cities:</p>
            {breakdown.map((city) => {
              const nodesNeeded = Math.ceil(city.deficit / 20);
              return (
                <div key={city.ciudad_id} className="flex items-center justify-between bg-background/50 p-2 rounded">
                  <div className="flex-1">
                    <span className="font-medium">{city.ciudad_nombre}:</span>{" "}
                    <span className="text-muted-foreground">
                      {city.deficit} events (needs ~{nodesNeeded} additional nodes)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateNodes(city.ciudad_id)}
                    className="ml-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Nodes
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={onAdjustLimit}>
              <Settings className="h-3 w-3 mr-1" />
              Adjust Weekly Limit
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
