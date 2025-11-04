import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface Route {
  nodo_origen: string;
  nodo_destino: string;
  clasificacion_origen: string;
  clasificacion_destino: string;
  total_events: number;
  route_score: number;
  on_time_rate: number;
}

interface RouteRankingProps {
  routes: Route[];
  loading?: boolean;
}

export function RouteRanking({ routes, loading }: RouteRankingProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Route Performance Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const topRoutes = routes.slice(0, 5);
  const worstRoutes = routes.slice(-5).reverse();

  const RouteItem = ({ route, rank, type }: { route: Route; rank: number; type: 'top' | 'worst' }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
          type === 'top' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {rank}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">{route.nodo_origen}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{route.nodo_destino}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {route.clasificacion_origen} → {route.clasificacion_destino}
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold">{route.route_score}</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
        <div className="text-right">
          <p className="text-sm">{route.on_time_rate}%</p>
          <p className="text-xs text-muted-foreground">On-time</p>
        </div>
        <div className="text-right">
          <p className="text-sm">{route.total_events}</p>
          <p className="text-xs text-muted-foreground">Events</p>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Performance Ranking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Top 5 Routes</h3>
          </div>
          <div className="space-y-2">
            {topRoutes.map((route, idx) => (
              <RouteItem key={idx} route={route} rank={idx + 1} type="top" />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold">Bottom 5 Routes</h3>
          </div>
          <div className="space-y-2">
            {worstRoutes.map((route, idx) => (
              <RouteItem key={idx} route={route} rank={routes.length - idx} type="worst" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
