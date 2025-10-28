import { useState, useEffect } from "react";
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
  const [accountName, setAccountName] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const { toast } = useToast();
  const isEditing = !!initialData;
  
  const [formData, setFormData] = useState({
    commercial_name: initialData?.commercial_name || "",
    operator_type: initialData?.operator_type || "licensed_postal",
    status: initialData?.status || "active",
  });

  // Load account info and check if user is superadmin
  useEffect(() => {
    const loadAccountInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user data
        const { data: userData } = await supabase
          .from("usuarios")
          .select("id, cliente_id")
          .eq("email", user.email)
          .single();

        if (!userData) return;

        // Check if user is superadmin
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.id);

        const isSuperadminUser = rolesData?.some(r => r.role === "superadmin") || false;
        setIsSuperadmin(isSuperadminUser);

        if (isSuperadminUser) {
          // Load all accounts for superadmin
          const { data: accounts } = await supabase
            .from("clientes")
            .select("id, nombre")
            .eq("estado", "activo")
            .order("nombre");

          setAvailableAccounts(accounts || []);

          if (isEditing && initialData?.cliente_id) {
            setSelectedAccountId(initialData.cliente_id);
          } else if (userData.cliente_id) {
            setSelectedAccountId(userData.cliente_id);
          }
        } else {
          // For regular users, just show their account
          if (isEditing && initialData?.cliente_id) {
            const { data: clienteData } = await supabase
              .from("clientes")
              .select("nombre")
              .eq("id", initialData.cliente_id)
              .single();
            
            if (clienteData) {
              setAccountName(clienteData.nombre);
            }
            setSelectedAccountId(initialData.cliente_id);
          } else if (userData?.cliente_id) {
            const { data: clienteData } = await supabase
              .from("clientes")
              .select("nombre")
              .eq("id", userData.cliente_id)
              .single();
            
            if (clienteData) {
              setAccountName(clienteData.nombre);
            }
            setSelectedAccountId(userData.cliente_id);
          }
        }
      } catch (error) {
        console.error("Error loading account info:", error);
      } finally {
        setIsLoadingAccount(false);
      }
    };

    loadAccountInfo();
  }, [isEditing, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedAccountId) {
        throw new Error("Account is required");
      }

      let dataToSave: any = {
        commercial_name: formData.commercial_name,
        operator_type: formData.operator_type,
        status: formData.status,
        cliente_id: selectedAccountId,
      };

      // If creating, add required fields
      if (!isEditing) {
        dataToSave = {
          ...dataToSave,
          legal_name: formData.commercial_name,
          regulatory_status: "authorized",
        };
      }

      let error;
      if (isEditing) {
        // When editing, allow superadmins to change the account
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
        <Label htmlFor="account">Account *</Label>
        {isSuperadmin ? (
          <Select
            value={selectedAccountId?.toString()}
            onValueChange={(value) => setSelectedAccountId(parseInt(value))}
            disabled={isLoadingAccount}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingAccount ? "Loading..." : "Select an account"} />
            </SelectTrigger>
            <SelectContent>
              {availableAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="account"
            value={isLoadingAccount ? "Loading..." : accountName}
            disabled
            className="bg-muted"
          />
        )}
      </div>

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
