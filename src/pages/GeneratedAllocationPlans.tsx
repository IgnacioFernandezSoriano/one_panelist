import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/hooks/useTranslation";
import { Search, FileDown, Trash2, RefreshCw, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AllocationPlan {
  id: number;
  plan_name: string;
  generation_date: string;
  status: string;
  notes?: string;
  created_by?: number;
  cliente_id: number;
  detail_count?: number;
}

interface AllocationPlanDetail {
  id: number;
  plan_id: number;
  nodo_origen: string;
  nodo_destino: string;
  producto_id: number;
  carrier_id: number;
  cantidad: number;
  productos_cliente?: {
    nombre_producto: string;
    codigo_producto: string;
  };
  carriers?: {
    legal_name: string;
    carrier_code: string;
  };
}

export default function GeneratedAllocationPlans() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<AllocationPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const { toast } = useToast();
  const [changeStatusDialogOpen, setChangeStatusDialogOpen] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<AllocationPlanDetail[]>([]);
  const [selectedPlanName, setSelectedPlanName] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data: plansData, error: plansError } = await supabase
        .from("generated_allocation_plans")
        .select("*")
        .order("generation_date", { ascending: false });

      if (plansError) throw plansError;

      // Load detail counts for each plan
      const plansWithCounts = await Promise.all(
        (plansData || []).map(async (plan) => {
          const { count } = await supabase
            .from("generated_allocation_plan_details")
            .select("*", { count: "exact", head: true })
            .eq("plan_id", plan.id);

          return {
            ...plan,
            detail_count: count || 0,
          };
        })
      );

      setPlans(plansWithCounts);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load allocation plans",
        variant: "destructive",
      });
      console.error("Error loading plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (planId: number, planName: string) => {
    try {
      const { data, error } = await supabase
        .from("generated_allocation_plan_details")
        .select(`
          *,
          productos_cliente:producto_id (
            nombre_producto,
            codigo_producto
          ),
          carriers:carrier_id (
            legal_name,
            carrier_code
          )
        `)
        .eq("plan_id", planId);

      if (error) throw error;

      setSelectedPlanDetails(data || []);
      setSelectedPlanName(planName);
      setViewDetailsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load plan details",
        variant: "destructive",
      });
      console.error("Error loading details:", error);
    }
  };

  const exportCSV = () => {
    try {
      const csvData = filteredPlans.map(plan => ({
        id: plan.id,
        plan_name: plan.plan_name,
        generation_date: plan.generation_date,
        status: plan.status,
        detail_count: plan.detail_count || 0,
        notes: plan.notes || '',
      }));

      const csv = Papa.unparse(csvData, {
        quotes: true,
        header: true
      });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Allocation_Plans_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${csvData.length} allocation plans`,
      });
    } catch (error: any) {
      toast({
        title: "Export error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = !searchTerm || 
      plan.id.toString().includes(searchTerm.toLowerCase()) ||
      (plan.plan_name && plan.plan_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (plan.status && plan.status.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || plan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = filteredPlans.slice(startIndex, endIndex);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPlans.map(p => p.id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      // First delete details
      const { error: detailsError } = await supabase
        .from("generated_allocation_plan_details")
        .delete()
        .in("plan_id", selectedIds);

      if (detailsError) throw detailsError;

      // Then delete plans
      const { error: plansError } = await supabase
        .from("generated_allocation_plans")
        .delete()
        .in("id", selectedIds);

      if (plansError) throw plansError;

      toast({
        title: "Success",
        description: `Deleted ${selectedIds.length} allocation plan(s)`,
      });

      setSelectedIds([]);
      setDeleteDialogOpen(false);
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not delete allocation plans",
        variant: "destructive",
      });
      console.error("Error deleting plans:", error);
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatusValue) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("generated_allocation_plans")
        .update({ status: newStatusValue })
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated status for ${selectedIds.length} plan(s)`,
      });

      setSelectedIds([]);
      setChangeStatusDialogOpen(false);
      setNewStatusValue("");
      loadPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not update status",
        variant: "destructive",
      });
      console.error("Error updating status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      sent: { variant: "default", className: "bg-blue-100 text-blue-800" },
      received: { variant: "default", className: "bg-green-100 text-green-800" },
      notified: { variant: "default", className: "bg-purple-100 text-purple-800" },
      cancelled: { variant: "destructive", className: "bg-red-100 text-red-800" },
    };
    return statusMap[status] || { variant: "secondary", className: "" };
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Generated Allocation Plans</h1>
            <p className="text-muted-foreground mt-1">
              View and manage generated allocation plans
            </p>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by ID, name, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="notified">Notified</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </Card>

        {filteredPlans.length > 0 && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredPlans.length)} of {filteredPlans.length} record(s)
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setChangeStatusDialogOpen(true)}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Change Status
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading allocation plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No allocation plans found</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedPlans.map((plan) => (
                <Card key={plan.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.includes(plan.id)}
                      onCheckedChange={() => toggleSelection(plan.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          #{plan.id} • {plan.plan_name}
                        </h3>
                        <Badge 
                          variant={getStatusBadge(plan.status).variant}
                          className={getStatusBadge(plan.status).className}
                        >
                          {plan.status}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Generated:</span>
                          <p className="font-medium">
                            {format(new Date(plan.generation_date), "MMM dd, yyyy HH:mm")}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Details:</span>
                          <p className="font-medium">{plan.detail_count || 0} line items</p>
                        </div>
                      </div>

                      {plan.notes && (
                        <div className="text-sm text-muted-foreground mb-3">
                          <span className="font-medium">Notes:</span> {plan.notes}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleViewDetails(plan.id, plan.plan_name)}
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} allocation plan(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={changeStatusDialogOpen} onOpenChange={setChangeStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                New Status for {selectedIds.length} plan(s)
              </label>
              <Select value={newStatusValue} onValueChange={setNewStatusValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="notified">Notified</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setChangeStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleChangeStatus}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Details: {selectedPlanName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPlanDetails.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No details found</p>
            ) : (
              <div className="space-y-2">
                {selectedPlanDetails.map((detail, index) => (
                  <Card key={detail.id} className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Line:</span>
                        <p className="font-medium">#{index + 1}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Origin:</span>
                        <p className="font-medium font-mono">{detail.nodo_origen}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Destination:</span>
                        <p className="font-medium font-mono">{detail.nodo_destino}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Product:</span>
                        <p className="font-medium">
                          {detail.productos_cliente?.codigo_producto || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Carrier:</span>
                        <p className="font-medium">
                          {detail.carriers?.carrier_code || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>
                        <p className="font-medium">{detail.cantidad}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
