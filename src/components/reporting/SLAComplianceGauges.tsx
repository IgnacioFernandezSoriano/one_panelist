import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SLAMetric {
  actual: number;
  target: number;
  status: string;
}

interface SLAComplianceGaugesProps {
  data: {
    on_time_compliance: SLAMetric;
    valid_rate_compliance: SLAMetric;
    transit_time_compliance: SLAMetric;
    issue_rate_compliance: SLAMetric;
  };
  loading?: boolean;
}

export function SLAComplianceGauges({ data, loading }: SLAComplianceGaugesProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const GaugeChart = ({ metric, label, unit = '%', inverse = false }: { 
    metric: SLAMetric; 
    label: string; 
    unit?: string;
    inverse?: boolean;
  }) => {
    const percentage = inverse 
      ? Math.min(100, (metric.target / metric.actual) * 100)
      : Math.min(100, (metric.actual / metric.target) * 100);
    
    const gaugeData = [
      { value: percentage },
      { value: 100 - percentage }
    ];

    return (
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="80%"
              startAngle={180}
              endAngle={0}
              innerRadius={40}
              outerRadius={60}
              dataKey="value"
            >
              <Cell fill={getStatusColor(metric.status)} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center -mt-4">
          <p className="text-2xl font-bold" style={{ color: getStatusColor(metric.status) }}>
            {metric.actual}{unit}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">Target: {metric.target}{unit}</p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Compliance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <GaugeChart metric={data.on_time_compliance} label="On-Time Rate" />
          <GaugeChart metric={data.valid_rate_compliance} label="Valid Rate" />
          <GaugeChart metric={data.transit_time_compliance} label="Avg Transit Time" unit=" days" inverse />
          <GaugeChart metric={data.issue_rate_compliance} label="Issue Rate" inverse />
        </div>
      </CardContent>
    </Card>
  );
}
