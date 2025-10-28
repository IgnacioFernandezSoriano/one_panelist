import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { EnvioForm } from "@/components/config/forms/EnvioForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export default function NuevoEnvio() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
            {t('button.back_to_allocation_plans')}
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('nuevo_envio.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('nuevo_envio.subtitle')}
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
