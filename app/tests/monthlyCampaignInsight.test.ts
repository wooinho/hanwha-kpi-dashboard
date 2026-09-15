import { describe, it, expect } from "vitest";
import { listAvailableMonths, buildMonthlyCampaignInsight } from "@/lib/monthlyCampaignInsight";
import type { Dataset, EventRow, PerformanceRow, MonthlyKpiRow, KpiTarget } from "@/lib/types";

function makeEvent(overrides: Partial<EventRow>): EventRow {
  return {
    event_id: "E1",
    source_file: "test",
    report_month: "2026-07",
    event_month: "2026-07",
    data_status: "result",
    event_name: "테스트 이벤트",
    event_category: "골든위크",
    target_primary: "FP/Agt.",
    target_secondary: "데이터 없음",
    business_objective: "데이터 없음",
    target_behavior: "데이터 없음",
    participation_condition: "데이터 없음",
    mechanic_type: "데이터 없음",
    channel: "데이터 없음",
    seasonal_theme: "데이터 없음",
    key_message: "데이터 없음",
    cta: "데이터 없음",
    start_date: "N/A",
    end_date: "N/A",
    data_quality_status: "정상",
    review_required: false,
    source_page: "slide 1",
    ...overrides,
  };
}

function makePerf(overrides: Partial<PerformanceRow>): PerformanceRow {
  return {
    performance_id: "P1",
    event_id: "E1",
    exposure_count: "N/A",
    unique_visitor_count: "N/A",
    participant_count: "N/A",
    mission_complete_count: "N/A",
    share_count: "N/A",
    touch_send_count: "N/A",
    customer_response_count: "N/A",
    repeat_participant_count: "N/A",
    winner_count: "N/A",
    completion_rate: "N/A",
    participation_rate: "N/A",
    share_rate: "N/A",
    touch_conversion_rate: "N/A",
    cost_per_participant: "N/A",
    cost_per_completion: "N/A",
    previous_event_value: "N/A",
    change_rate: "N/A",
    qualitative_result: "데이터 없음",
    evidence_type: "A",
    confidence_level: "확인됨",
    source_page: "slide 1",
    review_kind: "N/A",
    ...overrides,
  };
}

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

describe("buildMonthlyCampaignInsight", () => {
  it("선택한 월에 해당하는 캠페인만 모으고, 정량 근거 회차의 참여자 수를 요약에 반영한다", () => {
    const data: Dataset = {
      events: [
        makeEvent({ event_id: "GW-07", event_month: "2026-07" }),
        makeEvent({ event_id: "GW-08", event_month: "2026-08", event_name: "다른 달 이벤트" }),
      ],
      benefits: [],
      performance: [makePerf({ event_id: "GW-07", evidence_type: "A", participant_count: 500 })],
      insights: [],
      monthlyKpi: [month("2026-06", { ga_login_count: 5000 }), month("2026-07", { ga_login_count: 6000 })],
      kpiTargets: TARGETS,
    };

    const result = buildMonthlyCampaignInsight(data, "2026-07");
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0].eventId).toBe("GW-07");
    expect(result.summary).toContain("1개 캠페인");

    const ga = result.kpiSnapshot.find((k) => k.metric === "ga_login_count")!;
    expect(ga.value).toBe(6000);
    expect(ga.momChangePct).toBeCloseTo(20); // 5000 -> 6000
  });

  it("보고서 누락 월은 reportStatus를 그대로 전달한다", () => {
    const data: Dataset = {
      events: [],
      benefits: [],
      performance: [],
      insights: [],
      monthlyKpi: [month("2026-06", { report_status: "보고서 누락" })],
      kpiTargets: TARGETS,
    };
    const result = buildMonthlyCampaignInsight(data, "2026-06");
    expect(result.reportStatus).toBe("보고서 누락");
    expect(result.summary).toContain("등록된 캠페인이 없습니다");
  });

  it("listAvailableMonths는 이벤트/월별집계에 등장하는 모든 월을 오름차순으로 모은다", () => {
    const data: Dataset = {
      events: [makeEvent({ event_month: "2026-08" })],
      benefits: [],
      performance: [],
      insights: [],
      monthlyKpi: [month("2026-02"), month("2026-01")],
      kpiTargets: [],
    };
    expect(listAvailableMonths(data)).toEqual(["2026-01", "2026-02", "2026-08"]);
  });
});

