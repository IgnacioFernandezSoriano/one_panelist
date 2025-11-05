import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportCSVPlan() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        plan_name: "Example Plan 2025",
        nodo_origen: "MAD001",
        nodo_destino: "BCN001",
        fecha_programada: "2025-01-15",
        producto_codigo: "PROD001",
        carrier_name: "DHL",
        status: "PENDING"
      },
      {
        plan_name: "Example Plan 2025",
        nodo_origen: "BCN001",
        nodo_destino: "VAL001",
        fecha_programada: "2025-01-16",
        producto_codigo: "PROD002",
        carrier_name: "UPS",
        status: "PENDING"
      }
    ];
    
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'allocation_plan_import_template.csv';
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
      setImportSuccess(false);
      
      // Parse and preview CSV
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          setCsvPreviewData(results.data.slice(0, 10)); // Show first 10 rows
        },
        error: (error) => {
          toast({
            title: "Error",
            description: `Failed to parse CSV: ${error.message}`,
            variant: "destructive",
          });
        }
      });
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;
    
    setImporting(true);
    
    try {
      Papa.parse(csvFile, {
        header: true,
        complete: async (results) => {
          const rows = results.data.filter((row: any) => row.plan_name); // Filter empty rows
          
          if (rows.length === 0) {
            toast({
              title: "Error",
              description: "No valid data found in CSV",
              variant: "destructive",
            });
            setImporting(false);
            return;
          }

          // Validate and prepare data
          const errors: string[] = [];
          const validRows: any[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row: any = rows[i];
            const rowNum = i + 2; // +2 because of header and 0-index

            // Required fields validation
            if (!row.plan_name) errors.push(`Row ${rowNum}: plan_name is required`);
            if (!row.nodo_origen) errors.push(`Row ${rowNum}: nodo_origen is required`);
            if (!row.nodo_destino) errors.push(`Row ${rowNum}: nodo_destino is required`);
            if (!row.fecha_programada) errors.push(`Row ${rowNum}: fecha_programada is required`);
            if (!row.producto_codigo) errors.push(`Row ${rowNum}: producto_codigo is required`);
            if (!row.carrier_name) errors.push(`Row ${rowNum}: carrier_name is required`);

            if (errors.length === 0) {
              validRows.push(row);
            }
          }

          if (errors.length > 0) {
            toast({
              title: "Validation Errors",
              description: errors.slice(0, 5).join("; ") + (errors.length > 5 ? "..." : ""),
              variant: "destructive",
            });
            setImporting(false);
            return;
          }

          // Get or create plan
          const planName = validRows[0].plan_name;
          let planId: number;

          const { data: existingPlan } = await supabase
            .from("generated_allocation_plans")
            .select("id")
            .eq("plan_name", planName)
            .single();

          if (existingPlan) {
            planId = existingPlan.id;
          } else {
            const { data: newPlan, error: planError } = await supabase
              .from("generated_allocation_plans")
              .insert({ plan_name: planName, status: "draft" })
              .select("id")
              .single();

            if (planError) throw planError;
            planId = newPlan.id;
          }

          // Prepare events for insertion
          const eventsToInsert = [];

          for (const row of validRows) {
            // Get producto_id from codigo
            const { data: producto } = await supabase
              .from("productos_cliente")
              .select("id")
              .eq("codigo_producto", row.producto_codigo)
              .single();

            if (!producto) {
              errors.push(`Product code ${row.producto_codigo} not found`);
              continue;
            }

            // Get carrier_id from name
            const { data: carrier } = await supabase
              .from("carriers")
              .select("id")
              .eq("commercial_name", row.carrier_name)
              .single();

            if (!carrier) {
              errors.push(`Carrier ${row.carrier_name} not found`);
              continue;
            }

            eventsToInsert.push({
              plan_id: planId,
              nodo_origen: row.nodo_origen,
              nodo_destino: row.nodo_destino,
              fecha_programada: row.fecha_programada,
              producto_id: producto.id,
              carrier_id: carrier.id,
              status: row.status || "PENDING",
            });
          }

          if (errors.length > 0) {
            toast({
              title: "Import Errors",
              description: errors.slice(0, 5).join("; ") + (errors.length > 5 ? "..." : ""),
              variant: "destructive",
            });
            setImporting(false);
            return;
          }

          // Insert events
          const { error: insertError } = await supabase
            .from("generated_allocation_plan_details")
            .insert(eventsToInsert);

          if (insertError) throw insertError;

          setImportedCount(eventsToInsert.length);
          setImportSuccess(true);
          
          toast({
            title: "Success",
            description: `Imported ${eventsToInsert.length} events successfully`,
          });

          setImporting(false);
        },
        error: (error) => {
          toast({
            title: "Error",
            description: `Failed to parse CSV: ${error.message}`,
            variant: "destructive",
          });
          setImporting(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Import CSV Plan</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to import allocation events into the system
          </p>
        </div>

        {/* Success Alert */}
        {importSuccess && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Import Successful!</AlertTitle>
            <AlertDescription className="text-green-700">
              Successfully imported {importedCount} allocation events.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Follow these steps to import your allocation plan</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Download the CSV template using the button below</li>
              <li>Fill in your allocation events data following the template format</li>
              <li>
                <strong>Required fields:</strong> plan_name, nodo_origen, nodo_destino, fecha_programada, producto_codigo, carrier_name
              </li>
              <li>
                <strong>Optional fields:</strong> status (defaults to PENDING if not specified)
              </li>
              <li>Upload the completed CSV file using the file selector</li>
              <li>Review the preview to ensure your data is correct</li>
              <li>Click the Import button to complete the process</li>
            </ol>
          </CardContent>
        </Card>

        {/* Template Download */}
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Download Template</CardTitle>
            <CardDescription>Get a CSV template with example data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Upload CSV File</CardTitle>
            <CardDescription>Select your completed CSV file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>
            {csvFile && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription>
                  {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {csvPreviewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview Data</CardTitle>
              <CardDescription>Review the first 10 rows of your CSV file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Origin</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreviewData.map((row: any, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.plan_name}</TableCell>
                        <TableCell>{row.nodo_origen}</TableCell>
                        <TableCell>{row.nodo_destino}</TableCell>
                        <TableCell>{row.fecha_programada}</TableCell>
                        <TableCell>{row.producto_codigo}</TableCell>
                        <TableCell>{row.carrier_name}</TableCell>
                        <TableCell>{row.status || "PENDING"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {csvFile && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Import Data</CardTitle>
              <CardDescription>Click the button below to start the import process</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleImportCSV} 
                disabled={!csvFile || importing} 
                className="w-full"
                size="lg"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : "Import Allocation Plan"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
