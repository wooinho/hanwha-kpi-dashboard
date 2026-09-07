import "server-only";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import {
  NA,
  type Dataset,
  type EventRow,
  type BenefitRow,
  type PerformanceRow,
  type InsightRow,
  type MonthlyKpiRow,
} from "./types";

/**
 * data/processed/*.csv 를 읽어온다. 로컬 우선 구조 원칙에 따라 이 프로젝트는
 * 외부 서버로 데이터를 보내지 않고, 저장소 내 CSV 파일을 서버 컴포넌트에서 직접 읽는다.
 * (README '기술 구성' 참고 - MVP 단계 저장소로 정제 CSV를 선택한 이유)
 */
const PROCESSED_DIR = path.join(process.cwd(), "..", "data", "processed");

function readCsv<T extends Record<string, unknown>>(filename: string): T[] {
  const filePath = path.join(PROCESSED_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<T>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // 숫자/N/A 구분은 우리가 직접 한다 (자동 형변환 금지)
  });
  return parsed.data;
}

/** "123" -> 123, "N/A" 또는 빈 문자열 -> "N/A". 원본에 없는 값을 0으로 왜곡하지 않는다. */
function numOrNA(v: unknown): number | typeof NA {
  if (v === undefined || v === null) return NA;
  const s = String(v).trim();
  if (s === "" || s === "N/A") return NA;
  const n = Number(s);
  return Number.isFinite(n) ? n : NA;
}

function textOrNA(v: unknown, fallback: string = NA): string {
  if (v === undefined || v === null) return fallback;
  const s = String(v).trim();
  return s === "" ? fallback : s;
}

function boolVal(v: unknown): boolean {
  return String(v).trim().toLowerCase() === "true";
}

function mapEvent(r: Record<string, string>): EventRow {
  return {
    event_id: r.event_id,
    source_file: r.source_file,
    report_month: r.report_month,
    event_month: r.event_month,
    data_status: r.data_status as EventRow["data_status"],
    event_name: r.event_name,
    event_category: r.event_category,
    target_primary: textOrNA(r.target_primary, "데이터 없음"),
    target_secondary: textOrNA(r.target_secondary, "데이터 없음"),
    business_objective: textOrNA(r.business_objective, "데이터 없음"),
    target_behavior: textOrNA(r.target_behavior, "데이터 없음"),
    participation_condition: textOrNA(r.participation_condition, "데이터 없음"),
    mechanic_type: textOrNA(r.mechanic_type, "데이터 없음"),
    channel: textOrNA(r.channel, "데이터 없음"),
    seasonal_theme: textOrNA(r.seasonal_theme, "데이터 없음"),
    key_message: textOrNA(r.key_message, "데이터 없음"),
    cta: textOrNA(r.cta, "데이터 없음"),
    start_date: textOrNA(r.start_date),
    end_date: textOrNA(r.end_date),
    data_quality_status: r.data_quality_status,
    review_required: boolVal(r.review_required),
    source_page: r.source_page,
  };
}

function mapBenefit(r: Record<string, string>): BenefitRow {
  return {
    benefit_id: r.benefit_id,
    event_id: r.event_id,
    benefit_name: r.benefit_name,
    benefit_type: r.benefit_type,
    benefit_tier: r.benefit_tier,
    benefit_value: numOrNA(r.benefit_value),
    winner_count: numOrNA(r.winner_count),
    benefit_budget: numOrNA(r.benefit_budget),
    minimum_reward_value: numOrNA(r.minimum_reward_value),
    reward_method: textOrNA(r.reward_method, "데이터 없음"),
    scarcity_type: textOrNA(r.scarcity_type, "데이터 없음"),
    premium_level: textOrNA(r.premium_level, "데이터 없음"),
    practicality_level: textOrNA(r.practicality_level, "데이터 없음"),
    seasonality_level: textOrNA(r.seasonality_level, "데이터 없음"),
    data_quality_status: r.data_quality_status,
    source_page: r.source_page,
  };
}

