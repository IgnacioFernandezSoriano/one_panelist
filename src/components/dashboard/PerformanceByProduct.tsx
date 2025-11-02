import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProductPerformance {
  name: string;
  successRate: number;
  total: number;
}

interface PerformanceByProductProps {
  data: ProductPerformance[];
}

export function PerformanceByProduct({ data }: PerformanceByProductProps) {
  const getColor = (rate: number) => {
    if (rate >= 90) return "#10B981"; // green
    if (rate >= 80) return "#F59E0B"; // yellow
    return "#EF4444"; // red
  };

  const sortedData = [...data].sort((a, b) => b.successRate - a.successRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por Producto</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sortedData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-sm">
                        Tasa de éxito: <span className="font-bold">{data.successRate}%</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total envíos: {data.total}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="successRate" radius={[0, 8, 8, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.successRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
