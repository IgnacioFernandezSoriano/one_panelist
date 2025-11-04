import { Card, CardContent } from "@/components/ui/card";

interface NetworkHealthScoreProps {
  score: number;
  loading?: boolean;
}

export function NetworkHealthScore({ score, loading }: NetworkHealthScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-40 w-40 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative h-40 w-40">
            <svg className="transform -rotate-90 h-40 w-40">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - score / 100)}`}
                className={`${getScoreColor(score)} transition-all duration-1000`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
                {Math.round(score)}
              </span>
              <span className="text-sm text-muted-foreground">Health Score</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{getScoreLabel(score)}</p>
            <p className="text-sm text-muted-foreground">Network Performance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
