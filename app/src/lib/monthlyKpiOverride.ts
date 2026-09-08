import type { MonthlyKpiRow } from "./types";
import type { ParsedMonthRow } from "./parseMonthlyKpiXlsx";

const NA = "N/A" as const;

function n(v: number | null): number | typeof NA {
  return v === null ? NA : v;
}

export function parsedRowToMonthlyKpiRow(r: ParsedMonthRow): MonthlyKpiRow {
  return {
    year_month: r.year_month,
    report_status: "정상",
    ga_login_count: n(r.ga_login_count),
    touch_send_total: n(r.touch_send_total),
    touch_send_event: n(r.touch_send_event),
    touch_send_newsletter: n(r.touch_send_newsletter),
    touch_send_content: n(r.touch_send_content),
    send_agent_unique_total: n(r.send_agent_unique_total),
    send_agent_unique_event: n(r.send_agent_unique_event),
    recv_customer_unique_total: n(r.recv_customer_unique_total),
    recv_customer_unique_event: n(r.recv_customer_unique_event),
    apply_total: n(r.apply_total),
    apply_contract_customer: n(r.apply_contract_customer),
    apply_prospect_customer: n(r.apply_prospect_customer),
    note: "업로드한 엑셀로 갱신됨(이 브라우저 미리보기 전용)",
  };
}

/** 업로드분(override)이 있으면 같은 year_month 행을 통째로 교체하고, 없는 월은 새로 추가한다. */
export function mergeMonthlyKpi(base: MonthlyKpiRow[], overrideRows: ParsedMonthRow[] | null): MonthlyKpiRow[] {
  if (!overrideRows || overrideRows.length === 0) return base;
  const overrideMap = new Map(overrideRows.map((r) => [r.year_month, parsedRowToMonthlyKpiRow(r)]));
  const merged = base.map((row) => overrideMap.get(row.year_month) ?? row);
  for (const [ym, row] of overrideMap) {
    if (!merged.some((r) => r.year_month === ym)) merged.push(row);
  }
  return merged.sort((a, b) => a.year_month.localeCompare(b.year_month));
}

/** 실제 배포용 monthly_kpi.csv 텍스트 생성 (data/processed/monthly_kpi.csv 와 동일 컬럼 순서). */
export function toMonthlyKpiCsv(rows: MonthlyKpiRow[]): string {
  const columns: (keyof MonthlyKpiRow)[] = [
    "year_month",
    "report_status",
    "ga_login_count",
    "touch_send_total",
    "touch_send_event",
    "touch_send_newsletter",
    "touch_send_content",
    "send_agent_unique_total",
    "send_agent_unique_event",
    "recv_customer_unique_total",
    "recv_customer_unique_event",
    "apply_total",
    "apply_contract_customer",
    "apply_prospect_customer",
    "note",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(","));
  }
  return lines.join("\n");
}
