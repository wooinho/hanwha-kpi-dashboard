import { describe, it, expect } from "vitest";
import { buildMonthlyDiagnosis } from "@/lib/diagnosis";
import type { Dataset, MonthlyKpiRow, KpiTarget } from "@/lib/types";

function month(ym: string, overrides: Partial<MonthlyKpiRow> = {}): MonthlyKpiRow {
  return {
    year_month: ym,
    report_status: "정상",
    ga_login_count: "N/A",
    touch_send_total: "N/A",
    touch_send_event: "N/A",
    touch_send_newsletter: "N/A",
    touch_send_content: "N/A",
    send_agent_unique_total: "N/A",
    send_agent_unique_event: "N/A",
    recv_customer_unique_total: "N/A",
    recv_customer_unique_event: "N/A",
    apply_total: "N/A",
    apply_contract_customer: "N/A",
    apply_prospect_customer: "N/A",
    note: "",
    ...overrides,
  };
}

const TARGETS: KpiTarget[] = [
  { metric: "ga_login_count", label: "GA 접속자", target_value: 9000, target_period: "monthly_avg", unit: "명", source: "test" },
  { metric: "apply_total", label: "고객 응모", target_value: 195000, target_period: "annual_cumulative", unit: "명", source: "test" },
];

function makeDataset(monthlyKpi: MonthlyKpiRow[]): Dataset {
  return { events: [], benefits: [], performance: [], insights: [], monthlyKpi, kpiTargets: TARGETS };
}

describe("buildMonthlyDiagnosis", () => {
  it("월평균형 지표: 목표 미달이면 위험/주의로 분류하고 사실에 수치를 담는다", () => {
    const data = makeDataset([
      month("2026-01", { ga_login_count: 5000 }),
      month("2026-02", { ga_login_count: 4000 }), // 하락, 목표(9000) 대비 44%
    ]);
    const [ga] = buildMonthlyDiagnosis(data);
    expect(ga.status).toBe("critical"); // 44% < 70%
    expect(ga.trend).toBe("하락");
    expect(ga.momChangePct).toBeCloseTo(-20);
    expect(ga.fact).toContain("2026-02");
  });

  it("데이터가 전혀 없으면 '데이터 부족' 상태를 반환한다(0으로 왜곡하지 않음)", () => {
    const data = makeDataset([month("2026-01"), month("2026-02")]);
    const [ga] = buildMonthlyDiagnosis(data);
    expect(ga.status).toBe("unknown");
    expect(ga.latestValue).toBeNull();
  });

  it("연간 누적형 지표: 경과 개월 대비 페이스를 계산한다", () => {
    const data = makeDataset([
      month("2026-01", { apply_total: 10000 }),
      month("2026-02", { apply_total: 10000 }), // 2개월 누적 20000, 목표 195000의 페이스는 195000*2/12=32500
    ]);
    const apply = buildMonthlyDiagnosis(data).find((d) => d.metric === "apply_total")!;
    // 20000 / 32500 = 61.5%
    expect(apply.vsTargetPct).toBeCloseTo(61.5, 0);
    expect(apply.status).toBe("critical");
  });

  it("목표를 충족하면 '양호'로 분류한다", () => {
    const data = makeDataset([month("2026-01", { ga_login_count: 9500 })]);
    const [ga] = buildMonthlyDiagnosis(data);
    expect(ga.status).toBe("good");
  });
});
