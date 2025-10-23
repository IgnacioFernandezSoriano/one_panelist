import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EnvioForm } from "@/components/config/forms/EnvioForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NuevoEnvio() {
  const navigate = useNavigate();

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
            Volver a Allocation Plans
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Nuevo Allocation Plan
          </h1>
          <p className="text-muted-foreground">
            Crear un nuevo plan de asignación de envíos
          </p>
        </div>

        <Card className="p-6 max-w-4xl">
          <EnvioForm
            onSuccess={() => navigate("/envios")}
            onCancel={() => navigate("/envios")}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
