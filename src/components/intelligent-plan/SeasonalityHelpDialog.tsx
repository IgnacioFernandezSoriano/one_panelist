import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { Printer, Loader2 } from "lucide-react";

interface SeasonalityHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SeasonalityHelpDialog({ open, onOpenChange }: SeasonalityHelpDialogProps) {
  const { t, isLoading } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto print:max-w-full print:max-h-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t('intelligent_plan.help_title')}</DialogTitle>
            <Button onClick={handlePrint} variant="outline" size="sm" className="print:hidden">
              <Printer className="h-4 w-4 mr-2" />
              {t('intelligent_plan.print_help')}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:text-black text-sm">
          {/* Sección 1: Introducción */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '1. Introducción' :
               t('currentLanguage') === 'en' ? '1. Introduction' :
               t('currentLanguage') === 'fr' ? '1. Introduction' : '1. Introdução'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es' 
                ? 'La estacionalidad del producto define cómo se distribuyen los eventos a lo largo del año. Cada mes tiene asignado un porcentaje que representa la proporción de eventos que deben ocurrir en ese período.'
                : t('currentLanguage') === 'en'
                ? 'Product seasonality defines how events are distributed throughout the year. Each month is assigned a percentage representing the proportion of events that should occur in that period.'
                : t('currentLanguage') === 'fr'
                ? 'La saisonnalité du produit définit comment les événements sont distribués tout au long de l\'année. Chaque mois se voit attribuer un pourcentage représentant la proportion d\'événements devant se produire dans cette période.'
                : 'A sazonalidade do produto define como os eventos são distribuídos ao longo do ano. Cada mês tem uma porcentagem atribuída que representa a proporção de eventos que devem ocorrer nesse período.'}
            </p>
          </section>

          {/* Sección 2: Distribución Mensual */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '2. Distribución Mensual de Eventos' :
               t('currentLanguage') === 'en' ? '2. Monthly Event Distribution' :
               t('currentLanguage') === 'fr' ? '2. Distribution Mensuelle des Événements' : '2. Distribuição Mensal de Eventos'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es'
                ? 'El número de eventos por mes se calcula proporcionalmente basándose en el porcentaje asignado y el total de eventos del plan:'
                : t('currentLanguage') === 'en'
                ? 'The number of events per month is calculated proportionally based on the assigned percentage and the total plan events:'
                : t('currentLanguage') === 'fr'
                ? 'Le nombre d\'événements par mois est calculé proportionnellement en fonction du pourcentage attribué et du total des événements du plan:'
                : 'O número de eventos por mês é calculado proporcionalmente com base na porcentagem atribuída e no total de eventos do plano:'}
            </p>
            <div className="bg-muted p-4 rounded-md font-mono text-xs">
              Eventos_Mes = Total_Eventos × (Porcentaje_Mes / Suma_Porcentajes_Rango)
            </div>
            <div className="bg-accent/10 p-3 rounded-md border-l-4 border-primary">
              <p className="font-semibold">
                {t('currentLanguage') === 'es' ? 'Ejemplo:' :
                 t('currentLanguage') === 'en' ? 'Example:' :
                 t('currentLanguage') === 'fr' ? 'Exemple:' : 'Exemplo:'}
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>
                  {t('currentLanguage') === 'es' ? 'Total eventos: 1000' :
                   t('currentLanguage') === 'en' ? 'Total events: 1000' :
                   t('currentLanguage') === 'fr' ? 'Total événements: 1000' : 'Total de eventos: 1000'}
                </li>
                <li>
                  {t('currentLanguage') === 'es' ? 'Porcentaje Enero: 10%' :
                   t('currentLanguage') === 'en' ? 'January percentage: 10%' :
                   t('currentLanguage') === 'fr' ? 'Pourcentage janvier: 10%' : 'Porcentagem janeiro: 10%'}
                </li>
                <li>
                  {t('currentLanguage') === 'es' ? 'Resultado: 100 eventos en Enero' :
                   t('currentLanguage') === 'en' ? 'Result: 100 events in January' :
                   t('currentLanguage') === 'fr' ? 'Résultat: 100 événements en janvier' : 'Resultado: 100 eventos em janeiro'}
                </li>
              </ul>
            </div>
          </section>

          {/* Sección 3: Matriz de Clasificación */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '3. Matriz de Clasificación (A, B, C)' :
               t('currentLanguage') === 'en' ? '3. Classification Matrix (A, B, C)' :
               t('currentLanguage') === 'fr' ? '3. Matrice de Classification (A, B, C)' : '3. Matriz de Classificação (A, B, C)'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es'
                ? 'Las ciudades están clasificadas en tres tipos (A, B, C). La matriz de clasificación define qué porcentaje de eventos de cada tipo origen debe ir a cada tipo destino:'
                : t('currentLanguage') === 'en'
                ? 'Cities are classified into three types (A, B, C). The classification matrix defines what percentage of events from each origin type should go to each destination type:'
                : t('currentLanguage') === 'fr'
                ? 'Les villes sont classées en trois types (A, B, C). La matrice de classification définit quel pourcentage d\'événements de chaque type d\'origine doit aller vers chaque type de destination:'
                : 'As cidades são classificadas em três tipos (A, B, C). A matriz de classificação define qual porcentagem de eventos de cada tipo de origem deve ir para cada tipo de destino:'}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2">
                      {t('currentLanguage') === 'es' ? 'Origen → Destino' :
                       t('currentLanguage') === 'en' ? 'Origin → Destination' :
                       t('currentLanguage') === 'fr' ? 'Origine → Destination' : 'Origem → Destino'}
                    </th>
                    <th className="border border-border p-2">A</th>
                    <th className="border border-border p-2">B</th>
                    <th className="border border-border p-2">C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-2 font-semibold">A</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.34%</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2 font-semibold">B</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.34%</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2 font-semibold">C</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.33%</td>
                    <td className="border border-border p-2 text-center">33.34%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground italic">
              {t('currentLanguage') === 'es'
                ? '* Los porcentajes por defecto son equitativos, pero pueden configurarse según necesidad.'
                : t('currentLanguage') === 'en'
                ? '* Default percentages are equal, but can be configured as needed.'
                : t('currentLanguage') === 'fr'
                ? '* Les pourcentages par défaut sont égaux, mais peuvent être configurés selon les besoins.'
                : '* As porcentagens padrão são iguais, mas podem ser configuradas conforme necessário.'}
            </p>
          </section>

          {/* Sección 4: Cálculo por Ciudad */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '4. Cálculo de Eventos por Ciudad' :
               t('currentLanguage') === 'en' ? '4. Event Calculation per City' :
               t('currentLanguage') === 'fr' ? '4. Calcul d\'Événements par Ville' : '4. Cálculo de Eventos por Cidade'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es'
                ? 'Los eventos del mes se distribuyen entre todas las ciudades destino de cada tipo, considerando los requisitos de asignación configurados:'
                : t('currentLanguage') === 'en'
                ? 'Monthly events are distributed among all destination cities of each type, considering configured allocation requirements:'
                : t('currentLanguage') === 'fr'
                ? 'Les événements du mois sont distribués entre toutes les villes de destination de chaque type, en tenant compte des exigences d\'allocation configurées:'
                : 'Os eventos do mês são distribuídos entre todas as cidades de destino de cada tipo, considerando os requisitos de alocação configurados:'}
            </p>
            <div className="bg-muted p-4 rounded-md font-mono text-xs break-words">
              Eventos_Ciudad = (Eventos_Mes × Porcentaje_Matriz_Para_Tipo / 100) / N_Ciudades_Tipo
            </div>
          </section>

          {/* Sección 5: Selección de Nodos Origen */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '5. Selección de Nodos Origen' :
               t('currentLanguage') === 'en' ? '5. Origin Node Selection' :
               t('currentLanguage') === 'fr' ? '5. Sélection des Nœuds d\'Origine' : '5. Seleção de Nós de Origem'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es'
                ? 'Para cada evento, se selecciona un nodo origen de forma aleatoria entre los nodos activos de la clasificación correspondiente, respetando el límite máximo de eventos por semana configurado para cada panelista.'
                : t('currentLanguage') === 'en'
                ? 'For each event, an origin node is randomly selected from active nodes of the corresponding classification, respecting the maximum events per week limit configured for each panelist.'
                : t('currentLanguage') === 'fr'
                ? 'Pour chaque événement, un nœud d\'origine est sélectionné aléatoirement parmi les nœuds actifs de la classification correspondante, en respectant la limite maximale d\'événements par semaine configurée pour chaque panéliste.'
                : 'Para cada evento, um nó de origem é selecionado aleatoriamente entre os nós ativos da classificação correspondente, respeitando o limite máximo de eventos por semana configurado para cada panelista.'}
            </p>
          </section>

          {/* Sección 6: Validación */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '6. Validación de Porcentajes' :
               t('currentLanguage') === 'en' ? '6. Percentage Validation' :
               t('currentLanguage') === 'fr' ? '6. Validation des Pourcentages' : '6. Validação de Porcentagens'}
            </h3>
            <p className="text-muted-foreground">
              {t('currentLanguage') === 'es'
                ? 'La suma de todos los porcentajes mensuales debe ser exactamente 100% (con tolerancia de ±0.1%). El sistema muestra un indicador visual:'
                : t('currentLanguage') === 'en'
                ? 'The sum of all monthly percentages must be exactly 100% (with ±0.1% tolerance). The system displays a visual indicator:'
                : t('currentLanguage') === 'fr'
                ? 'La somme de tous les pourcentages mensuels doit être exactement 100% (avec une tolérance de ±0,1%). Le système affiche un indicateur visuel:'
                : 'A soma de todas as porcentagens mensais deve ser exatamente 100% (com tolerância de ±0,1%). O sistema exibe um indicador visual:'}
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li className="text-green-600 font-semibold">
                ✓ {t('intelligent_plan.valid_distribution')}
              </li>
              <li className="text-destructive font-semibold">
                ✗ {t('intelligent_plan.invalid_distribution')}
              </li>
            </ul>
          </section>

          {/* Sección 7: Ejemplo Completo */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-primary">
              {t('currentLanguage') === 'es' ? '7. Ejemplo Práctico Completo' :
               t('currentLanguage') === 'en' ? '7. Complete Practical Example' :
               t('currentLanguage') === 'fr' ? '7. Exemple Pratique Complet' : '7. Exemplo Prático Completo'}
            </h3>
            <div className="bg-accent/10 p-4 rounded-md border border-border space-y-3">
              <div>
                <p className="font-semibold mb-2">
                  {t('currentLanguage') === 'es' ? 'Configuración:' :
                   t('currentLanguage') === 'en' ? 'Configuration:' :
                   t('currentLanguage') === 'fr' ? 'Configuration:' : 'Configuração:'}
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                  <li>
                    {t('currentLanguage') === 'es' ? 'Total de eventos: 1,200' :
                     t('currentLanguage') === 'en' ? 'Total events: 1,200' :
                     t('currentLanguage') === 'fr' ? 'Total événements: 1,200' : 'Total de eventos: 1.200'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Rango: Enero - Marzo' :
                     t('currentLanguage') === 'en' ? 'Range: January - March' :
                     t('currentLanguage') === 'fr' ? 'Plage: Janvier - Mars' : 'Intervalo: Janeiro - Março'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Estacionalidad: Enero 40%, Febrero 30%, Marzo 30%' :
                     t('currentLanguage') === 'en' ? 'Seasonality: January 40%, February 30%, March 30%' :
                     t('currentLanguage') === 'fr' ? 'Saisonnalité: Janvier 40%, Février 30%, Mars 30%' : 'Sazonalidade: Janeiro 40%, Fevereiro 30%, Março 30%'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Cliente con: 2 ciudades A, 3 ciudades B, 5 ciudades C' :
                     t('currentLanguage') === 'en' ? 'Client with: 2 cities A, 3 cities B, 5 cities C' :
                     t('currentLanguage') === 'fr' ? 'Client avec: 2 villes A, 3 villes B, 5 villes C' : 'Cliente com: 2 cidades A, 3 cidades B, 5 cidades C'}
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">
                  {t('currentLanguage') === 'es' ? 'Resultado de distribución:' :
                   t('currentLanguage') === 'en' ? 'Distribution result:' :
                   t('currentLanguage') === 'fr' ? 'Résultat de la distribution:' : 'Resultado da distribuição:'}
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                  <li>
                    {t('currentLanguage') === 'es' ? 'Enero: 480 eventos (40%)' :
                     t('currentLanguage') === 'en' ? 'January: 480 events (40%)' :
                     t('currentLanguage') === 'fr' ? 'Janvier: 480 événements (40%)' : 'Janeiro: 480 eventos (40%)'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Febrero: 360 eventos (30%)' :
                     t('currentLanguage') === 'en' ? 'February: 360 events (30%)' :
                     t('currentLanguage') === 'fr' ? 'Février: 360 événements (30%)' : 'Fevereiro: 360 eventos (30%)'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Marzo: 360 eventos (30%)' :
                     t('currentLanguage') === 'en' ? 'March: 360 events (30%)' :
                     t('currentLanguage') === 'fr' ? 'Mars: 360 événements (30%)' : 'Março: 360 eventos (30%)'}
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">
                  {t('currentLanguage') === 'es' ? 'Para cada mes, aplicando matriz 33/33/34:' :
                   t('currentLanguage') === 'en' ? 'For each month, applying 33/33/34 matrix:' :
                   t('currentLanguage') === 'fr' ? 'Pour chaque mois, en appliquant la matrice 33/33/34:' : 'Para cada mês, aplicando matriz 33/33/34:'}
                </p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                  <li>
                    {t('currentLanguage') === 'es' ? 'Ciudades A reciben: ~160 eventos/mes → 80 eventos/ciudad' :
                     t('currentLanguage') === 'en' ? 'Cities A receive: ~160 events/month → 80 events/city' :
                     t('currentLanguage') === 'fr' ? 'Villes A reçoivent: ~160 événements/mois → 80 événements/ville' : 'Cidades A recebem: ~160 eventos/mês → 80 eventos/cidade'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Ciudades B reciben: ~160 eventos/mes → 53 eventos/ciudad' :
                     t('currentLanguage') === 'en' ? 'Cities B receive: ~160 events/month → 53 events/city' :
                     t('currentLanguage') === 'fr' ? 'Villes B reçoivent: ~160 événements/mois → 53 événements/ville' : 'Cidades B recebem: ~160 eventos/mês → 53 eventos/cidade'}
                  </li>
                  <li>
                    {t('currentLanguage') === 'es' ? 'Ciudades C reciben: ~163 eventos/mes → 33 eventos/ciudad' :
                     t('currentLanguage') === 'en' ? 'Cities C receive: ~163 events/month → 33 events/city' :
                     t('currentLanguage') === 'fr' ? 'Villes C reçoivent: ~163 événements/mois → 33 événements/ville' : 'Cidades C recebem: ~163 eventos/mês → 33 eventos/cidade'}
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
