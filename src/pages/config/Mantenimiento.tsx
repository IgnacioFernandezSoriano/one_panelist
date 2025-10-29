import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Cliente {
  id: number;
  nombre: string;
  codigo: string;
  max_events_per_panelist_week: number | null;
}

export default function Mantenimiento() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalValue, setGlobalValue] = useState<number>(5);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, codigo, max_events_per_panelist_week')
        .eq('estado', 'activo')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error("Error loading clientes:", error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateClienteValue = async (clienteId: number, value: number) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ max_events_per_panelist_week: value })
        .eq('id', clienteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Max events per week updated successfully",
      });

      loadClientes();
    } catch (error) {
      console.error("Error updating cliente:", error);
      toast({
        title: "Error",
        description: "Failed to update max events per week",
        variant: "destructive",
      });
    }
  };

  const applyGlobalValue = async () => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ max_events_per_panelist_week: globalValue })
        .eq('estado', 'activo');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Applied ${globalValue} events/week to all active accounts`,
      });

      loadClientes();
    } catch (error) {
      console.error("Error applying global value:", error);
      toast({
        title: "Error",
        description: "Failed to apply global value",
        variant: "destructive",
      });
    }
  };

  const getValueStatus = (value: number | null) => {
    if (!value || value < 3) {
      return { color: "text-destructive", icon: AlertCircle, message: "Too low - insufficient capacity" };
    } else if (value >= 3 && value < 5) {
      return { color: "text-warning", icon: Info, message: "Below recommended" };
    } else {
      return { color: "text-success", icon: CheckCircle2, message: "Recommended" };
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Maintenance</h1>
          <p className="text-muted-foreground mt-2">
            Configure system-wide settings and capacity limits
          </p>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Max Events per Panelist/Week Configuration</AlertTitle>
          <AlertDescription>
            This setting controls how many events can be assigned to each panelist per week in the intelligent plan generator.
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li><strong>Minimum viable:</strong> 3 events/week (12 events/month/node)</li>
              <li><strong>Standard recommended:</strong> 5 events/week (20 events/month/node)</li>
              <li><strong>High volume:</strong> 7-10 events/week (28-40 events/month/node)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Apply Global Value</CardTitle>
            <CardDescription>
              Set the same max events per week value for all active accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="global-value">Events per Week</Label>
                <Input
                  id="global-value"
                  type="number"
                  min="1"
                  max="20"
                  value={globalValue}
                  onChange={(e) => setGlobalValue(parseInt(e.target.value) || 5)}
                />
              </div>
              <Button onClick={applyGlobalValue}>
                Apply to All Accounts
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individual Account Configuration</CardTitle>
            <CardDescription>
              Configure max events per week for each account individually
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="w-[200px]">Max Events/Week</TableHead>
                    <TableHead className="w-[200px]">Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => {
                    const status = getValueStatus(cliente.max_events_per_panelist_week);
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.codigo}</TableCell>
                        <TableCell>{cliente.nombre}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={cliente.max_events_per_panelist_week || 5}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 5;
                              setClientes(prev => 
                                prev.map(c => 
                                  c.id === cliente.id 
                                    ? { ...c, max_events_per_panelist_week: newValue }
                                    : c
                                )
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${status.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm">{status.message}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => updateClienteValue(
                              cliente.id, 
                              cliente.max_events_per_panelist_week || 5
                            )}
                          >
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity Calculation</CardTitle>
            <CardDescription>
              Understanding the impact of max events per week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Formula:</strong> Max Events/Week × 4 weeks = Events per month per node
              </p>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="border rounded p-3">
                  <div className="text-lg font-bold">3 events/week</div>
                  <div className="text-muted-foreground">12 events/month/node</div>
                  <div className="text-muted-foreground">144 events/year/node</div>
                </div>
                <div className="border rounded p-3 bg-primary/10">
                  <div className="text-lg font-bold">5 events/week</div>
                  <div className="text-muted-foreground">20 events/month/node</div>
                  <div className="text-muted-foreground">240 events/year/node</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-lg font-bold">10 events/week</div>
                  <div className="text-muted-foreground">40 events/month/node</div>
                  <div className="text-muted-foreground">480 events/year/node</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
