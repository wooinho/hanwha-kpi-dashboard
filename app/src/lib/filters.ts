import type { EventRow, BenefitRow } from "./types";

export const ALL = "전체";

export interface FilterState {
  reportMonth: string;
  eventMonth: string;
  category: string;
  target: string;
  benefitType: string;
  dataStatus: string;
  confidence: string; // 전체 / 검수완료 / 확인 필요
}

export const DEFAULT_FILTERS: FilterState = {
  reportMonth: ALL,
  eventMonth: ALL,
  category: ALL,
  target: ALL,
  benefitType: ALL,
  dataStatus: ALL,
  confidence: ALL,
};

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function filterEvents(
  events: EventRow[],
  benefits: BenefitRow[],
  f: FilterState
): EventRow[] {
  const benefitTypesByEvent = new Map<string, Set<string>>();
  for (const b of benefits) {
    if (!benefitTypesByEvent.has(b.event_id)) benefitTypesByEvent.set(b.event_id, new Set());
    benefitTypesByEvent.get(b.event_id)!.add(b.benefit_type);
  }

  return events.filter((e) => {
    if (f.reportMonth !== ALL && e.report_month !== f.reportMonth) return false;
    if (f.eventMonth !== ALL && e.event_month !== f.eventMonth) return false;
    if (f.category !== ALL && e.event_category !== f.category) return false;
    if (f.target !== ALL && e.target_primary !== f.target && e.target_secondary !== f.target) return false;
    if (f.dataStatus !== ALL && e.data_status !== f.dataStatus) return false;
    if (f.confidence === "검수완료" && e.review_required) return false;
    if (f.confidence === "확인 필요" && !e.review_required) return false;
    if (f.benefitType !== ALL) {
      const types = benefitTypesByEvent.get(e.event_id);
      if (!types || !types.has(f.benefitType)) return false;
    }
    return true;
  });
}