describe("buildMonthlyCampaignInsight - workingAnalyses (데이터 나열이 아니라 해석)", () => {
  it("이전 회차 대비 참여가 10%p 이상 늘면 worked로 판정하고, 이전 회차 수치를 근거로 코멘트를 만든다", () => {
    const data: Dataset = {
      events: [
        makeEvent({ event_id: "GW-06", event_month: "2026-06" }),
        makeEvent({ event_id: "GW-07", event_month: "2026-07" }),
      ],
      benefits: [],
      performance: [
        makePerf({ event_id: "GW-06", evidence_type: "A", participant_count: 1000 }),
        makePerf({ event_id: "GW-07", evidence_type: "A", participant_count: 1500 }),
      ],
      insights: [],
      monthlyKpi: [],
      kpiTargets: TARGETS,
    };
    const result = buildMonthlyCampaignInsight(data, "2026-07");
    const a = result.workingAnalyses.find((w) => w.eventId === "GW-07")!;
    expect(a.verdict).toBe("worked");
    expect(a.momChangePct).toBeCloseTo(50);
    expect(a.compareEventMonth).toBe("2026-06");
    expect(a.comment).toContain("1,000명");
    expect(a.comment).toContain("+50.0%");
  });

  it("이전 회차 대비 참여가 10%p 이상 줄면 underperformed로 판정한다", () => {
    const data: Dataset = {
      events: [
        makeEvent({ event_id: "GW-06", event_month: "2026-06" }),
        makeEvent({ event_id: "GW-07", event_month: "2026-07" }),
      ],
      benefits: [],
      performance: [
        makePerf({ event_id: "GW-06", evidence_type: "A", participant_count: 1000 }),
        makePerf({ event_id: "GW-07", evidence_type: "A", participant_count: 400 }),
      ],
      insights: [],
      monthlyKpi: [],
      kpiTargets: TARGETS,
    };
    const result = buildMonthlyCampaignInsight(data, "2026-07");
    const a = result.workingAnalyses.find((w) => w.eventId === "GW-07")!;
    expect(a.verdict).toBe("underperformed");
    expect(a.momChangePct).toBeCloseTo(-60);
  });

  it("비교할 이전 회차가 없으면 baseline, 참여자 수 자체가 없으면 insufficient_evidence로 판정한다", () => {
    const data: Dataset = {
      events: [
        makeEvent({ event_id: "GW-07", event_month: "2026-07" }),
        makeEvent({ event_id: "TA-07", event_month: "2026-07", event_category: "터치어워즈" }),
      ],
      benefits: [],
      performance: [
        makePerf({ event_id: "GW-07", evidence_type: "A", participant_count: 900 }),
        makePerf({ event_id: "TA-07", evidence_type: "C", review_kind: "improve", qualitative_result: "개선 필요" }),
      ],
      insights: [],
      monthlyKpi: [],
      kpiTargets: TARGETS,
    };
    const result = buildMonthlyCampaignInsight(data, "2026-07");
    const gw = result.workingAnalyses.find((w) => w.eventId === "GW-07")!;
    const ta = result.workingAnalyses.find((w) => w.eventId === "TA-07")!;
    expect(gw.verdict).toBe("baseline");
    expect(gw.compareEventMonth).toBeNull();
    expect(ta.verdict).toBe("insufficient_evidence");
  });

  it("insights.csv에 인사이트가 없을 때, 같은 달 worked/underperformed 캠페인을 대비시켜 다음 달 가설을 만든다", () => {
    const data: Dataset = {
      events: [
        makeEvent({ event_id: "GW-06", event_month: "2026-06", event_name: "골든위크" }),
        makeEvent({ event_id: "GW-07", event_month: "2026-07", event_name: "골든위크" }),
        makeEvent({ event_id: "TA-06", event_month: "2026-06", event_category: "터치어워즈", event_name: "터치어워즈" }),
        makeEvent({ event_id: "TA-07", event_month: "2026-07", event_category: "터치어워즈", event_name: "터치어워즈" }),
      ],
      benefits: [],
      performance: [
        makePerf({ event_id: "GW-06", evidence_type: "A", participant_count: 1000 }),
        makePerf({ event_id: "GW-07", evidence_type: "A", participant_count: 1500 }), // worked
        makePerf({ event_id: "TA-06", evidence_type: "A", participant_count: 1000 }),
        makePerf({ event_id: "TA-07", evidence_type: "A", participant_count: 400 }), // underperformed
      ],
      insights: [],
      monthlyKpi: [],
      kpiTargets: TARGETS,
    };
    const result = buildMonthlyCampaignInsight(data, "2026-07");
    expect(result.recommendations[0]).toContain("'골든위크'");
    expect(result.recommendations[0]).toContain("'터치어워즈'");
    expect(result.recommendations[0]).toMatch(/참여가 늘고/);
  });
});
