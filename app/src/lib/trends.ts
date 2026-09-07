import type { Dataset } from "./types";
import { isNum } from "./calc";
import { sumNum } from "./aggregate";

export interface MonthAgg {
  month: string;
  eventCount: number;
  totalBudget: number | null;
  totalWinners: number | null;
  avgBenefitCost: number | null;
}

/** event_month 기준으로 이벤트 수·예산·당첨인원을 집계한다 (report_month 아님 - 실제 진행월 기준). */
export function buildMonthlyEventAgg(data: Dataset): MonthAgg[] {
  const months = Array.from(new Set(data.events.map((e) => e.event_month))).sort();
  return months.map((month) => {
    const eventsInMonth = data.events.filter((e) => e.event_month === month);
    const ids = new Set(eventsInMonth.map((e) => e.event_id));
    const totalRows = data.benefits.filter((b) => ids.has(b.event_id) && b.benefit_type === "합계");
    const budget = sumNum(totalRows.map((b) => b.benefit_budget));
    const winners = sumNum(totalRows.map((b) => b.winner_count));
    const avgCost = isNum(budget) && isNum(winners) && winners !== 0 ? budget / winners : null;
    return {
      month,
      eventCount: eventsInMonth.length,
      totalBudget: isNum(budget) ? budget : null,
      totalWinners: isNum(winners) ? winners : null,
      avgBenefitCost: avgCost,
    };
  });
}

export interface CategorySeriesPoint {
  month: string;
  budget: number | null;
  winners: number | null;
  reportMissing: boolean;
}

/** 특정 이벤트 카테고리(예: 골든위크)의 회차별 예산/당첨인원 비교. */
export function buildCategorySeries(data: Dataset, category: string): CategorySeriesPoint[] {
  const rows = data.events
    .filter((e) => e.event_category === category)
    .sort((a, b) => a.event_month.localeCompare(b.event_month));
  return rows.map((e) => {
    const totalRow = data.benefits.find((b) => b.event_id === e.event_id && b.benefit_type === "합계");
    return {
      month: `${e.event_month}${e.data_status === "plan" ? "(계획)" : ""}`,
      budget: totalRow && isNum(totalRow.benefit_budget) ? totalRow.benefit_budget : null,
      winners: totalRow && isNum(totalRow.winner_count) ? totalRow.winner_count : null,
      reportMissing: false,
    };
  });
}
