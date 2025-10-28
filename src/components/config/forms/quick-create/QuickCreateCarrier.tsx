import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuickCreateCarrierProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newCarrier: any) => void;
}

export function QuickCreateCarrier({ open, onOpenChange, onSuccess }: QuickCreateCarrierProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    commercial_name: "",
    operator_type: "licensed_postal",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current user's cliente_id
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

      const { data, error } = await supabase
        .from("carriers")
        .insert([{
          commercial_name: formData.commercial_name,
          legal_name: formData.commercial_name,
          operator_type: formData.operator_type as any,
          cliente_id: userData.cliente_id,
          regulatory_status: "authorized" as any,
          status: "active"
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Carrier created",
        description: "New carrier has been created successfully",
      });

      onSuccess(data);
      onOpenChange(false);
      setFormData({ commercial_name: "", operator_type: "licensed_postal" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Carrier</DialogTitle>
        </DialogHeader>
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
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
