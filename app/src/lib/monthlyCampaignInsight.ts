import type { Dataset } from "./types";
import { NO_DATA } from "./types";
import { isNum, type Num } from "./calc";
import { buildMatrixRows, type MatrixRow } from "./matrix";
import { computeKpiAchievements } from "./kpiAchievement";
import { eunNeun, mapBehaviorsToKpiLabels } from "./campaignInsights";

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

/**
 * worked: 이전 회차 대비 참여가 뚜렷이(±10%p 이상) 늘어 KPI에 긍정적으로 기여했을 가능성.
 * underperformed: 이전 회차 대비 참여가 뚜렷이 줄어 기여가 약해졌을 가능성.
 * steady: 이전 회차와 큰 차이 없이 유지됨.
 * baseline: 정량 데이터는 있으나 비교할 이전 회차가 없어 추세를 판단할 수 없음.
 * insufficient_evidence: 참여자 수 등 정량 데이터 자체가 없어 기여 여부를 판단할 수 없음.
 */
export type CampaignVerdict = "worked" | "steady" | "baseline" | "underperformed" | "insufficient_evidence";

export interface CampaignWorkingAnalysis {
  eventId: string;
  eventName: string;
  category: string;
  evidence: MatrixRow["bestEvidence"];
  participantCount: Num;
  momChangePct: number | null;
  compareEventMonth: string | null;
  relatedKpiLabels: string[];
  verdict: CampaignVerdict;
  /** 데이터를 나열하지 않고, "무엇이 어떻게 작동했는지/안 했는지"를 해석한 한 문단 코멘트. */
  comment: string;
}

export interface MonthlyCampaignInsight {
  month: string;
  reportStatus: "정상" | "보고서 누락" | "확인 필요";
  campaigns: MonthCampaignRow[];
  kpiSnapshot: MonthKpiSnapshot[];
  workingAnalyses: CampaignWorkingAnalysis[];
  recommendations: string[];
  summary: string;
}

const VERDICT_RANK: Record<CampaignVerdict, number> = {
  worked: 0,
  steady: 1,
  baseline: 2,
  underperformed: 3,
  insufficient_evidence: 4,
};

/** 이벤트가 하나라도 있거나 monthly_kpi 집계가 있는 월 전체 목록(오름차순). */
export function listAvailableMonths(data: Dataset): string[] {
  const set = new Set<string>();
  data.events.forEach((e) => set.add(e.event_month));
  data.monthlyKpi.forEach((m) => set.add(m.year_month));
  return Array.from(set).sort();
}

