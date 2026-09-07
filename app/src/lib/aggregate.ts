import { NA } from "./types";
import type { EventRow, BenefitRow, PerformanceRow, MonthlyKpiRow } from "./types";
import { isNum, type Num, changeRate } from "./calc";

/** 숫자로 확인되는 값만 더한다. 전부 N/A면 결과도 N/A(0으로 왜곡하지 않음). */
export function sumNum(values: Num[]): Num {
  const nums = values.filter(isNum);
  if (nums.length === 0) return NA;
  return nums.reduce((a, b) => a + b, 0);
}

export function eventIdsOf(events: EventRow[]): Set<string> {
  return new Set(events.map((e) => e.event_id));
}

export interface OverviewMetrics {
  promotionCount: number;
  participantCount: Num;
  missionCompleteCount: Num;
  totalBudget: Num;
  totalWinners: Num;
  quantitativeCoverageRate: number; // 0~100, A/B 근거를 가진 이벤트 비율
  quantitativeCoverageLabel: string;
}

export function computeOverviewMetrics(
  events: EventRow[],
  performance: PerformanceRow[],
  benefits: BenefitRow[]
): OverviewMetrics {
  const ids = eventIdsOf(events);
  const perf = performance.filter((p) => ids.has(p.event_id));
  const ben = benefits.filter((b) => ids.has(b.event_id));

  const participantCount = sumNum(perf.map((p) => p.participant_count));
  const missionCompleteCount = sumNum(perf.map((p) => p.mission_complete_count));

  const totalBudget = sumNum(
    ben.filter((b) => b.benefit_type === "합계").map((b) => b.benefit_budget)
  );
  const totalWinners = sumNum(
    ben.filter((b) => b.benefit_type === "합계").map((b) => b.winner_count)
  );

  const eventsWithAB = new Set(
    perf.filter((p) => p.evidence_type === "A" || p.evidence_type === "B").map((p) => p.event_id)
  );
  const quantitativeCoverageRate = events.length > 0 ? (eventsWithAB.size / events.length) * 100 : 0;

  return {
    promotionCount: events.length,
    participantCount,
    missionCompleteCount,
    totalBudget,
    totalWinners,
    quantitativeCoverageRate,
    quantitativeCoverageLabel: `${eventsWithAB.size} / ${events.length}건`,
  };
}

/** monthlyKpi 지표 하나를 골라 최신 정상월 대비 전월 증감률(%) 반환. */
export function latestMonthChangeRate(
  monthly: MonthlyKpiRow[],
  field: keyof MonthlyKpiRow
): { current: Num; previous: Num; rate: Num; month: string | null } {
  const normal = monthly.filter((m) => m.report_status === "정상");
  if (normal.length < 2) return { current: NA, previous: NA, rate: NA, month: null };
  const sorted = [...normal].sort((a, b) => a.year_month.localeCompare(b.year_month));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const cur = last[field];
  const prv = prev[field];
  const curNum = typeof cur === "number" ? cur : NA;
  const prvNum = typeof prv === "number" ? prv : NA;
  return { current: curNum, previous: prvNum, rate: changeRate(curNum, prvNum), month: last.year_month };
}
