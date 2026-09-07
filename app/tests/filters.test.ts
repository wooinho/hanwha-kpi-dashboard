import { describe, it, expect } from "vitest";
import { filterEvents, DEFAULT_FILTERS, ALL } from "@/lib/filters";
import type { EventRow, BenefitRow } from "@/lib/types";

function makeEvent(overrides: Partial<EventRow>): EventRow {
  return {
    event_id: "E1",
    source_file: "test.pptx",
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

describe("계획(plan) 월과 결과(result) 월 분리", () => {
  const events: EventRow[] = [
    makeEvent({ event_id: "RESULT-1", report_month: "2026-07", event_month: "2026-07", data_status: "result" }),
    makeEvent({ event_id: "PLAN-1", report_month: "2026-07", event_month: "2026-08", data_status: "plan" }),
  ];
  const benefits: BenefitRow[] = [];

  it("data_status=plan 필터는 결과(result) 건을 섞지 않는다", () => {
    const planOnly = filterEvents(events, benefits, { ...DEFAULT_FILTERS, dataStatus: "plan" });
    expect(planOnly.map((e) => e.event_id)).toEqual(["PLAN-1"]);
  });

  it("data_status=result 필터는 계획(plan) 건을 섞지 않는다", () => {
    const resultOnly = filterEvents(events, benefits, { ...DEFAULT_FILTERS, dataStatus: "result" });
    expect(resultOnly.map((e) => e.event_id)).toEqual(["RESULT-1"]);
  });

  it("같은 report_month(2026-07) 안에 있어도 event_month가 다르면 서로 다른 값으로 유지된다", () => {
    // 7월 보고서 안에 7월 결과와 8월 계획이 같이 있는 실제 사례(event_log.py)를 재현
    expect(events[0].report_month).toBe(events[1].report_month);
    expect(events[0].event_month).not.toBe(events[1].event_month);
  });

  it("전체(ALL) 필터는 둘 다 포함한다", () => {
    const all = filterEvents(events, benefits, { ...DEFAULT_FILTERS, dataStatus: ALL });
    expect(all).toHaveLength(2);
  });
});

describe("검수 필요(review_required) 필터", () => {
  const events: EventRow[] = [
    makeEvent({ event_id: "OK-1", review_required: false }),
    makeEvent({ event_id: "NEEDS-REVIEW-1", review_required: true }),
  ];

  it("'검수완료' 필터는 review_required=true 건을 제외한다", () => {
    const result = filterEvents(events, [], { ...DEFAULT_FILTERS, confidence: "검수완료" });
    expect(result.map((e) => e.event_id)).toEqual(["OK-1"]);
  });

  it("'확인 필요' 필터는 review_required=false 건을 제외한다", () => {
    const result = filterEvents(events, [], { ...DEFAULT_FILTERS, confidence: "확인 필요" });
    expect(result.map((e) => e.event_id)).toEqual(["NEEDS-REVIEW-1"]);
  });
});
