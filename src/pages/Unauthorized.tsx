import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <ShieldX className="h-24 w-24 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">{t('unauthorized.title')}</h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {t('unauthorized.message')}
        </p>
        <Button onClick={() => navigate("/dashboard")}>
          {t('unauthorized.go_to_dashboard')}
        </Button>
      </div>
    </AppLayout>
  );
}
