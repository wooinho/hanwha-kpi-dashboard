import type { Dataset, KpiTarget, MonthlyKpiRow } from "./types";

export interface KpiAchievement extends KpiTarget {
  actualValue: number | null;
  achievementRate: number | null; // 0~100+
  monthsUsed: number;
  series: { month: string; value: number | null }[];
}

/**
 * xlsx에 직접 기재된 목표(monthly_avg | annual_cumulative)와 monthly_kpi.csv 실적을 비교한다.
 * - monthly_avg: 확보된 전체 월의 평균과 비교 (6월 '보고서 누락'도 xlsx 자체 수치는 있어 포함함 -
 *   pptx 운영리뷰가 없다는 뜻이지 이 집계 수치가 없다는 뜻이 아님)
 * - annual_cumulative: 확보된 월의 누적 합과 목표를 비교(연간 목표이므로 현재까지는 진행률로 해석)
 */
export function computeKpiAchievements(data: Dataset): KpiAchievement[] {
  const months = [...data.monthlyKpi].sort((a, b) => a.year_month.localeCompare(b.year_month));

  return data.kpiTargets.map((target) => {
    const series = months.map((m) => {
      const v = m[target.metric as keyof MonthlyKpiRow];
      return { month: m.year_month, value: typeof v === "number" ? v : null };
    });
    const nums = series.map((s) => s.value).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    let actualValue: number | null = null;
    if (nums.length > 0) {
      actualValue =
        target.target_period === "monthly_avg"
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : nums.reduce((a, b) => a + b, 0);
    }

    const achievementRate =
      actualValue !== null && target.target_value > 0 ? (actualValue / target.target_value) * 100 : null;

    return { ...target, actualValue, achievementRate, monthsUsed: nums.length, series };
  });
}
