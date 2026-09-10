import type { Dataset } from "./types";
import { computeKpiAchievements, type KpiAchievement } from "./kpiAchievement";

export type DiagnosisStatus = "critical" | "warning" | "good" | "unknown";

export interface MonthlyDiagnosisItem {
  metric: string;
  label: string;
  status: DiagnosisStatus;
  latestMonth: string | null;
  latestValue: number | null;
  momChangePct: number | null; // 전월 대비 증감률
  trend: "상승" | "하락" | "혼조" | "데이터 부족";
  vsTargetPct: number | null; // 이번 달(또는 현재 페이스)이 목표 대비 몇 %인지
  eventCountThisMonth: number | null;
  fact: string; // 관찰된 사실 (근거 B: 원본 monthly_kpi 수치로 계산)
  interpretation: string; // 가능한 해석
  limitation: string; // 한계
  prescription: string; // 다음 달 실행 가설(처방) - 단정하지 않음
  relatedInsightIds: string[];
}

function pctChange(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function trendOf(values: (number | null)[]): MonthlyDiagnosisItem["trend"] {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return "데이터 부족";
  const diffs = nums.slice(1).map((v, i) => v - nums[i]);
  if (diffs.every((d) => d > 0)) return "상승";
  if (diffs.every((d) => d < 0)) return "하락";
  return "혼조";
}

function statusFromRate(rate: number | null): DiagnosisStatus {
  if (rate === null) return "unknown";
  if (rate >= 100) return "good";
  if (rate >= 70) return "warning";
  return "critical";
}

/**
 * 월별 진단 및 처방. 원칙:
 * - '사실'은 monthly_kpi.csv 실측치로 계산한 값만 사용(evidence B).
 * - '해석/처방'은 절대 단정하지 않고 "함께 관찰됨/검토해볼 수 있음" 수준으로 서술.
 * - 실제 이벤트-KPI 인과관계를 증명하는 것이 아니라, 참고할 만한 과거 관찰(insights.csv)이
 *   있으면 그 내용을 그대로 인용해 근거를 밝힌다(새로운 근거를 지어내지 않음).
 */
export function buildMonthlyDiagnosis(data: Dataset): MonthlyDiagnosisItem[] {
  const achievements = computeKpiAchievements(data);
  const normalMonths = data.monthlyKpi.filter((m) => m.report_status === "정상");
  const latestNormalMonth = [...normalMonths].sort((a, b) => b.year_month.localeCompare(a.year_month))[0]?.year_month ?? null;

  return achievements.map((ach) => buildOne(ach, data, latestNormalMonth));
}

function buildOne(ach: KpiAchievement, data: Dataset, latestNormalMonth: string | null): MonthlyDiagnosisItem {
  const validSeries = ach.series.filter((s) => s.value !== null);
  const last = validSeries[validSeries.length - 1] ?? null;
  const prev = validSeries[validSeries.length - 2] ?? null;
  const last3 = validSeries.slice(-3).map((s) => s.value);

  const latestMonth = last?.month ?? null;
  const latestValue = last?.value ?? null;
  const momChangePct = pctChange(latestValue, prev?.value ?? null);
  const trend = trendOf(last3);

  const eventCountThisMonth = latestMonth
    ? data.events.filter((e) => e.event_month === latestMonth).length
    : null;

  const isJuneAffected = latestMonth === "2026-06";

  let vsTargetPct: number | null = null;
  let status: DiagnosisStatus = "unknown";
  let fact = "";
  let interpretation = "";
  let limitation = "";
  let prescription = "";
  const relatedInsightIds: string[] = [];

  if (ach.target_period === "monthly_avg") {
    vsTargetPct = latestValue !== null ? (latestValue / ach.target_value) * 100 : null;
    status = statusFromRate(vsTargetPct);
    fact =
      latestValue === null
        ? `${latestMonth ?? "최근"} 데이터가 없습니다.`
        : `${latestMonth} ${ach.label}: ${latestValue.toLocaleString("ko-KR")}${ach.unit}` +
          (momChangePct !== null ? ` (전월 대비 ${momChangePct >= 0 ? "+" : ""}${momChangePct.toFixed(1)}%)` : "") +
          `, 목표(월평균 ${ach.target_value.toLocaleString("ko-KR")}${ach.unit}) 대비 ${vsTargetPct?.toFixed(0)}% 수준. 최근 3개월 추세: ${trend}.`;
    if (eventCountThisMonth !== null) {
      fact += ` 같은 달 진행 이벤트(사용자 제공 목록 포함) ${eventCountThisMonth}건.`;
    }
  } else {
    // annual_cumulative: 페이스 기반 진단
    const monthIndex = latestMonth ? Number(latestMonth.slice(5, 7)) : null;
    const expectedPace = monthIndex ? (ach.target_value * monthIndex) / 12 : null;
    vsTargetPct = expectedPace && ach.actualValue !== null ? (ach.actualValue / expectedPace) * 100 : null;
    status = statusFromRate(vsTargetPct);
    const remainingMonths = monthIndex ? 12 - monthIndex : null;
    const remainingTarget = ach.actualValue !== null ? ach.target_value - ach.actualValue : null;
    const requiredMonthlyRun =
      remainingMonths && remainingMonths > 0 && remainingTarget !== null ? remainingTarget / remainingMonths : null;
    fact =
      ach.actualValue === null
        ? "누적 응모 데이터가 없습니다."
        : `${monthIndex ?? "?"}월까지 누적 ${ach.actualValue.toLocaleString("ko-KR")}${ach.unit} (연간 목표 ${ach.target_value.toLocaleString(
            "ko-KR"
          )}${ach.unit}의 ${((ach.actualValue / ach.target_value) * 100).toFixed(0)}%). 경과 개월 기준 예상 페이스 대비 ${
            vsTargetPct?.toFixed(0) ?? "N/A"
          }% 진행.`;
    if (requiredMonthlyRun !== null && remainingMonths && remainingMonths > 0) {
      fact += ` 남은 ${remainingMonths}개월간 월평균 ${Math.round(requiredMonthlyRun).toLocaleString("ko-KR")}명 이상 응모가 있어야 연간 목표에 도달합니다.`;
    }
  }

  // 관련 정성 인사이트(있으면 그대로 인용 - 새로 지어내지 않음)
  const related = data.insights.filter((i) => {
    if (ach.metric === "apply_total") return i.fact.includes("응모") || i.fact.includes("고객응모");
    if (ach.metric === "touch_send_total") return i.fact.includes("발송");
    return false;
  });
  for (const r of related) relatedInsightIds.push(r.insight_id);

  if (status === "critical" || status === "warning") {
    if (related.length > 0) {
      interpretation = `과거 유사 관찰: ${related[0].fact} → ${related[0].interpretation}`;
      prescription = `(참고 가설, 근거 D) ${related[0].next_month_hypothesis} 검증 KPI: ${related[0].verification_kpi}`;
    } else if (ach.metric === "touch_send_total" || ach.metric === "send_agent_unique_total") {
      interpretation =
        eventCountThisMonth !== null && eventCountThisMonth <= 1
          ? `이 달 진행 이벤트가 ${eventCountThisMonth}건으로 적어 발송 활동 저하와 함께 관찰됩니다.`
          : `이벤트 수와 무관하게 발송 활동이 저조하게 관찰됩니다 - 발송 자체(콘텐츠 소재, 발송 대상 세그먼트)를 점검할 필요가 있습니다.`;
      prescription = `(가설, 검증 필요) 다음 달 이벤트·뉴스레터 발송 빈도를 늘리거나, 미발송 GA Agt.를 대상으로 한 안내를 검토해볼 수 있습니다.`;
    } else if (ach.metric === "ga_login_count") {
      interpretation = "GA(설계사) 접속 유인이 되는 콘텐츠·이벤트 노출이 최근 약화된 것과 함께 관찰됩니다.";
      prescription = "(가설, 검증 필요) 접속 유도형 이벤트(출석·미션형) 비중을 늘리는 방안을 검토해볼 수 있습니다.";
    } else {
      interpretation = "목표 대비 낮은 수준이 관찰됩니다.";
      prescription = "(가설, 검증 필요) 원인 분석을 위한 추가 데이터 확보가 필요합니다.";
    }
    limitation = "동일 조건 비교군이 없어 원인을 단정할 수 없습니다. '영향을 주었다'가 아니라 '함께 관찰됐다' 수준의 가설입니다.";
  } else if (status === "good") {
    interpretation = "목표 수준 이상으로 관리되고 있습니다.";
    prescription = "현재 운영 방식을 유지하되, 다음 달에도 동일 수준을 유지할 수 있는지 지켜볼 필요가 있습니다.";
    limitation = "단일 지표 기준 진단이며, 다른 KPI와의 트레이드오프는 별도 확인이 필요합니다.";
  } else {
    interpretation = "데이터가 부족해 진단할 수 없습니다.";
    prescription = "다음 달 데이터 확보 후 재평가가 필요합니다.";
    limitation = "확보된 월 수가 부족합니다.";
  }

  if (isJuneAffected) {
    limitation += " 2026-06은 운영리뷰 보고서가 없어(파일 오류) 이 수치가 부분 집계일 가능성이 있습니다.";
  }

  return {
    metric: ach.metric,
    label: ach.label,
    status,
    latestMonth,
    latestValue,
    momChangePct,
    trend,
    vsTargetPct,
    eventCountThisMonth,
    fact,
    interpretation,
    limitation,
    prescription,
    relatedInsightIds,
  };
}
