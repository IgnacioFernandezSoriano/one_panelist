import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CarrierFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export function CarrierForm({ onSuccess, onCancel, initialData }: CarrierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = !!initialData;
  
  const [formData, setFormData] = useState({
    legal_name: initialData?.legal_name || "",
    commercial_name: initialData?.commercial_name || "",
    tax_id: initialData?.tax_id || "",
    operator_type: initialData?.operator_type || "courier",
    regulatory_status: initialData?.regulatory_status || "authorized",
    geographic_scope: initialData?.geographic_scope || "national",
    status: initialData?.status || "active",
    
    license_number: initialData?.license_number || "",
    authorization_date: initialData?.authorization_date || "",
    license_expiration_date: initialData?.license_expiration_date || "",
    guarantee_amount: initialData?.guarantee_amount || "",
    declared_coverage: initialData?.declared_coverage || "",
    number_of_branches: initialData?.number_of_branches || "",
    
    legal_representative: initialData?.legal_representative || "",
    legal_address: initialData?.legal_address || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    website: initialData?.website || "",
    
    tracking_api_url: initialData?.tracking_api_url || "",
    regulator_data_api_url: initialData?.regulator_data_api_url || "",
    report_format: initialData?.report_format || "json",
    notes: initialData?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSave = {
      ...formData,
      guarantee_amount: formData.guarantee_amount ? parseFloat(formData.guarantee_amount) : null,
      number_of_branches: formData.number_of_branches ? parseInt(formData.number_of_branches) : null,
      authorization_date: formData.authorization_date || null,
      license_expiration_date: formData.license_expiration_date || null,
      commercial_name: formData.commercial_name || null,
      tax_id: formData.tax_id || null,
      license_number: formData.license_number || null,
      legal_representative: formData.legal_representative || null,
      legal_address: formData.legal_address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      website: formData.website || null,
      declared_coverage: formData.declared_coverage || null,
      tracking_api_url: formData.tracking_api_url || null,
      regulator_data_api_url: formData.regulator_data_api_url || null,
      report_format: formData.report_format || null,
      notes: formData.notes || null,
    };

    let error;
    if (isEditing) {
      const result = await supabase
        .from("carriers")
        .update(dataToSave)
        .eq("id", initialData.id);
      error = result.error;
    } else {
      const result = await supabase.from("carriers").insert([dataToSave]);
      error = result.error;
    }

    if (error) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} carrier`,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `Carrier ${isEditing ? "updated" : "created"} successfully` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
          Configure carrier/postal operator information including legal, regulatory, and technical integration details.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Legal Name *</Label>
            <Input
              id="legal_name"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              required
              placeholder="e.g., Correos y Telégrafos S.A."
            />
            <p className="text-xs text-muted-foreground">
              Official registered legal name of the company
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commercial_name">Commercial Name</Label>
              <Input
                id="commercial_name"
                value={formData.commercial_name}
                onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
                placeholder="e.g., Correos"
              />
              <p className="text-xs text-muted-foreground">
                Brand or commercial name used publicly
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / NIF</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="e.g., A12345678"
              />
              <p className="text-xs text-muted-foreground">
                Tax identification number
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operator_type">Operator Type *</Label>
              <Select value={formData.operator_type} onValueChange={(value) => setFormData({ ...formData, operator_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="universal_postal">Universal Postal</SelectItem>
                  <SelectItem value="private_postal">Private Postal</SelectItem>
                  <SelectItem value="courier">Courier</SelectItem>
                  <SelectItem value="logistics">Logistics</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Type of postal/delivery operator
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regulatory_status">Regulatory Status *</Label>
              <Select value={formData.regulatory_status} onValueChange={(value) => setFormData({ ...formData, regulatory_status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authorized">Authorized</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="sanctioned">Sanctioned</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current regulatory authorization status
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="geographic_scope">Geographic Scope *</Label>
              <Select value={formData.geographic_scope} onValueChange={(value) => setFormData({ ...formData, geographic_scope: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Geographic coverage authorization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="regulatory" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="license_number">License Number</Label>
            <Input
              id="license_number"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              placeholder="e.g., LIC-2024-001"
            />
            <p className="text-xs text-muted-foreground">
              Official license or authorization number
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="authorization_date">Authorization Date</Label>
              <Input
                id="authorization_date"
                type="date"
                value={formData.authorization_date}
                onChange={(e) => setFormData({ ...formData, authorization_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Date when license was granted
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license_expiration_date">License Expiration</Label>
              <Input
                id="license_expiration_date"
                type="date"
                value={formData.license_expiration_date}
                onChange={(e) => setFormData({ ...formData, license_expiration_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Date when license expires (if applicable)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guarantee_amount">Guarantee Amount (€)</Label>
            <Input
              id="guarantee_amount"
              type="number"
              step="0.01"
              value={formData.guarantee_amount}
              onChange={(e) => setFormData({ ...formData, guarantee_amount: e.target.value })}
              placeholder="e.g., 100000.00"
            />
            <p className="text-xs text-muted-foreground">
              Financial guarantee or bond amount required
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="number_of_branches">Number of Branches</Label>
            <Input
              id="number_of_branches"
              type="number"
              value={formData.number_of_branches}
              onChange={(e) => setFormData({ ...formData, number_of_branches: e.target.value })}
              placeholder="e.g., 50"
            />
            <p className="text-xs text-muted-foreground">
              Total number of physical locations
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="declared_coverage">Declared Coverage Areas</Label>
            <Textarea
              id="declared_coverage"
              value={formData.declared_coverage}
              onChange={(e) => setFormData({ ...formData, declared_coverage: e.target.value })}
              rows={3}
              placeholder="List of cities, regions, or areas covered..."
            />
            <p className="text-xs text-muted-foreground">
              Description of geographic coverage areas
            </p>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="legal_representative">Legal Representative</Label>
            <Input
              id="legal_representative"
              value={formData.legal_representative}
              onChange={(e) => setFormData({ ...formData, legal_representative: e.target.value })}
              placeholder="Full name of legal representative"
            />
            <p className="text-xs text-muted-foreground">
              Name of the company's legal representative
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal_address">Legal Address</Label>
            <Textarea
              id="legal_address"
              value={formData.legal_address}
              onChange={(e) => setFormData({ ...formData, legal_address: e.target.value })}
              rows={3}
              placeholder="Complete legal/fiscal address..."
            />
            <p className="text-xs text-muted-foreground">
              Official registered address for legal purposes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+34 900 123 456"
              />
              <p className="text-xs text-muted-foreground">
                Main contact phone number
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@carrier.com"
              />
              <p className="text-xs text-muted-foreground">
                Main contact email address
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.carrier.com"
            />
            <p className="text-xs text-muted-foreground">
              Official company website
            </p>
          </div>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="tracking_api_url">Tracking API URL</Label>
            <Input
              id="tracking_api_url"
              type="url"
              value={formData.tracking_api_url}
              onChange={(e) => setFormData({ ...formData, tracking_api_url: e.target.value })}
              placeholder="https://api.carrier.com/tracking"
            />
            <p className="text-xs text-muted-foreground">
              URL endpoint for shipment tracking integration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regulator_data_api_url">Regulator Data API URL</Label>
            <Input
              id="regulator_data_api_url"
              type="url"
              value={formData.regulator_data_api_url}
              onChange={(e) => setFormData({ ...formData, regulator_data_api_url: e.target.value })}
              placeholder="https://api.regulator.gov/carriers"
            />
            <p className="text-xs text-muted-foreground">
              URL endpoint for regulatory reporting integration
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_format">Report Format</Label>
            <Select value={formData.report_format} onValueChange={(value) => setFormData({ ...formData, report_format: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xml">XML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Preferred format for data exchange and reporting
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Additional notes, observations, or technical details..."
            />
            <p className="text-xs text-muted-foreground">
              Internal notes and additional information
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Carrier" : "Create Carrier")}
        </Button>
      </div>
    </form>
  );
}