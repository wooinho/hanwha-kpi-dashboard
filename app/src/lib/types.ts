/**
 * 공통 데이터 스키마 (프롬프트 5절 대응).
 * 정량 필드는 "값이 없을 수 있음"을 타입으로 강제하기 위해 number | "N/A" 유니언을 쓴다.
 * 절대 0으로 대체하지 않는다 - 없으면 반드시 "N/A" 리터럴.
 */
import { z } from "zod";

export const NA = "N/A" as const;
export const NO_DATA = "데이터 없음" as const;

/** 숫자 또는 "N/A". CSV에서 파싱할 때 이 스키마를 통과시키면 안전하게 구분된다. */
export const NumOrNA = z.union([z.number(), z.literal(NA)]);
export type NumOrNA = z.infer<typeof NumOrNA>;

export const TextOrNoData = z.string().min(1);

export const EvidenceType = z.enum(["A", "B", "C", "D"]);
export type EvidenceType = z.infer<typeof EvidenceType>;

export const DataStatus = z.enum(["plan", "result", "mixed", "확인 필요"]);
export type DataStatus = z.infer<typeof DataStatus>;

export const EventSchema = z.object({
  event_id: z.string(),
  source_file: z.string(),
  report_month: z.string(), // YYYY-MM
  event_month: z.string(), // YYYY-MM
  data_status: DataStatus,
  event_name: z.string(),
  event_category: z.string(),
  target_primary: z.string(),
  target_secondary: z.string(),
  business_objective: z.string(),
  target_behavior: z.string(),
  participation_condition: z.string(),
  mechanic_type: z.string(),
  channel: z.string(),
  seasonal_theme: z.string(),
  key_message: z.string(),
  cta: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  data_quality_status: z.string(),
  review_required: z.boolean(),
  source_page: z.string(),
});
export type EventRow = z.infer<typeof EventSchema>;

export const BenefitSchema = z.object({
  benefit_id: z.string(),
  event_id: z.string(),
  benefit_name: z.string(),
  benefit_type: z.string(),
  benefit_tier: z.string(),
  benefit_value: NumOrNA,
  winner_count: NumOrNA,
  benefit_budget: NumOrNA,
  minimum_reward_value: NumOrNA,
  reward_method: z.string(),
  scarcity_type: z.string(),
  premium_level: z.string(),
  practicality_level: z.string(),
  seasonality_level: z.string(),
  data_quality_status: z.string(),
  source_page: z.string(),
});
export type BenefitRow = z.infer<typeof BenefitSchema>;

export const PerformanceSchema = z.object({
  performance_id: z.string(),
  event_id: z.string(),
  exposure_count: NumOrNA,
  unique_visitor_count: NumOrNA,
  participant_count: NumOrNA,
  mission_complete_count: NumOrNA,
  share_count: NumOrNA,
  touch_send_count: NumOrNA,
  customer_response_count: NumOrNA,
  repeat_participant_count: NumOrNA,
  winner_count: NumOrNA,
  completion_rate: NumOrNA,
  participation_rate: NumOrNA,
  share_rate: NumOrNA,
  touch_conversion_rate: NumOrNA,
  cost_per_participant: NumOrNA,
  cost_per_completion: NumOrNA,
  previous_event_value: NumOrNA,
  change_rate: NumOrNA,
  qualitative_result: z.string(),
  evidence_type: EvidenceType,
  confidence_level: z.string(),
  source_page: z.string(),
  review_kind: z.string(), // result_qualitative/improve/plan_rationale/observation/process/no_evidence/N/A
});
export type PerformanceRow = z.infer<typeof PerformanceSchema>;

export const InsightSchema = z.object({
  insight_id: z.string(),
  event_id: z.string(), // "N/A" 가능(월 전체 인사이트)
  fact: z.string(),
  interpretation: z.string(),
  limitation: z.string(),
  next_month_hypothesis: z.string(),
  verification_kpi: z.string(),
  evidence_type: EvidenceType,
  source_file: z.string(),
  source_page: z.string(),
});
export type InsightRow = z.infer<typeof InsightSchema>;

export const MonthlyKpiSchema = z.object({
  year_month: z.string(),
  report_status: z.enum(["정상", "보고서 누락"]),
  ga_login_count: NumOrNA,
  touch_send_total: NumOrNA,
  touch_send_event: NumOrNA,
  touch_send_newsletter: NumOrNA,
  touch_send_content: NumOrNA,
  send_agent_unique_total: NumOrNA,
  send_agent_unique_event: NumOrNA,
  recv_customer_unique_total: NumOrNA,
  recv_customer_unique_event: NumOrNA,
  apply_total: NumOrNA,
  apply_contract_customer: NumOrNA,
  apply_prospect_customer: NumOrNA,
  note: z.string(),
});
export type MonthlyKpiRow = z.infer<typeof MonthlyKpiSchema>;

export interface Dataset {
  events: EventRow[];
  benefits: BenefitRow[];
  performance: PerformanceRow[];
  insights: InsightRow[];
  monthlyKpi: MonthlyKpiRow[];
}
