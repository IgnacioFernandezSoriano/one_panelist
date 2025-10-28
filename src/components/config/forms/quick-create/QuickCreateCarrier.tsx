import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    legal_name: "",
    commercial_name: "",
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
          ...formData,
          cliente_id: userData.cliente_id,
          operator_type: "licensed_postal",
          regulatory_status: "authorized"
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
      setFormData({ legal_name: "", commercial_name: "" });
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
            <Label htmlFor="legal_name">Legal Name *</Label>
            <Input
              id="legal_name"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commercial_name">Commercial Name</Label>
            <Input
              id="commercial_name"
              value={formData.commercial_name}
              onChange={(e) => setFormData({ ...formData, commercial_name: e.target.value })}
            />
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
