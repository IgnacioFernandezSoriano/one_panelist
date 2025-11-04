import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";

interface IssuesData {
  summary: {
    open_count: number;
    in_progress_count: number;
    resolved_count: number;
    total_count: number;
  };
  by_type: Array<{ tipo: string; count: number }>;
  affected_routes: Array<{
    nodo_origen: string;
    nodo_destino: string;
    issue_count: number;
  }>;
}

interface IssuesAnalysisProps {
  data: IssuesData;
  loading?: boolean;
}

export function IssuesAnalysis({ data, loading }: IssuesAnalysisProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Issues Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  const pieData = data.by_type?.map((item, index) => ({
    name: item.tipo,
    value: item.count,
    fill: COLORS[index % COLORS.length]
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issues Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open</p>
                  <p className="text-3xl font-bold text-red-600">{data.summary.open_count}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-600">{data.summary.in_progress_count}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-3xl font-bold text-green-600">{data.summary.resolved_count}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-4">Issues by Type</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No issues data available</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-4">Most Affected Routes</h3>
            <div className="space-y-2">
              {data.affected_routes?.slice(0, 5).map((route, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm font-medium">
                    {route.nodo_origen} → {route.nodo_destino}
                  </span>
                  <span className="text-sm font-bold text-red-600">{route.issue_count}</span>
                </div>
              )) || <p className="text-sm text-muted-foreground">No affected routes</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
