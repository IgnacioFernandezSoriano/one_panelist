import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Calculator } from "lucide-react";
import CityRequirementsTab from "@/components/plan-generator/CityRequirementsTab";
import ProductSeasonalityTab from "@/components/plan-generator/ProductSeasonalityTab";
import CurrentEventsTab from "@/components/plan-generator/CurrentEventsTab";
import { useTranslation } from "@/hooks/useTranslation";
import { AppLayout } from "@/components/layout/AppLayout";

const PlanGenerator = () => {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('plan_generator.title')}</h1>
            <p className="text-muted-foreground">
              {t('plan_generator.description')}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <Tabs defaultValue="city-requirements" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="city-requirements">
                {t('plan_generator.city_requirements')}
              </TabsTrigger>
              <TabsTrigger value="seasonality">
                {t('plan_generator.product_seasonality')}
              </TabsTrigger>
              <TabsTrigger value="current-events">
                {t('plan_generator.current_events')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="city-requirements" className="mt-6">
              <CityRequirementsTab />
            </TabsContent>

            <TabsContent value="seasonality" className="mt-6">
              <ProductSeasonalityTab />
            </TabsContent>

            <TabsContent value="current-events" className="mt-6">
              <CurrentEventsTab />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PlanGenerator;
