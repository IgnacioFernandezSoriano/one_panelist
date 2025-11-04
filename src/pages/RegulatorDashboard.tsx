import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import { useNetworkHealth } from "@/hooks/useNetworkHealth";
import { useRoutePerformance } from "@/hooks/useRoutePerformance";
import { usePerformanceTrends } from "@/hooks/usePerformanceTrends";
import { useSLACompliance } from "@/hooks/useSLACompliance";
import { useIssuesAnalysis } from "@/hooks/useIssuesAnalysis";
import { NetworkHealthScore } from "@/components/reporting/NetworkHealthScore";
import { NetworkKPICard } from "@/components/reporting/NetworkKPICard";
import { PerformanceTrendsChart } from "@/components/reporting/PerformanceTrendsChart";
import { RouteRanking } from "@/components/reporting/RouteRanking";
import { SLAComplianceGauges } from "@/components/reporting/SLAComplianceGauges";
import { IssuesAnalysis } from "@/components/reporting/IssuesAnalysis";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, Clock, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function RegulatorDashboard() {
  const { clienteId } = useUserRole();
  const [period, setPeriod] = useState<number>(30);
  
  const { data: healthData, isLoading: healthLoading } = useNetworkHealth(clienteId, period);
  const { data: routeData, isLoading: routeLoading } = useRoutePerformance(clienteId, period);
  const { data: trendsData, isLoading: trendsLoading } = usePerformanceTrends(clienteId, period, 'day');
  const { data: slaData, isLoading: slaLoading } = useSLACompliance(clienteId, period);
  const { data: issuesData, isLoading: issuesLoading } = useIssuesAnalysis(clienteId, period);

  const handleExport = (format: 'pdf' | 'csv') => {
    toast.info(`Exporting as ${format.toUpperCase()}...`);
    // TODO: Implement export functionality
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Regulator Dashboard</h1>
          <p className="text-muted-foreground">Network performance monitoring and analytics</p>
        </div>
        <div className="flex gap-2">
          <Select value={period.toString()} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Hero Section - Health Score + KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <NetworkHealthScore 
          score={healthData?.health_score || 0} 
          loading={healthLoading}
        />
        <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NetworkKPICard
            title="On-Time Rate"
            value={`${healthData?.on_time_rate || 0}%`}
            subtitle="Events delivered on time"
            icon={TrendingUp}
            loading={healthLoading}
          />
          <NetworkKPICard
            title="Avg Transit Time"
            value={`${healthData?.avg_transit_time || 0}`}
            subtitle="Days in transit"
            icon={Clock}
            loading={healthLoading}
          />
          <NetworkKPICard
            title="Total Events"
            value={healthData?.total_events || 0}
            subtitle="In selected period"
            icon={Package}
            loading={healthLoading}
          />
          <NetworkKPICard
            title="Issue Rate"
            value={`${healthData?.issue_rate || 0}%`}
            subtitle="Events with issues"
            icon={AlertTriangle}
            loading={healthLoading}
          />
        </div>
      </div>

      {/* Performance Trends */}
      <PerformanceTrendsChart 
        data={trendsData || []} 
        loading={trendsLoading}
      />

      {/* SLA Compliance */}
      {slaData && (
        <SLAComplianceGauges 
          data={slaData} 
          loading={slaLoading}
        />
      )}

      {/* Route Ranking */}
      <RouteRanking 
        routes={routeData || []} 
        loading={routeLoading}
      />

      {/* Issues Analysis */}
      {issuesData && (
        <IssuesAnalysis 
          data={issuesData} 
          loading={issuesLoading}
        />
      )}
    </div>
  );
}