export function buildMonthlyCampaignInsight(data: Dataset, month: string): MonthlyCampaignInsight {
  const allRows = buildMatrixRows(data);
  const rows = allRows.filter((r) => r.event.event_month === month);
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

  const kpiByLabel = new Map(kpiSnapshot.map((k) => [k.label, k]));

  /** 관련 KPI가 이 달 목표 대비 어떤 수준인지 한 문장으로 덧붙인다(있을 때만). 새 숫자를 만들지 않고 이미 계산된 kpiSnapshot만 인용. */
  function kpiStatusPhrase(relatedKpiLabels: string[], kpiPhrase: string): string {
    const withPct = relatedKpiLabels.map((l) => kpiByLabel.get(l)).find((k) => k && k.vsTargetPct !== null);
    if (!withPct || withPct.vsTargetPct === null) return "";
    const level = withPct.vsTargetPct >= 100 ? "목표를 달성한" : withPct.vsTargetPct >= 80 ? "목표에 근접한" : "목표에 못 미친";
    return ` 같은 달 ${kpiPhrase}은(는) 목표 대비 ${withPct.vsTargetPct.toFixed(0)}%로 ${level} 수준입니다.`;
  }

  const workingAnalyses: CampaignWorkingAnalysis[] = rows
    .map((row) => {
      const category = row.event.event_category;
      const name = row.event.event_name;
      const particle = eunNeun(name);
      const behaviors = [row.event.target_behavior].filter((b) => b !== NO_DATA);
      const relatedKpiLabels = mapBehaviorsToKpiLabels(behaviors);
      const kpiPhrase = relatedKpiLabels.length > 0 ? `'${relatedKpiLabels.join("', '")}'` : "관련 KPI";

      // 같은 캠페인(카테고리)의 이전 회차 중, 이번 달보다 앞서고 참여자 수가 실측된 가장 최근 회차를 비교 대상으로 삼는다.
      const priorRound = allRows
        .filter((r) => r.event.event_category === category && r.event.event_month < month && isNum(r.participantCount))
        .sort((a, b) => (a.event.event_month < b.event.event_month ? 1 : -1))[0];

      let momChangePct: number | null = null;
      if (isNum(row.participantCount) && priorRound && (priorRound.participantCount as number) !== 0) {
        momChangePct = ((row.participantCount - (priorRound.participantCount as number)) / (priorRound.participantCount as number)) * 100;
      }

      let verdict: CampaignVerdict;
      let comment: string;

      if (!isNum(row.participantCount)) {
        const perf = data.performance.filter((p) => p.event_id === row.event.event_id);
        const hasPositiveReview = perf.some(
          (p) => p.evidence_type === "C" && (p.review_kind === "result_qualitative" || p.review_kind === "observation")
        );
        const hasImproveReview = perf.some((p) => p.evidence_type === "C" && p.review_kind === "improve");
        verdict = "insufficient_evidence";
        if (hasPositiveReview) {
          comment = `${name}${particle} 참여자 수 등 정량 데이터는 없지만, 보고서에는 성과가 있었다는 정성 평가가 확인됩니다. 실제 KPI 기여 여부는 수치가 없어 판단할 수 없습니다(정성 근거만 존재).`;
        } else if (hasImproveReview) {
          comment = `${name}${particle} 정량 데이터가 없고 보고서에는 개선이 필요하다는 평가만 있어, 이번 달 KPI에 기여했다고 보기 어렵습니다.`;
        } else {
          comment = `${name}${particle} 참여자 수 등 정량 데이터가 없어 이번 달 KPI 기여 여부를 판단할 수 없습니다(근거 부족).`;
        }
      } else if (priorRound && momChangePct !== null) {
        const cur = row.participantCount as number;
        const prior = priorRound.participantCount as number;
        const pctText = `${momChangePct >= 0 ? "+" : ""}${momChangePct.toFixed(1)}%`;
        if (momChangePct >= 10) {
          verdict = "worked";
          comment =
            `${name}${particle} 이번 달 ${cur.toLocaleString("ko-KR")}명이 참여해, 이전 회차(${priorRound.event.event_month}, ${prior.toLocaleString("ko-KR")}명) 대비 ${pctText} 늘었습니다.` +
            kpiStatusPhrase(relatedKpiLabels, kpiPhrase) +
            ` 이 캠페인이 이번 달 KPI에 긍정적으로 기여했을 가능성이 있습니다(해석, 인과 아님).`;
        } else if (momChangePct <= -10) {
          verdict = "underperformed";
          comment =
            `${name}${particle} 이번 달 ${cur.toLocaleString("ko-KR")}명 참여로, 이전 회차(${priorRound.event.event_month}, ${prior.toLocaleString("ko-KR")}명) 대비 ${pctText} 줄었습니다.` +
            kpiStatusPhrase(relatedKpiLabels, kpiPhrase) +
            ` 이번 회차의 참여 조건·경품 구성·노출 방식을 점검해볼 필요가 있습니다(해석, 인과 아님).`;
        } else {
          verdict = "steady";
          comment =
            `${name}${particle} 이전 회차(${priorRound.event.event_month}) 대비 큰 변화 없이(${pctText}) ${cur.toLocaleString("ko-KR")}명이 참여했습니다.` +
            kpiStatusPhrase(relatedKpiLabels, kpiPhrase);
        }
      } else {
        verdict = "baseline";
        const cur = row.participantCount as number;
        comment =
          `${name}${particle} 이번 달 ${cur.toLocaleString("ko-KR")}명이 참여했습니다(비교할 이전 회차 데이터 없음, 추세 판단 보류).` +
          kpiStatusPhrase(relatedKpiLabels, kpiPhrase);
      }

      return {
        eventId: row.event.event_id,
        eventName: name,
        category,
        evidence: row.bestEvidence,
        participantCount: row.participantCount,
        momChangePct,
        compareEventMonth: priorRound ? priorRound.event.event_month : null,
        relatedKpiLabels,
        verdict,
        comment,
      };
    })
    .sort((a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict]);

  const nameOf = (eventId: string) => campaigns.find((c) => c.eventId === eventId)?.eventName ?? eventId;

  // 다음 캠페인 기획 인사이트: ①원본에 이미 있는 정성 인사이트 우선 인용 ②이번 달 worked/underperformed 대비
  // ③취약 KPI 기반 가설(폴백) - 이 순서로, 새 가정을 만들기 전에 실제 근거를 먼저 찾는다.
  const relatedInsights = data.insights.filter((i) => rows.some((r) => r.event.event_id === i.event_id));
  const recommendations = relatedInsights.map(
    (i) => `[${nameOf(i.event_id)}] ${i.next_month_hypothesis} (검증 KPI: ${i.verification_kpi})`
  );

  if (recommendations.length === 0) {
    const worked = workingAnalyses.filter((a) => a.verdict === "worked");
    const underperformed = workingAnalyses.filter((a) => a.verdict === "underperformed");
    if (worked.length > 0 && underperformed.length > 0) {
      recommendations.push(
        `이번 달 '${worked[0].eventName}'은(는) 참여가 늘고 '${underperformed[0].eventName}'은(는) 줄었습니다. 두 캠페인의 참여 조건·경품 구성·노출 방식 차이를 비교해보면 다음 캠페인 기획에 참고할 수 있습니다(가설, 검증 필요).`
      );
    } else if (underperformed.length > 0) {
      recommendations.push(
        `'${underperformed[0].eventName}'의 참여가 이전 회차 대비 줄었습니다. 다음 캠페인에서는 참여 조건 완화나 경품 구성 재검토를 검토해볼 수 있습니다(가설, 검증 필요).`
      );
    } else {
      const weakKpi = kpiSnapshot.find((k) => k.vsTargetPct !== null && k.vsTargetPct < 80);
      recommendations.push(
        weakKpi
          ? `이 달 '${weakKpi.label}'이(가) 목표 대비 ${weakKpi.vsTargetPct?.toFixed(0)}% 수준입니다. 다음 캠페인 기획 시 이 KPI를 직접 겨냥한 이벤트 장치(예: 접속/응모 유도형 미션)를 검토해볼 수 있습니다(가설, 검증 필요).`
          : "이 달은 참고할 만한 정성 인사이트가 축적되지 않았습니다. 다음 캠페인부터 참여자 수·미션 달성자 수를 기록하면 더 구체적인 제언이 가능합니다."
      );
    }
  }

  const evidencedCount = campaigns.filter((c) => c.evidence === "A" || c.evidence === "B").length;
  const totalParticipants = campaigns
    .filter((c) => isNum(c.participantCount))
    .reduce((sum, c) => sum + (c.participantCount as number), 0);
  const workedCount = workingAnalyses.filter((a) => a.verdict === "worked").length;
  const underperformedCount = workingAnalyses.filter((a) => a.verdict === "underperformed").length;
  const insufficientCount = workingAnalyses.filter((a) => a.verdict === "insufficient_evidence").length;
  const hasTrendJudgement = workedCount + underperformedCount > 0;

  const summary =
    campaigns.length === 0
      ? `${month}에는 등록된 캠페인이 없습니다.`
      : `${month}에는 ${campaigns.length}개 캠페인이 운영/기획되었습니다.` +
        (hasTrendJudgement
          ? ` 이 중 ${workedCount}건은 이전 회차 대비 참여가 늘어 KPI에 긍정적으로 기여했을 가능성이 있고, ${underperformedCount}건은 참여가 줄어 기여가 제한적이었을 가능성이 있으며, ${insufficientCount}건은 정량 근거가 부족해 판단할 수 없습니다`
          : ` 이 중 ${evidencedCount}건에서 정량 근거가 확인되지만 비교 가능한 이전 회차가 없어 추세 판단은 보류합니다`) +
        (totalParticipants > 0 ? ` (정량 근거 기준 총 참여자 ${totalParticipants.toLocaleString("ko-KR")}명).` : ".") +
        (reportStatus === "보고서 누락" ? " 이 달은 운영 리뷰 보고서가 없어(파일 오류) 참고 시 유의가 필요합니다." : "");

  return { month, reportStatus, campaigns, kpiSnapshot, workingAnalyses, recommendations, summary };
}
