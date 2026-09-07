import { Card } from "./ui/Card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  isDataMissing = false,
}: {
  label: string;
  value: string;
  sub?: string;
  /** 값이 원본에 없어 N/A인 경우 true - "성과 0"과 시각적으로 다르게 표시(회색, 옅게) */
  isDataMissing?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums",
          isDataMissing ? "text-gray-300" : "text-gray-900"
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </Card>
  );
}
