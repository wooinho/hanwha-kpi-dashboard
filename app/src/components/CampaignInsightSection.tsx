import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Dataset } from "@/lib/types";
import { buildCampaignInsights, type ContributionLevel } from "@/lib/campaignInsights";
import { Target } from "lucide-react";

const LEVEL_LABEL: Record<ContributionLevel, { label: string; tone: "success" | "warning" | "danger" }> = {
  confirmed: { label: "근거 확인됨", tone: "success" },
  observed: { label: "정성적으로만 관찰됨", tone: "warning" },
  insufficient: { label: "근거 부족", tone: "danger" },
};

/**
 * 캠페인(이벤트 카테고리)별로 여러 회차를 합산해, 목표 KPI에 어떤 기여를 한 것으로 관찰되는지
 * 정리하는 인사이트 섹션. 화면④(회차별 상세 표)와 달리 캠페인 단위 롤업이며, "기여했다"가 아니라
 * "함께 관찰됐다" 수준으로만 서술한다(원칙: 상관관계≠인과관계).
 */
export function CampaignInsightSection({ data }: { data: Dataset }) {
  const insights = buildCampaignInsights(data);
  // 근거 수준 순으로 정렬: confirmed -> observed -> insufficient
  const order: Record<ContributionLevel, number> = { confirmed: 0, observed: 1, insufficient: 2 };
  const sorted = [...insights].sort((a, b) => order[a.contributionLevel] - order[b.contributionLevel]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
        <Target size={15} /> ⑤ 캠페인별 목표 KPI 기여 인사이트
      </h2>
      <p className="text-xs text-gray-400">
        같은 캠페인(예: 골든위크)의 여러 회차를 합산해 목표 KPI에 어떤 기여를 한 것으로 관찰되는지
        정리합니다. 정량 근거가 없는 회차는 합계에서 제외했으며(0 아님), &apos;기여했다&apos;가 아니라
        &apos;함께 관찰됐다&apos; 수준으로만 서술합니다.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sorted.map((c) => {
          const level = LEVEL_LABEL[c.contributionLevel];
          return (
            <Card key={c.category} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="mb-0">{c.category}</CardTitle>
                <Badge tone={level.tone}>{level.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-1">
                {c.relatedKpiLabels.length > 0 ? (
                  c.relatedKpiLabels.map((l) => (
                    <Badge key={l} tone="info">
                      {l}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">연결되는 목표 KPI 확인 필요</span>
                )}
              </div>

              <div className="rounded-md border-l-2 border-blue-400 bg-blue-50/40 px-2 py-1.5 text-xs text-gray-700">
                <span className="mb-0.5 block font-semibold text-blue-700">관찰된 사실 (근거 A·B 회차만 합산)</span>
                {c.fact}
              </div>

              <div className="rounded-md border-l-2 border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                <span className="mb-0.5 block font-semibold text-gray-500">가능한 해석</span>
                {c.interpretation}
              </div>

              <div className="rounded-md border-l-2 border-amber-400 bg-amber-50/50 px-2 py-1.5 text-xs text-gray-700">
                <span className="mb-0.5 block font-semibold text-amber-700">다음 달 실행 가설</span>
                {c.hypothesis}
                <span className="mt-1 block text-gray-400">검증 KPI: {c.verificationKpi}</span>
              </div>

              <p className="text-[11px] text-gray-400">한계: {c.limitation}</p>

              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-500">
                  회차 목록 ({c.roundCount}건 중 상위 {c.topRounds.length}건)
                </p>
                <ul className="flex flex-col gap-0.5 text-xs">
                  {c.topRounds.map((r) => (
                    <li key={r.eventId} className="flex items-center justify-between gap-2">
                      <Link href={`/detail/${r.eventId}`} className="text-gray-700 hover:text-[var(--accent)] hover:underline">
                        {r.eventMonth} · {r.eventName}
                      </Link>
                      <span className="flex shrink-0 items-center gap-1 text-gray-400">
                        {isNumBadge(r.participantCount)}
                        <Badge tone={r.evidence === "A" || r.evidence === "B" ? "info" : r.evidence === "C" ? "neutral" : "danger"}>
                          {r.evidence}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function isNumBadge(v: number | "N/A"): string {
  return v === "N/A" ? "" : `${v.toLocaleString("ko-KR")}명 ·`;
}
