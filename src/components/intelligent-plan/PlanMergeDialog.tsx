import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface MergePlan {
  id: number;
  carrier_id: number;
  producto_id: number;
  start_date: string;
  end_date: string;
  calculated_events: number;
  merge_strategy: string;
  carriers: { commercial_name: string };
  productos_cliente: { codigo_producto: string; nombre_producto: string };
}

interface PlanMergeDialogProps {
  open: boolean;
  plan: MergePlan | null;
  pendingToDelete?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlanMergeDialog({ open, plan, pendingToDelete = 0, onConfirm, onCancel }: PlanMergeDialogProps) {
  if (!plan) return null;

  const isReplace = plan.merge_strategy === 'replace';

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirm Merge to Allocation Plan
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Carrier:</span>
                  <p className="font-medium text-foreground">{plan.carriers?.commercial_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Product:</span>
                  <p className="font-medium text-foreground">{plan.productos_cliente?.nombre_producto}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Strategy:</span>
                  <p className="font-medium text-foreground capitalize">{plan.merge_strategy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Period:</span>
                  <p className="font-medium text-foreground">
                    {format(new Date(plan.start_date), 'MMM dd, yyyy')} - {format(new Date(plan.end_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg space-y-2">
                <p className="font-semibold text-foreground">This will:</p>
                <ul className="space-y-1 text-sm">
                  {isReplace && (
                    <li className="text-destructive">
                      • Delete {pendingToDelete} existing PENDING events for this carrier/product
                    </li>
                  )}
                  <li className="text-foreground">
                    • Insert {plan.calculated_events.toLocaleString()} new events
                  </li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Make sure you have reviewed the plan before merging.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm Merge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
