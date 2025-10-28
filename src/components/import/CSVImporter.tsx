import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Download, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

interface CSVImporterProps {
  tableName: string;
  tableLabel: string;
  expectedColumns: string[];
  exampleData: Record<string, any>[];
  onImportComplete?: () => void;
}

export const CSVImporter = ({
  tableName,
  tableLabel,
  expectedColumns,
  exampleData,
  onImportComplete,
}: CSVImporterProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: number;
    messages: string[];
  } | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const csv = Papa.unparse(exampleData);
    const blob = new Blob(['\uFEFF' + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${tableName}_template.csv`;
    link.click();
    
    toast({
      title: "Template downloaded",
      description: `Template for ${tableLabel} has been downloaded`,
    });
  };

  const validateColumns = (headers: string[]): boolean => {
    const missingColumns = expectedColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      toast({
        title: "Invalid CSV format",
        description: `Missing columns: ${missingColumns.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const headers = Object.keys(results.data[0] || {});
          
          if (!validateColumns(headers)) {
            setIsProcessing(false);
            return;
          }

          const successfulRows: any[] = [];
          const errors: string[] = [];

          // Process each row
          results.data.forEach((row: any, index: number) => {
            try {
              // Basic validation - check if row has data
              const hasData = Object.values(row).some(val => val !== "" && val !== null);
              if (hasData) {
                successfulRows.push(row);
              }
            } catch (error) {
              errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : "Invalid data"}`);
            }
          });

          // Append data to existing records (insert without deleting)
          if (successfulRows.length > 0) {
            try {
              // @ts-ignore - Dynamic table name prevents proper type inference
              const { data, error } = await (supabase.from as any)(tableName).insert(successfulRows);

              if (error) {
                // If there are duplicate key errors, show specific message
                if (error.code === '23505') {
                  errors.push(`Some records already exist and were skipped (duplicate constraint)`);
                } else {
                  throw error;
                }
              }

              setImportResult({
                success: successfulRows.length - (error ? 1 : 0),
                errors: errors.length + (error ? 1 : 0),
                messages: errors,
              });

              toast({
                title: "Data appended successfully",
                description: `Added ${successfulRows.length} new records to existing data`,
              });

              onImportComplete?.();
            } catch (error: any) {
              throw error;
            }
          } else {
            toast({
              title: "No valid data",
              description: "The CSV file contains no valid data to import",
              variant: "destructive",
            });
          }
        } catch (error: any) {
          toast({
            title: "Import failed",
            description: error.message || "An error occurred during import",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        toast({
          title: "File parsing error",
          description: error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {tableLabel} - CSV Import (Append Mode)
        </CardTitle>
        <CardDescription>
          Upload a CSV file to add new records to the existing data. Existing records will NOT be deleted. Download the template to see the expected format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <Button disabled={isProcessing} className="gap-2">
              <Upload className="w-4 h-4" />
              {isProcessing ? "Processing..." : "Upload CSV"}
            </Button>
          </div>
        </div>

        {importResult && (
          <div className="mt-4 p-4 rounded-lg border">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="font-medium">Import Summary</p>
                <p className="text-sm text-muted-foreground">
                  Successfully imported: {importResult.success} records
                </p>
                {importResult.errors > 0 && (
                  <p className="text-sm text-warning">
                    Errors: {importResult.errors} rows
                  </p>
                )}
              </div>
            </div>

            {importResult.messages.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Error Details:
                </p>
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {importResult.messages.map((msg, i) => (
                    <p key={i} className="text-muted-foreground">{msg}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Expected columns:</p>
          <p className="font-mono">{expectedColumns.join(", ")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
