import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Dataset } from "@/lib/types";
import { buildMonthlyDiagnosis, type DiagnosisStatus } from "@/lib/diagnosis";
import { Stethoscope } from "lucide-react";

const STATUS_LABEL: Record<DiagnosisStatus, { label: string; tone: "danger" | "warning" | "success" | "neutral" }> = {
  critical: { label: "위험", tone: "danger" },
  warning: { label: "주의", tone: "warning" },
  good: { label: "양호", tone: "success" },
  unknown: { label: "데이터 부족", tone: "neutral" },
};

/**
 * 월별 데이터 기반 진단(사실)과 처방(가설) 섹션.
 * - 진단(파란 영역): monthly_kpi.csv 실측치로 계산한 사실만(evidence B).
 * - 해석/처방(회색·주황 영역): 인과관계를 단정하지 않고 "함께 관찰됨/검토 가능" 수준으로만 서술.
 */
export function MonthlyDiagnosisSection({ data }: { data: Dataset }) {
  const items = buildMonthlyDiagnosis(data);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
        <Stethoscope size={15} /> ② 월별 진단 및 처방 (전사 KPI 기준)
      </h2>
      <p className="text-xs text-gray-400">
        아래 &apos;진단&apos;은 monthly_kpi 실측치로 계산한 사실이고, &apos;처방&apos;은 원인을 단정하지
        않은 가설입니다(검증 전). 동일 조건 비교군이 없어 인과관계를 증명하지 않습니다.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => {
          const s = STATUS_LABEL[item.status];
          return (
            <Card key={item.metric} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="mb-0">{item.label}</CardTitle>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>

              <div className="rounded-md border-l-2 border-blue-400 bg-blue-50/40 px-2 py-1.5 text-xs text-gray-700">
                <span className="mb-0.5 block font-semibold text-blue-700">진단 (사실, 근거 B)</span>
                {item.fact}
              </div>

              <div className="rounded-md border-l-2 border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                <span className="mb-0.5 block font-semibold text-gray-500">가능한 해석</span>
                {item.interpretation}
              </div>

              <div className="rounded-md border-l-2 border-amber-400 bg-amber-50/50 px-2 py-1.5 text-xs text-gray-700">
                <span className="mb-0.5 block font-semibold text-amber-700">처방 (가설, 근거 D)</span>
                {item.prescription}
              </div>

              <p className="text-[11px] text-gray-400">한계: {item.limitation}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
