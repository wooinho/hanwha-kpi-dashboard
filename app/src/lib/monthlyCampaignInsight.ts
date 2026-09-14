import type { Dataset } from "./types";
import { isNum, type Num } from "./calc";
import { buildMatrixRows, type MatrixRow } from "./matrix";
import { computeKpiAchievements } from "./kpiAchievement";

export interface MonthKpiSnapshot {
  metric: string;
  label: string;
  unit: string;
  value: Num; // monthly_avg: 그 달 값 / annual_cumulative: 그 달까지 누적값
  momChangePct: number | null;
  vsTargetPct: number | null; // monthly_avg: 그 달 목표 대비 / annual_cumulative: 경과월 페이스 대비
  targetPeriod: "monthly_avg" | "annual_cumulative";
  targetValue: number;
}

export interface MonthCampaignRow {
  eventId: string;
  eventName: string;
  category: string;
  dataStatus: string;
  evidence: MatrixRow["bestEvidence"];
  participantCount: Num;
  totalBudget: Num;
}

export interface MonthlyCampaignInsight {
  month: string;
  reportStatus: "정상" | "보고서 누락" | "확인 필요";
  campaigns: MonthCampaignRow[];
  kpiSnapshot: MonthKpiSnapshot[];
  contributingHighlights: { eventName: string; text: string }[];
  concerns: { eventName: string; text: string }[];
  recommendations: string[];
  summary: string;
}

/** 이벤트가 하나라도 있거나 monthly_kpi 집계가 있는 월 전체 목록(오름차순). */
export function listAvailableMonths(data: Dataset): string[] {
  const set = new Set<string>();
  data.events.forEach((e) => set.add(e.event_month));
  data.monthlyKpi.forEach((m) => set.add(m.year_month));
  return Array.from(set).sort();
}

export function buildMonthlyCampaignInsight(data: Dataset, month: string): MonthlyCampaignInsight {
  const rows = buildMatrixRows(data).filter((r) => r.event.event_month === month);
  const campaigns: MonthCampaignRow[] = rows.map((r) => ({
    eventId: r.event.event_id,
    eventName: r.event.event_name,
    category: r.event.event_category,
    dataStatus: r.event.data_status,
    evidence: r.bestEvidence,
    participantCount: r.participantCount,
    totalBudget: r.totalBudget,
  }));

  const monthlyRow = data.monthlyKpi.find((m) => m.year_month === month);
  const reportStatus: MonthlyCampaignInsight["reportStatus"] = monthlyRow ? monthlyRow.report_status : "확인 필요";

  const achievements = computeKpiAchievements(data);
  const kpiSnapshot: MonthKpiSnapshot[] = achievements.map((ach) => {
    const idx = ach.series.findIndex((s) => s.month === month);
    const cur = idx >= 0 ? ach.series[idx].value : null;
    const prev = idx > 0 ? ach.series[idx - 1].value : null;

    let value: Num = "N/A";
    let vsTargetPct: number | null = null;
    let momChangePct: number | null = null;

    if (ach.target_period === "monthly_avg") {
      value = cur ?? "N/A";
      vsTargetPct = cur !== null ? (cur / ach.target_value) * 100 : null;
      momChangePct = cur !== null && prev !== null && prev !== 0 ? ((cur - prev) / prev) * 100 : null;
    } else {
      // 연간 누적: 선택한 달까지의 누적값과, 경과 개월 기준 예상 페이스 대비 진행률
      const cumulative = ach.series.slice(0, idx + 1).reduce((sum, s) => sum + (s.value ?? 0), 0);
      value = idx >= 0 ? cumulative : "N/A";
      const monthIndex = Number(month.slice(5, 7));
      const expectedPace = Number.isFinite(monthIndex) ? (ach.target_value * monthIndex) / 12 : null;
      vsTargetPct = expectedPace && expectedPace > 0 && idx >= 0 ? (cumulative / expectedPace) * 100 : null;
    }

    return {
      metric: ach.metric,
      label: ach.label,
      unit: ach.unit,
      value,
      momChangePct,
      vsTargetPct,
      targetPeriod: ach.target_period,
      targetValue: ach.target_value,
    };
  });

  const perfThisMonth = data.performance.filter((p) => rows.some((r) => r.event.event_id === p.event_id));
  const nameOf = (eventId: string) => campaigns.find((c) => c.eventId === eventId)?.eventName ?? eventId;

  const contributingHighlights = perfThisMonth
    .filter((p) => p.evidence_type === "A" || p.evidence_type === "B" || (p.evidence_type === "C" && (p.review_kind === "result_qualitative" || p.review_kind === "observation")))
    .map((p) => ({ eventName: nameOf(p.event_id), text: p.qualitative_result }));

  const concerns = perfThisMonth
    .filter((p) => p.evidence_type === "C" && p.review_kind === "improve")
    .map((p) => ({ eventName: nameOf(p.event_id), text: p.qualitative_result }));

  const relatedInsights = data.insights.filter((i) => rows.some((r) => r.event.event_id === i.event_id));
  const recommendations = relatedInsights.map(
    (i) => `[${nameOf(i.event_id)}] ${i.next_month_hypothesis} (검증 KPI: ${i.verification_kpi})`
  );
  if (recommendations.length === 0) {
    const weakKpi = kpiSnapshot.find((k) => k.vsTargetPct !== null && k.vsTargetPct < 80);
    recommendations.push(
      weakKpi
        ? `이 달 '${weakKpi.label}'이(가) 목표 대비 ${weakKpi.vsTargetPct?.toFixed(0)}% 수준입니다. 다음 캠페인 기획 시 이 KPI를 직접 겨냥한 이벤트 장치(예: 접속/응모 유도형 미션)를 검토해볼 수 있습니다(가설, 검증 필요).`
        : "이 달은 참고할 만한 정성 인사이트가 축적되지 않았습니다. 다음 캠페인부터 참여자 수·미션 달성자 수를 기록하면 더 구체적인 제언이 가능합니다."
    );
  }

  const evidencedCount = campaigns.filter((c) => c.evidence === "A" || c.evidence === "B").length;
  const totalParticipants = campaigns
    .filter((c) => isNum(c.participantCount))
    .reduce((sum, c) => sum + (c.participantCount as number), 0);

  const summary =
    campaigns.length === 0
      ? `${month}에는 등록된 캠페인이 없습니다.`
      : `${month}에는 ${campaigns.length}개 캠페인이 운영/기획되었고, 이 중 ${evidencedCount}건에서 정량 근거가 확인됩니다` +
        (totalParticipants > 0 ? ` (정량 근거 기준 총 참여자 ${totalParticipants.toLocaleString("ko-KR")}명).` : ".") +
        (reportStatus === "보고서 누락" ? " 이 달은 운영 리뷰 보고서가 없어(파일 오류) 참고 시 유의가 필요합니다." : "");

  return { month, reportStatus, campaigns, kpiSnapshot, contributingHighlights, concerns, recommendations, summary };
}
