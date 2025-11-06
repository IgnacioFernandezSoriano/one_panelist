import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Merge, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import Papa from "papaparse";

interface GeneratedPlan {
  id: number;
  carrier_id: number;
  producto_id: number;
  start_date: string;
  end_date: string;
  calculated_events: number;
  unassigned_events: number;
  status: string;
  merge_strategy: string;
  carriers: { commercial_name: string };
  productos_cliente: { codigo_producto: string; nombre_producto: string };
}

interface GeneratedPlansListProps {
  plans: GeneratedPlan[];
  onMerge: (plan: GeneratedPlan) => void;
  onDelete: (planId: number) => void;
  onExport: (planId: number) => void;
  onViewDetails: (planId: number) => void;
}

export function GeneratedPlansList({ plans, onMerge, onDelete, onExport, onViewDetails }: GeneratedPlansListProps) {
  if (plans.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No draft plans generated yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {plan.carriers?.commercial_name} - {plan.productos_cliente?.nombre_producto}
                </h4>
                <Badge variant={plan.status === 'draft' ? 'secondary' : 'default'}>
                  {plan.status}
                </Badge>
                <Badge variant="outline">{plan.merge_strategy}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  Period: {format(new Date(plan.start_date), 'dd/MM/yyyy')} - {format(new Date(plan.end_date), 'dd/MM/yyyy')}
                </span>
                <span>Events: {plan.calculated_events.toLocaleString()}</span>
                {plan.unassigned_events > 0 && (
                  <span className="text-destructive">
                    Unassigned: {plan.unassigned_events}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewDetails(plan.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExport(plan.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {plan.status === 'draft' && (
                <>
              <Button
                size="sm"
                onClick={() => onMerge(plan)}
              >
                <Merge className="h-4 w-4 mr-1" />
                Merge
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
