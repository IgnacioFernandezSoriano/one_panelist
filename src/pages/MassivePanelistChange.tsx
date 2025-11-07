import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, CalendarIcon, Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCliente } from "@/contexts/ClienteContext";
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


interface Panelista {
  id: number;
  nombre_completo: string;
  nodo_asignado: string | null;
  estado: string;
}

export default function MassivePanelistChange() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clienteId } = useCliente();
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const [affectedNodes, setAffectedNodes] = useState<string[]>([]);
  
  // Form state
  const [currentPanelist, setCurrentPanelist] = useState<string>("");
  const [newPanelist, setNewPanelist] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  // Combobox state - only one can be open at a time
  const [openCombo, setOpenCombo] = useState<"current" | "new" | null>(null);

  useEffect(() => {
    if (clienteId) {
      loadPanelistas();
    }
  }, [clienteId]);

  const loadPanelistas = async () => {
    if (!clienteId) return;
    
    try {
      const { data, error } = await supabase
        .from("panelistas")
        .select("id, nombre_completo, nodo_asignado, estado")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("nombre_completo");

      if (error) throw error;
      
      // Remove duplicates using Map for more robust deduplication
      const uniquePanelistas = Array.from(
        new Map((data ?? []).map(p => [p.id, p])).values()
      );
      
      console.log('[MassiveChange] Panelistas loaded:', uniquePanelistas.length);
      
      setPanelistas(uniquePanelistas);
    } catch (error: any) {
      console.error('[MassiveChange] Error loading panelistas:', error);
      toast({
        title: "Error",
        description: "Could not load panelists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateAndCountAffected = async () => {
    if (!clienteId) {
      toast({
        title: "Error",
        description: "Client ID not available",
        variant: "destructive",
      });
      return false;
    }

    if (!currentPanelist) {
      toast({
        title: "Validation Error",
        description: "Please select the current panelist to replace",
        variant: "destructive",
      });
      return false;
    }

    if (!dateFrom || !dateTo) {
      toast({
        title: "Validation Error",
        description: "Please select both date range (from and to)",
        variant: "destructive",
      });
      return false;
    }

    if (dateFrom > dateTo) {
      toast({
        title: "Validation Error",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return false;
    }

    try {
      const fromDate = format(dateFrom, 'yyyy-MM-dd');
      const toDate = format(dateTo, 'yyyy-MM-dd');
      
      console.log('[MassiveChange] === VALIDATION DEBUG ===');
      console.log('[MassiveChange] Current Panelist ID:', currentPanelist);
      console.log('[MassiveChange] Date Range:', fromDate, 'to', toDate);
      console.log('[MassiveChange] Cliente ID:', clienteId);
      
      // Get the current panelist's assigned node
      const currentPanelistaData = panelistas.find(p => p.id.toString() === currentPanelist);
      
      if (!currentPanelistaData?.nodo_asignado) {
        toast({
          title: "Validation Error",
          description: "The selected panelist has no assigned node",
          variant: "destructive",
        });
        return false;
      }

      const nodoAsignado = currentPanelistaData.nodo_asignado;
      console.log('[MassiveChange] Current panelist node:', nodoAsignado);

      // Count affected events where this panelist's node appears as origin or destination
      // Only count events with status PENDING or NOTIFIED
      const { count: countOrigen, error: errorOrigen } = await supabase
        .from("generated_allocation_plan_details")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", clienteId)
        .eq("nodo_origen", nodoAsignado)
        .in("status", ["PENDING", "NOTIFIED"])
        .gte("fecha_programada", fromDate)
        .lte("fecha_programada", toDate);

      if (errorOrigen) {
        console.error('[MassiveChange] Error counting origin:', errorOrigen);
        throw errorOrigen;
      }
      console.log('[MassiveChange] Origin Count:', countOrigen);

      const { count: countDestino, error: errorDestino } = await supabase
        .from("generated_allocation_plan_details")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", clienteId)
        .eq("nodo_destino", nodoAsignado)
        .in("status", ["PENDING", "NOTIFIED"])
        .gte("fecha_programada", fromDate)
        .lte("fecha_programada", toDate);

      if (errorDestino) {
        console.error('[MassiveChange] Error counting destination:', errorDestino);
        throw errorDestino;
      }
      console.log('[MassiveChange] Destination Count:', countDestino);
      
      const totalCount = (countOrigen || 0) + (countDestino || 0);
      console.log('[MassiveChange] Total Affected:', totalCount);
      console.log('[MassiveChange] === END DEBUG ===');
      
      setAffectedCount(totalCount);
      setAffectedNodes([nodoAsignado]);
      
      if (totalCount === 0) {
        toast({
          title: "No Records Found",
          description: "No allocation plans match the selected criteria (status PENDING or NOTIFIED)",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('[MassiveChange] Error validating:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during validation",
        variant: "destructive",
      });
      return false;
    }
  };

  const handlePreview = async () => {
    const isValid = await validateAndCountAffected();
    if (isValid) {
      setConfirmDialogOpen(true);
    }
  };

  const handleExecuteChange = async () => {
    if (!clienteId) return;
    
    setProcessing(true);
    try {
      const currentPanelistaData = panelistas.find(p => p.id.toString() === currentPanelist);
      const newPanelistaData = newPanelist ? panelistas.find(p => p.id.toString() === newPanelist) : null;

      if (!currentPanelistaData?.nodo_asignado) {
        throw new Error("Current panelist has no assigned node");
      }

      const oldNodo = currentPanelistaData.nodo_asignado;
      const newNodo = newPanelistaData?.nodo_asignado || null;

      console.log('[MassiveChange] Executing change:', {
        oldNodo,
        newNodo,
        dateRange: [format(dateFrom!, "yyyy-MM-dd"), format(dateTo!, "yyyy-MM-dd")]
      });

      // Strategy: We need to reassign the NODE, not update panelist IDs
      // Since panelists are assigned to nodes, we need to:
      // 1. If newPanelist is selected: verify they have a node assigned
      // 2. Update events to use the new panelist's node instead of the old one

      if (newNodo === null && newPanelist) {
        throw new Error("New panelist has no assigned node");
      }

      // Update events where nodo_origen matches the old panelist's node
      const { error: errorOrigen } = await supabase
        .from("generated_allocation_plan_details")
        .update({ nodo_origen: newNodo })
        .eq("cliente_id", clienteId)
        .eq("nodo_origen", oldNodo)
        .in("status", ["PENDING", "NOTIFIED"])
        .gte("fecha_programada", format(dateFrom!, "yyyy-MM-dd"))
        .lte("fecha_programada", format(dateTo!, "yyyy-MM-dd"));

      if (errorOrigen) {
        console.error('[MassiveChange] Error updating origin:', errorOrigen);
        throw errorOrigen;
      }

      // Update events where nodo_destino matches the old panelist's node
      const { error: errorDestino } = await supabase
        .from("generated_allocation_plan_details")
        .update({ nodo_destino: newNodo })
        .eq("cliente_id", clienteId)
        .eq("nodo_destino", oldNodo)
        .in("status", ["PENDING", "NOTIFIED"])
        .gte("fecha_programada", format(dateFrom!, "yyyy-MM-dd"))
        .lte("fecha_programada", format(dateTo!, "yyyy-MM-dd"));

      if (errorDestino) {
        console.error('[MassiveChange] Error updating destination:', errorDestino);
        throw errorDestino;
      }

      const actionText = newPanelist 
        ? `replaced with ${newPanelistaData?.nombre_completo}`
        : "unassigned";

      toast({
        title: "Success",
        description: `Successfully updated ${affectedCount} allocation plan(s). Panelist ${actionText}.`,
      });

      // Reset form
      setCurrentPanelist("");
      setNewPanelist("");
      setDateFrom(undefined);
      setDateTo(undefined);
      setConfirmDialogOpen(false);

    } catch (error: any) {
      console.error('[MassiveChange] Error executing change:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during the update",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const currentPanelistaData = panelistas.find(p => p.id.toString() === currentPanelist);
  const newPanelistaData = panelistas.find(p => p.id.toString() === newPanelist);

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/envios")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Allocation Plan
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Massive Panelist Change
          </h1>
          <p className="text-muted-foreground">
            Replace a panelist with another across multiple allocation plans within a date range
          </p>
        </div>

        <Card className="p-6 max-w-2xl">
          <div className="space-y-6">
            {/* Current Panelist Selector */}
            <div className="space-y-2">
              <Label>Current Panelist (to replace)</Label>
              <Popover 
                open={openCombo === "current"} 
                onOpenChange={(open) => setOpenCombo(open ? "current" : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombo === "current"}
                    className="w-full justify-between"
                    disabled={loading}
                  >
                    {currentPanelistaData
                      ? `${currentPanelistaData.nombre_completo} (ID: ${currentPanelistaData.id})${currentPanelistaData.nodo_asignado ? ` - ${currentPanelistaData.nodo_asignado}` : " - No node"}`
                      : "Select current panelist..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search panelist..." />
                    <CommandList>
                      <CommandEmpty>No panelist found.</CommandEmpty>
                      <CommandGroup>
                        {panelistas.map((panelista) => (
                          <CommandItem
                            key={panelista.id}
                            value={`${panelista.nombre_completo} ${panelista.nodo_asignado || ""}`}
                            onSelect={() => {
                              setCurrentPanelist(panelista.id.toString());
                              setOpenCombo(null);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentPanelist === panelista.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{panelista.nombre_completo}</span>
                              <span className="text-xs text-muted-foreground">
                                ID: {panelista.id} | Node: {panelista.nodo_asignado || "Not assigned"}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">
                Select the panelist to be replaced (both as sender and receiver in all allocation plans)
              </p>
            </div>

            {/* New Panelist Selector */}
            <div className="space-y-2">
              <Label>New Panelist (replacement)</Label>
              <div className="flex gap-2">
                <Popover 
                  open={openCombo === "new"} 
                  onOpenChange={(open) => setOpenCombo(open ? "new" : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombo === "new"}
                      className="w-full justify-between"
                      disabled={loading}
                    >
                      {newPanelistaData
                        ? `${newPanelistaData.nombre_completo} (ID: ${newPanelistaData.id})${newPanelistaData.nodo_asignado ? ` - ${newPanelistaData.nodo_asignado}` : " - No node"}`
                        : "Select replacement panelist..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search panelist..." />
                      <CommandList>
                        <CommandEmpty>No panelist found.</CommandEmpty>
                        <CommandGroup>
                          {panelistas
                            .filter(p => p.id.toString() !== currentPanelist)
                            .map((panelista) => (
                              <CommandItem
                                key={panelista.id}
                                value={`${panelista.nombre_completo} ${panelista.nodo_asignado || ""}`}
                                onSelect={() => {
                                  setNewPanelist(panelista.id.toString());
                                  setOpenCombo(null);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newPanelist === panelista.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{panelista.nombre_completo}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ID: {panelista.id} | Node: {panelista.nodo_asignado || "Not assigned"}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewPanelist("")}
                  disabled={!newPanelist}
                  title="Clear selection"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Select the replacement panelist, or leave empty to unassign
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Only allocation plans with scheduled dates within this range will be updated
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/envios")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!currentPanelist || !dateFrom || !dateTo || loading}
                className="flex-1"
              >
                Preview Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Massive Change</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to modify <strong>{affectedCount}</strong> allocation plan(s).</p>
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <p><strong>Current Panelist:</strong> {currentPanelistaData?.nombre_completo} (Node: {currentPanelistaData?.nodo_asignado})</p>
                <p><strong>New Panelist:</strong> {newPanelistaData ? `${newPanelistaData.nombre_completo} (Node: ${newPanelistaData.nodo_asignado})` : "Unassign (no panelist)"}</p>
                <p><strong>Date Range:</strong> {dateFrom && format(dateFrom, "PPP")} to {dateTo && format(dateTo, "PPP")}</p>
                <p><strong>Status Filter:</strong> PENDING and NOTIFIED only</p>
              </div>
              <p className="text-destructive font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteChange}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? "Processing..." : "Confirm Change"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
