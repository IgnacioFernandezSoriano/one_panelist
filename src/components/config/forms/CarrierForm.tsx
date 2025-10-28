import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    commercial_name: initialData?.commercial_name || "",
    operator_type: initialData?.operator_type || "licensed_postal",
    status: initialData?.status || "active",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let dataToSave: any = {
        commercial_name: formData.commercial_name,
        operator_type: formData.operator_type,
        status: formData.status,
      };

      // If creating, add cliente_id and required fields
      if (!isEditing) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        const { data: userData } = await supabase
          .from("usuarios")
          .select("cliente_id")
          .eq("email", user.email)
          .single();

        if (!userData?.cliente_id) {
          throw new Error("User has no associated account");
        }

        dataToSave = {
          ...dataToSave,
          cliente_id: userData.cliente_id,
          legal_name: formData.commercial_name, // Use commercial name as legal name
          regulatory_status: "authorized", // Default value
        };
      }

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

      if (error) throw error;

      toast({ 
        title: `Carrier ${isEditing ? "updated" : "created"} successfully` 
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: `Error ${isEditing ? "updating" : "creating"} carrier`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="commercial_name">Commercial Name *</Label>
        <Input
          id="commercial_name"
          value={formData.commercial_name}
          onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
          required
          placeholder="e.g., DHL, FedEx, Correos"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="operator_type">Operator Type *</Label>
        <Select
          value={formData.operator_type}
          onValueChange={(value) => setFormData({ ...formData, operator_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="designated_usp">Designated USP</SelectItem>
            <SelectItem value="licensed_postal">Licensed Postal</SelectItem>
            <SelectItem value="express_courier">Express Courier</SelectItem>
            <SelectItem value="ecommerce_parcel">E-commerce Parcel</SelectItem>
            <SelectItem value="exempt">Exempt</SelectItem>
            <SelectItem value="others">Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
