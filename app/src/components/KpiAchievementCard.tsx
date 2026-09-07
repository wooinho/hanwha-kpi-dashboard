import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import type { KpiAchievement } from "@/lib/kpiAchievement";
import { cn } from "@/lib/utils";

function rateTone(rate: number | null): "success" | "warning" | "danger" | "neutral" {
  if (rate === null) return "neutral";
  if (rate >= 100) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

export function KpiAchievementCard({ item }: { item: KpiAchievement }) {
  const tone = rateTone(item.achievementRate);
  const periodLabel = item.target_period === "monthly_avg" ? "월평균" : "연간 누적(진행률)";

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-gray-500">{item.label}</span>
        <Badge tone={tone}>
          {item.achievementRate === null ? "데이터 없음" : `달성률 ${item.achievementRate.toFixed(0)}%`}
        </Badge>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-gray-900">
          {item.actualValue === null ? "N/A" : Math.round(item.actualValue).toLocaleString("ko-KR")}
        </span>
        <span className="text-xs text-gray-400">
          {item.unit} / 목표 {item.target_value.toLocaleString("ko-KR")}
          {item.unit}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "success" && "bg-emerald-500",
            tone === "warning" && "bg-amber-500",
            tone === "danger" && "bg-red-500",
            tone === "neutral" && "bg-gray-300"
          )}
          style={{ width: `${Math.min(100, item.achievementRate ?? 0)}%` }}
        />
      </div>

      <p className="text-xs text-gray-400">
        {periodLabel} · 확보 {item.monthsUsed}개월 · 출처: {item.source}
      </p>
    </Card>
  );
}
