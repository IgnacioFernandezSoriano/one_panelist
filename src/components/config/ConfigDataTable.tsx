import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CSVImporter } from "@/components/import/CSVImporter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ConfigDataTableProps {
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onCreate?: () => void;
  isLoading?: boolean;
  csvConfig?: {
    tableName: string;
    expectedColumns: string[];
    exampleData: string[][];
  };
}

export function ConfigDataTable({ 
  title, 
  data, 
  columns, 
  onEdit, 
  onDelete, 
  onCreate,
  isLoading,
  csvConfig
}: ConfigDataTableProps) {
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <div className="flex gap-2">
              {csvConfig && (
                <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Import {title} from CSV</DialogTitle>
                    </DialogHeader>
                    <CSVImporter
                      tableName={csvConfig.tableName}
                      tableLabel={title}
                      expectedColumns={csvConfig.expectedColumns}
                      exampleData={csvConfig.exampleData}
                      onImportComplete={() => {
                        setCsvDialogOpen(false);
                        window.location.reload();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {onCreate && (
                <Button size="sm" onClick={onCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No records found. Add new records or import from CSV.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow key={item.id || index}>
                      {columns.map((col) => (
                        <TableCell key={col.key}>
                          {item[col.key]?.toString() || "-"}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(item)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}