import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TrendData {
  date: string;
  volume: number;
  successRate: number;
}

interface TrendChartProps {
  data: TrendData[];
  targetRate?: number;
}

export function TrendChart({ data, targetRate = 90 }: TrendChartProps) {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Evolución de Envíos y Rendimiento (Últimos 30 días)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis
              yAxisId="left"
              label={{ value: "Volumen", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              label={{ value: "% Éxito", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-semibold mb-1">
                        {new Date(data.date).toLocaleDateString("es-ES")}
                      </p>
                      <p className="text-sm text-blue-600">
                        Volumen: <span className="font-bold">{data.volume}</span> envíos
                      </p>
                      <p className="text-sm text-green-600">
                        Éxito: <span className="font-bold">{data.successRate}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine
              yAxisId="right"
              y={targetRate}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{ value: `Objetivo ${targetRate}%`, position: "right" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="volume"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Volumen de envíos"
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="successRate"
              stroke="#10B981"
              strokeWidth={2}
              name="% Entregas a tiempo"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
