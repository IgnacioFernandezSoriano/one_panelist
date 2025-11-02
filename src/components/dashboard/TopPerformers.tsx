import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Panelist {
  id: string;
  name: string;
  shipments: number;
  successRate: number;
  reason?: string;
}

interface TopPerformersProps {
  topPerformers: Panelist[];
  needsAttention: Panelist[];
}

export function TopPerformers({ topPerformers, needsAttention }: TopPerformersProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Trophy className="w-5 h-5" />
            Top 5 Panelistas (Este Mes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay datos suficientes para mostrar top performers.
            </p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map((panelist, index) => (
                <div
                  key={panelist.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{panelist.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        {panelist.shipments} envíos | {panelist.successRate}% éxito
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            Requieren Atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">
                ¡Excelente! Todos los panelistas están rindiendo bien.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {needsAttention.map((panelist) => (
                <div
                  key={panelist.id}
                  className="p-3 bg-white rounded-lg border border-orange-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{panelist.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {panelist.shipments} envíos | {panelist.successRate}% éxito
                      </p>
                    </div>
                  </div>
                  {panelist.reason && (
                    <p className="text-xs text-orange-600 mb-2">
                      Motivo: {panelist.reason}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => navigate(`/panelistas`)}
                  >
                    Ver Detalles
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
