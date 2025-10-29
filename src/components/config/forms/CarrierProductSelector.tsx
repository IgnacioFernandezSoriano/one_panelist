import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CarrierProductSelectorProps {
  clienteId: number;
  selectedCarrierIds: number[];
  onChange: (ids: number[]) => void;
}

interface Carrier {
  id: number;
  commercial_name: string;
  operator_type: string;
}

export function CarrierProductSelector({
  clienteId,
  selectedCarrierIds,
  onChange,
}: CarrierProductSelectorProps) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarriers();
  }, [clienteId]);

  const loadCarriers = async () => {
    try {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, commercial_name, operator_type")
        .eq("cliente_id", clienteId)
        .eq("status", "active")
        .order("commercial_name");

      if (error) throw error;
      setCarriers(data || []);
    } catch (error) {
      console.error("Error loading carriers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (carrierId: number) => {
    const newIds = selectedCarrierIds.includes(carrierId)
      ? selectedCarrierIds.filter(id => id !== carrierId)
      : [...selectedCarrierIds, carrierId];
    onChange(newIds);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading carriers...</div>;
  }

  if (carriers.length === 0) {
    return <div className="text-sm text-muted-foreground">No active carriers found</div>;
  }

  return (
    <ScrollArea className="h-[200px] border rounded-md p-4">
      <div className="space-y-3">
        {carriers.map((carrier) => (
          <div key={carrier.id} className="flex items-center space-x-2">
            <Checkbox
              id={`carrier-${carrier.id}`}
              checked={selectedCarrierIds.includes(carrier.id)}
              onCheckedChange={() => handleToggle(carrier.id)}
            />
            <Label
              htmlFor={`carrier-${carrier.id}`}
              className="text-sm font-normal cursor-pointer flex-1"
            >
              {carrier.commercial_name} ({carrier.operator_type})
            </Label>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
