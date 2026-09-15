import { describe, it, expect } from "vitest";
import { buildCampaignInsights } from "@/lib/campaignInsights";
import type { Dataset, EventRow, PerformanceRow } from "@/lib/types";

function makeEvent(overrides: Partial<EventRow>): EventRow {
  return {
    event_id: "E1",
    source_file: "test",
    report_month: "2026-07",
    event_month: "2026-07",
    data_status: "result",
    event_name: "테스트",
    event_category: "골든위크",
    target_primary: "FP/Agt.",
    target_secondary: "데이터 없음",
    business_objective: "데이터 없음",
    target_behavior: "이벤트 참여, 고객 응모",
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
    evidence_type: "D",
    confidence_level: "근거 부족",
    source_page: "slide 1",
    review_kind: "N/A",
    ...overrides,
  };
}

function makeDataset(events: EventRow[], performance: PerformanceRow[]): Dataset {
  return { events, benefits: [], performance, insights: [], monthlyKpi: [], kpiTargets: [] };
}

describe("buildCampaignInsights", () => {
  it("A/B 근거가 있는 회차만 합산하고 근거 수준을 'confirmed'로 분류한다", () => {
    const events = [
      makeEvent({ event_id: "GW-1", event_month: "2026-07" }),
      makeEvent({ event_id: "GW-2", event_month: "2026-08", data_status: "plan" }),
    ];
    const performance = [
      makePerf({ event_id: "GW-1", evidence_type: "A", participant_count: 100 }),
      makePerf({ event_id: "GW-2", evidence_type: "D" }), // 근거 부족 회차는 합산 제외
    ];
    const [gw] = buildCampaignInsights(makeDataset(events, performance));
    expect(gw.category).toBe("골든위크");
    expect(gw.roundCount).toBe(2);
    expect(gw.evidencedRoundCount).toBe(1);
    expect(gw.totalParticipants).toBe(100); // GW-2는 제외됨(0으로 왜곡 안 함)
    expect(gw.contributionLevel).toBe("confirmed");
    expect(gw.relatedKpiLabels).toContain("연간 고객 응모 수");
  });

  it("정성 리뷰만 있으면 'observed', 근거가 전혀 없으면 'insufficient'로 분류한다", () => {
    const events = [makeEvent({ event_id: "SD-1", event_category: "설계지원팀장" })];
    const perfObserved = [makePerf({ event_id: "SD-1", evidence_type: "C" })];
    const [observed] = buildCampaignInsights(makeDataset(events, perfObserved));
    expect(observed.contributionLevel).toBe("observed");

    const perfNone = [makePerf({ event_id: "SD-1", evidence_type: "D" })];
    const [insufficient] = buildCampaignInsights(makeDataset(events, perfNone));
    expect(insufficient.contributionLevel).toBe("insufficient");
  });

  it("근거가 하나도 없는 캠페인의 참여자 합계는 N/A다(0이 아님)", () => {
    const events = [makeEvent({ event_id: "X-1", event_category: "지방문화혜택" })];
    const performance = [makePerf({ event_id: "X-1", evidence_type: "D" })];
    const [x] = buildCampaignInsights(makeDataset(events, performance));
    expect(x.totalParticipants).toBe("N/A");
  });

  it("해석 문장에 이벤트명을 직접 언급해, 어떤 회차가 KPI에 기여했고 어떤 회차는 근거가 부족한지 알 수 있다", () => {
    const events = [
      makeEvent({ event_id: "GW-1", event_month: "2026-03", event_name: "골든위크" }),
      makeEvent({ event_id: "GW-2", event_month: "2026-07", event_name: "골든위크" }),
      makeEvent({ event_id: "GW-3", event_month: "2026-08", event_name: "골든위크(계획)" }),
    ];
    const performance = [
      makePerf({ event_id: "GW-1", evidence_type: "A", participant_count: 8000 }),
      makePerf({ event_id: "GW-2", evidence_type: "A", participant_count: 43000 }),
      makePerf({ event_id: "GW-3", evidence_type: "D" }), // 근거 부족 회차
    ];
    const [gw] = buildCampaignInsights(makeDataset(events, performance));
    // 가장 많이 참여한 회차(2026-07)와 가장 적었던 회차(2026-03)를 이름으로 지목한다
    expect(gw.interpretation).toContain("골든위크(2026-07");
    expect(gw.interpretation).toContain("43,000명");
    expect(gw.interpretation).toContain("골든위크(2026-03");
    // 근거가 부족한 회차(2026-08)도 이름으로 지목해 기여 여부를 판단할 수 없다고 밝힌다
    expect(gw.interpretation).toContain("골든위크(계획)(2026-08)");
  });

  it("정성 리뷰만 있는 회차는 해석 문장에 이벤트명을 언급하며 수치화하지 않았음을 밝힌다", () => {
    const events = [makeEvent({ event_id: "SD-1", event_category: "설계지원팀장", event_month: "2026-02", event_name: "설계지원팀장" })];
    const performance = [makePerf({ event_id: "SD-1", evidence_type: "C" })];
    const [observed] = buildCampaignInsights(makeDataset(events, performance));
    expect(observed.interpretation).toContain("설계지원팀장(2026-02)");
  });

  it("근거가 전혀 없는 회차도 해석 문장에 이벤트명을 언급한다", () => {
    const events = [makeEvent({ event_id: "X-1", event_category: "지방문화혜택", event_month: "2026-04", event_name: "지방문화혜택_광주공연" })];
    const performance = [makePerf({ event_id: "X-1", evidence_type: "D" })];
    const [x] = buildCampaignInsights(makeDataset(events, performance));
    expect(x.interpretation).toContain("지방문화혜택_광주공연(2026-04)");
  });
});
