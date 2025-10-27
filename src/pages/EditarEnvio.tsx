import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EnvioForm } from "@/components/config/forms/EnvioForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function EditarEnvio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [envio, setEnvio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnvio();
  }, [id]);

  const loadEnvio = async () => {
    if (!id) {
      navigate("/envios");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("envios")
        .select("*")
        .eq("id", parseInt(id))
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Error",
          description: "Allocation plan not found",
          variant: "destructive",
        });
        navigate("/envios");
        return;
      }

      setEnvio(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/envios");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/envios")}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Allocation Plans
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Edit Allocation Plan #{id}
          </h1>
          <p className="text-muted-foreground">
            Update shipment allocation plan details
          </p>
        </div>

        <Card className="p-6 max-w-4xl">
          {envio && (
            <EnvioForm
              initialData={envio}
              onSuccess={() => navigate("/envios")}
              onCancel={() => navigate("/envios")}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