function mapPerformance(r: Record<string, string>): PerformanceRow {
  return {
    performance_id: r.performance_id,
    event_id: r.event_id,
    exposure_count: numOrNA(r.exposure_count),
    unique_visitor_count: numOrNA(r.unique_visitor_count),
    participant_count: numOrNA(r.participant_count),
    mission_complete_count: numOrNA(r.mission_complete_count),
    share_count: numOrNA(r.share_count),
    touch_send_count: numOrNA(r.touch_send_count),
    customer_response_count: numOrNA(r.customer_response_count),
    repeat_participant_count: numOrNA(r.repeat_participant_count),
    winner_count: numOrNA(r.winner_count),
    completion_rate: numOrNA(r.completion_rate),
    participation_rate: numOrNA(r.participation_rate),
    share_rate: numOrNA(r.share_rate),
    touch_conversion_rate: numOrNA(r.touch_conversion_rate),
    cost_per_participant: numOrNA(r.cost_per_participant),
    cost_per_completion: numOrNA(r.cost_per_completion),
    previous_event_value: numOrNA(r.previous_event_value),
    change_rate: numOrNA(r.change_rate),
    qualitative_result: textOrNA(r.qualitative_result, "데이터 없음"),
    evidence_type: r.evidence_type as PerformanceRow["evidence_type"],
    confidence_level: textOrNA(r.confidence_level, "데이터 없음"),
    source_page: r.source_page,
    review_kind: textOrNA(r.review_kind),
  };
}

function mapInsight(r: Record<string, string>): InsightRow {
  return {
    insight_id: r.insight_id,
    event_id: r.event_id,
    fact: r.fact,
    interpretation: r.interpretation,
    limitation: r.limitation,
    next_month_hypothesis: r.next_month_hypothesis,
    verification_kpi: r.verification_kpi,
    evidence_type: r.evidence_type as InsightRow["evidence_type"],
    source_file: r.source_file,
    source_page: r.source_page,
  };
}

function mapMonthlyKpi(r: Record<string, string>): MonthlyKpiRow {
  return {
    year_month: r.year_month,
    report_status: r.report_status as MonthlyKpiRow["report_status"],
    ga_login_count: numOrNA(r.ga_login_count),
    touch_send_total: numOrNA(r.touch_send_total),
    touch_send_event: numOrNA(r.touch_send_event),
    touch_send_newsletter: numOrNA(r.touch_send_newsletter),
    touch_send_content: numOrNA(r.touch_send_content),
    send_agent_unique_total: numOrNA(r.send_agent_unique_total),
    send_agent_unique_event: numOrNA(r.send_agent_unique_event),
    recv_customer_unique_total: numOrNA(r.recv_customer_unique_total),
    recv_customer_unique_event: numOrNA(r.recv_customer_unique_event),
    apply_total: numOrNA(r.apply_total),
    apply_contract_customer: numOrNA(r.apply_contract_customer),
    apply_prospect_customer: numOrNA(r.apply_prospect_customer),
    note: textOrNA(r.note, ""),
  };
}

export interface DataAudit {
  [key: string]: unknown;
}

let auditCache: DataAudit | null = null;

export function loadAudit(): DataAudit {
  if (auditCache) return auditCache;
  const filePath = path.join(PROCESSED_DIR, "data_audit.json");
  auditCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return auditCache!;
}

let cache: Dataset | null = null;

export function loadDataset(): Dataset {
  if (cache) return cache;
  cache = {
    events: readCsv<Record<string, string>>("events.csv").map(mapEvent),
    benefits: readCsv<Record<string, string>>("benefits.csv").map(mapBenefit),
    performance: readCsv<Record<string, string>>("performance.csv").map(mapPerformance),
    insights: readCsv<Record<string, string>>("insights.csv").map(mapInsight),
    monthlyKpi: readCsv<Record<string, string>>("monthly_kpi.csv").map(mapMonthlyKpi),
  };
  return cache;
}
