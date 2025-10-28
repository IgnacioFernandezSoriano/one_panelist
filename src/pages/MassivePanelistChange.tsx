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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Panelista {
  id: number;
  nombre_completo: string;
  nodo_asignado?: string;
  estado: string;
}

export default function MassivePanelistChange() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  
  // Form state
  const [panelistType, setPanelistType] = useState<"origen" | "destino">("origen");
  const [currentPanelist, setCurrentPanelist] = useState<string>("");
  const [newPanelist, setNewPanelist] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  // Combobox states
  const [currentPanelistOpen, setCurrentPanelistOpen] = useState(false);
  const [newPanelistOpen, setNewPanelistOpen] = useState(false);

  useEffect(() => {
    loadPanelistas();
  }, []);

  const loadPanelistas = async () => {
    try {
      const { data, error } = await supabase
        .from("panelistas")
        .select("id, nombre_completo, nodo_asignado, estado")
        .eq("estado", "activo")
        .order("nombre_completo");

      if (error) throw error;
      setPanelistas(data || []);
    } catch (error: any) {
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
      // Count affected records
      const panelistField = panelistType === "origen" ? "panelista_origen_id" : "panelista_destino_id";
      
      let query = supabase
        .from("envios")
        .select("id", { count: "exact", head: true })
        .eq(panelistField, parseInt(currentPanelist))
        .gte("fecha_programada", format(dateFrom, "yyyy-MM-dd"))
        .lte("fecha_programada", format(dateTo, "yyyy-MM-dd"));

      const { count, error } = await query;

      if (error) throw error;
      
      setAffectedCount(count || 0);
      
      if (count === 0) {
        toast({
          title: "No Records Found",
          description: "No allocation plans match the selected criteria",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
    setProcessing(true);
    try {
      const panelistField = panelistType === "origen" ? "panelista_origen_id" : "panelista_destino_id";
      const updateValue = newPanelist ? parseInt(newPanelist) : null;

      const { error } = await supabase
        .from("envios")
        .update({ [panelistField]: updateValue })
        .eq(panelistField, parseInt(currentPanelist))
        .gte("fecha_programada", format(dateFrom!, "yyyy-MM-dd"))
        .lte("fecha_programada", format(dateTo!, "yyyy-MM-dd"));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully updated ${affectedCount} allocation plan(s)`,
      });

      // Reset form
      setCurrentPanelist("");
      setNewPanelist("");
      setDateFrom(undefined);
      setDateTo(undefined);
      setConfirmDialogOpen(false);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const currentPanelistData = panelistas.find(p => p.id.toString() === currentPanelist);
  const newPanelistData = panelistas.find(p => p.id.toString() === newPanelist);

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/envios")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
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
            {/* Panelist Type Selection */}
            <div className="space-y-2">
              <Label>Panelist Role</Label>
              <Select value={panelistType} onValueChange={(value: "origen" | "destino") => setPanelistType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="origen">Origin Panelist (Sender)</SelectItem>
                  <SelectItem value="destino">Destination Panelist (Receiver)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select whether to replace origin or destination panelists
              </p>
            </div>

            {/* Current Panelist Selector */}
            <div className="space-y-2">
              <Label>Current Panelist (to replace)</Label>
              <Popover open={currentPanelistOpen} onOpenChange={setCurrentPanelistOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={currentPanelistOpen}
                    className="w-full justify-between"
                  >
                    {currentPanelistData
                      ? `${currentPanelistData.nombre_completo}${currentPanelistData.nodo_asignado ? ` (${currentPanelistData.nodo_asignado})` : ""}`
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
                              setCurrentPanelistOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentPanelist === panelista.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {panelista.nombre_completo}
                            {panelista.nodo_asignado && (
                              <span className="ml-2 text-muted-foreground">({panelista.nodo_asignado})</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">
                Select the panelist that will be replaced in the allocation plans
              </p>
            </div>

            {/* New Panelist Selector */}
            <div className="space-y-2">
              <Label>New Panelist (replacement)</Label>
              <div className="flex gap-2">
                <Popover open={newPanelistOpen} onOpenChange={setNewPanelistOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={newPanelistOpen}
                      className="flex-1 justify-between"
                    >
                      {newPanelistData
                        ? `${newPanelistData.nombre_completo}${newPanelistData.nodo_asignado ? ` (${newPanelistData.nodo_asignado})` : ""}`
                        : "Select new panelist (optional)..."}
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
                                  setNewPanelistOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    newPanelist === panelista.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {panelista.nombre_completo}
                                {panelista.nodo_asignado && (
                                  <span className="ml-2 text-muted-foreground">({panelista.nodo_asignado})</span>
                                )}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {newPanelist && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setNewPanelist("")}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Only allocation plans with scheduled dates within this range will be updated
            </p>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/envios")}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePreview}
                disabled={loading || processing}
              >
                Preview Changes
              </Button>
            </div>
          </div>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Massive Panelist Change</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>You are about to update <strong>{affectedCount}</strong> allocation plan(s).</p>
                <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                  <p><strong>Role:</strong> {panelistType === "origen" ? "Origin Panelist (Sender)" : "Destination Panelist (Receiver)"}</p>
                  <p><strong>Current Panelist:</strong> {currentPanelistData?.nombre_completo}</p>
                  <p><strong>New Panelist:</strong> {newPanelistData?.nombre_completo || "(Unassigned)"}</p>
                  <p><strong>Date Range:</strong> {dateFrom && format(dateFrom, "PPP")} to {dateTo && format(dateTo, "PPP")}</p>
                </div>
                <p className="text-destructive font-semibold">This action cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleExecuteChange}
                disabled={processing}
                className="bg-primary"
              >
                {processing ? "Processing..." : "Confirm & Execute"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
