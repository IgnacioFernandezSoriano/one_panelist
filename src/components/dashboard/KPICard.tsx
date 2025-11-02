import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  target?: string | number;
  targetLabel?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  trendData?: number[];
}

export function KPICard({
  title,
  value,
  unit = "",
  change,
  changeLabel = "vs mes anterior",
  target,
  targetLabel = "Objetivo",
  icon: Icon,
  color,
  bgColor,
  trendData = [],
}: KPICardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) {
      return <Minus className="w-4 h-4" />;
    }
    return change > 0 ? (
      <ArrowUp className="w-4 h-4" />
    ) : (
      <ArrowDown className="w-4 h-4" />
    );
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-gray-500";
    return change > 0 ? "text-green-600" : "text-red-600";
  };

  const chartData = trendData.map((value, index) => ({
    name: index.toString(),
    value,
  }));

  return (
    <Card className="border-border hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-1">
          {value}
          {unit && <span className="text-xl ml-1">{unit}</span>}
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()} mb-2`}>
            {getTrendIcon()}
            <span className="font-medium">
              {change > 0 ? "+" : ""}
              {change}
              {unit}
            </span>
            <span className="text-muted-foreground text-xs">{changeLabel}</span>
          </div>
        )}

        {target && (
          <p className="text-xs text-muted-foreground mb-2">
            {targetLabel}: <span className="font-semibold">{target}{unit}</span>
          </p>
        )}

        {chartData.length > 0 && (
          <div className="h-12 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color.replace("text-", "#")}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
