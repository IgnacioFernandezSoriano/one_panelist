import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid, parseISO } from "date-fns";

interface ImportModifiedPlanCSVProps {
  planId: number;
  onSuccess: () => void;
}

export function ImportModifiedPlanCSV({ planId, onSuccess }: ImportModifiedPlanCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const validateCSVRow = (row: any): boolean => {
    if (!row.nodo_origen || !row.nodo_destino || !row.fecha_programada) {
      return false;
    }

    const date = parseISO(row.fecha_programada);
    if (!isValid(date)) {
      return false;
    }

    return true;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        throw new Error("CSV parsing error: " + parsed.errors[0].message);
      }

      const validRows = parsed.data.filter(validateCSVRow);
      
      if (validRows.length === 0) {
        throw new Error("No valid rows found in CSV");
      }

      // Delete existing details
      await supabase
        .from('generated_allocation_plan_details' as any)
        .delete()
        .eq('plan_id', planId);

      // Insert new details
      const details = validRows.map((row: any) => ({
        plan_id: planId,
        nodo_origen: row.nodo_origen,
        nodo_destino: row.nodo_destino,
        fecha_programada: row.fecha_programada,
        observaciones: row.observaciones || null,
      }));

      const { error: insertError } = await supabase
        .from('generated_allocation_plan_details' as any)
        .insert(details);

      if (insertError) throw insertError;

      // Update calculated_events
      await supabase
        .from('generated_allocation_plans' as any)
        .update({ calculated_events: details.length })
        .eq('id', planId);

      toast({
        title: "Import successful",
        description: `Imported ${details.length} events`,
      });

      setFile(null);
      onSuccess();
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Import Modified Plan</h3>
          <p className="text-sm text-muted-foreground">
            Upload a modified CSV file to update this draft plan. Required columns: nodo_origen, nodo_destino, fecha_programada
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {importing ? "Importing..." : "Import CSV"}
        </Button>
      </div>
    </Card>
  );
}
