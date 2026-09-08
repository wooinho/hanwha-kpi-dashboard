/**
 * [고객터치 시스템] 월별 주요지표 .xlsx 를 브라우저에서 직접 파싱한다 (SheetJS, 클라이언트 전용).
 *
 * 하드코딩된 셀 좌표 대신 라벨 텍스트를 스캔해서 값을 찾는다 - CJ나눔재단 프로젝트에서 셀 좌표를
 * 하드코딩했다가 행이 하나만 밀려도 깨졌던 문제를 재발하지 않기 위함. 새 월이 추가돼 시트 구조가
 * 살짝 바뀌어도(행 삽입 등) 라벨만 유지되면 계속 동작한다.
 *
 * scripts/build_data.py 의 build_monthly_kpi_from_xlsx() 와 같은 시트("1.GA 접속")를 같은 방식으로
 * 읽되, 이쪽은 좌표 대신 라벨을 스캔한다. 원본에 없는 값은 절대 0으로 채우지 않고 null로 남긴다.
 */
import * as XLSX from "xlsx";

export interface ParsedMonthRow {
  year_month: string;
  ga_login_count: number | null;
  touch_send_total: number | null;
  touch_send_event: number | null;
  touch_send_newsletter: number | null;
  touch_send_content: number | null;
  send_agent_unique_total: number | null;
  send_agent_unique_event: number | null;
  recv_customer_unique_total: number | null;
  recv_customer_unique_event: number | null;
  apply_total: number | null;
  apply_contract_customer: number | null;
  apply_prospect_customer: number | null;
}

export interface ParseResult {
  rows: ParsedMonthRow[];
  warnings: string[];
  sheetUsed: string | null;
}

type Grid = unknown[][];

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "" || s.startsWith("#")) return null; // "#REF!" 등 수식 오류
    const n = Number(s.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function findRowContaining(grid: Grid, keyword: string, fromRow = 0): number | null {
  for (let r = fromRow; r < grid.length; r++) {
    const row = grid[r] ?? [];
    for (const cell of row) {
      if (typeof cell === "string" && cell.replace(/\s/g, "").includes(keyword.replace(/\s/g, ""))) {
        return r;
      }
    }
  }
  return null;
}

/** '구분' 헤더 행에서 1,2,3... 순차 월 번호가 있는 컬럼들을 찾는다. */
function findMonthColumns(grid: Grid, headerRow: number): { col: number; month: number }[] {
  const row = grid[headerRow] ?? [];
  const result: { col: number; month: number }[] = [];
  let expected = 1;
  for (let c = 0; c < row.length; c++) {
    const v = row[c];
    if (typeof v === "number" && v === expected) {
      result.push({ col: c, month: v });
      expected += 1;
    }
  }
  return result;
}

/** 라벨(예: '합계','이벤트') 행을 헤더 행 아래 몇 줄 안에서 찾아 월별 값을 뽑는다. */
function extractLabeledSeries(
  grid: Grid,
  headerRow: number,
  monthCols: { col: number; month: number }[],
  label: string,
  searchWindow = 6
): Record<number, number | null> {
  const out: Record<number, number | null> = {};
  for (let r = headerRow + 1; r <= headerRow + searchWindow && r < grid.length; r++) {
    const row = grid[r] ?? [];
    // 라벨 셀에 줄바꿈+부연설명이 붙기도 함(예: "이벤트\n(11시콘,골든위크)") - 정확히 일치가 아니라
    // 접두 일치로 비교한다 (CJ나눔재단 프로젝트에서 겪은 임베디드 줄바꿈 셀 문제와 동일 패턴).
    const rowLabel = String(row[0] ?? row[1] ?? "").replace(/\s/g, "");
    if (rowLabel.startsWith(label.replace(/\s/g, ""))) {
      for (const { col, month } of monthCols) {
        out[month] = toNum(row[col]);
      }
      return out;
    }
  }
  return out;
}

function parseStackedTable(
  grid: Grid,
  titleKeyword: string,
  labels: string[],
  warnings: string[]
): { series: Record<string, Record<number, number | null>>; monthCols: { col: number; month: number }[] } | null {
  const titleRow = findRowContaining(grid, titleKeyword);
  if (titleRow === null) {
    warnings.push(`'${titleKeyword}' 제목을 찾지 못했습니다 - 이 항목은 건너뜁니다.`);
    return null;
  }
  const headerRow = findRowContaining(grid, "구분", titleRow);
  if (headerRow === null || headerRow > titleRow + 6) {
    warnings.push(`'${titleKeyword}' 아래에서 '구분' 헤더 행을 찾지 못했습니다.`);
    return null;
  }
  const monthCols = findMonthColumns(grid, headerRow);
  if (monthCols.length === 0) {
    warnings.push(`'${titleKeyword}' 헤더 행에서 월(1,2,3...) 컬럼을 찾지 못했습니다.`);
    return null;
  }
  const series: Record<string, Record<number, number | null>> = {};
  for (const label of labels) {
    series[label] = extractLabeledSeries(grid, headerRow, monthCols, label);
  }
  return { series, monthCols };
}

export function parseMonthlyKpiWorkbook(buffer: ArrayBuffer): ParseResult {
  const warnings: string[] = [];
  const wb = XLSX.read(buffer, { type: "array" });

  const sheetName =
    wb.SheetNames.find((n) => n.includes("GA") || n.includes("접속")) ?? wb.SheetNames[0] ?? null;
  if (!sheetName) {
    return { rows: [], warnings: ["워크북에 시트가 없습니다."], sheetUsed: null };
  }
  const ws = wb.Sheets[sheetName];
  const grid: Grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  // 1) 월별접속자(GA 로그인) - '년월' 라벨 대신 YYYY-MM 패턴 자체를 스캔
  const gaLogin: Record<string, number | null> = {};
  const yearMonthRe = /^\d{4}-\d{2}$/;
  for (const row of grid) {
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (typeof v === "string" && yearMonthRe.test(v.trim())) {
        gaLogin[v.trim()] = toNum(row[c + 1]);
      }
    }
  }
  if (Object.keys(gaLogin).length === 0) {
    warnings.push("GA 접속자(YYYY-MM 패턴) 데이터를 찾지 못했습니다.");
  }

  // 2) 4개의 누적표(터치발송량 / 발송Agt수 / 수신고객 / 고객응모)
  const touch = parseStackedTable(grid, "터치거리발송량", ["합계", "이벤트", "뉴스레터", "터치콘텐츠"], warnings);
  const agent = parseStackedTable(grid, "발송GAAgt", ["합계", "이벤트", "뉴스레터", "터치콘텐츠"], warnings);
  const reach = parseStackedTable(grid, "수신고객", ["합계", "이벤트", "뉴스레터", "터치콘텐츠"], warnings);
  const apply = parseStackedTable(grid, "고객응모데이터", ["합계", "계약고객", "잠재고객"], warnings);

  // 월 목록 통합: GA접속 + 4개 표에서 나온 모든 (연도 추정 불가한 월 번호는 apply 등 표 기준 연도 사용)
  // 표들은 '연도' 정보가 헤더 위쪽 행에 있으므로, GA접속에서 얻은 연-월 키를 기준으로 월 번호만 매칭한다.
  const monthKeys = Object.keys(gaLogin).sort();
  const rows: ParsedMonthRow[] = monthKeys.map((ym) => {
    const monthNum = Number(ym.slice(5, 7));
    const pick = (parsed: ReturnType<typeof parseStackedTable>, label: string) =>
      parsed ? parsed.series[label]?.[monthNum] ?? null : null;
    return {
      year_month: ym,
      ga_login_count: gaLogin[ym] ?? null,
      touch_send_total: pick(touch, "합계"),
      touch_send_event: pick(touch, "이벤트"),
      touch_send_newsletter: pick(touch, "뉴스레터"),
      touch_send_content: pick(touch, "터치콘텐츠"),
      send_agent_unique_total: pick(agent, "합계"),
      send_agent_unique_event: pick(agent, "이벤트"),
      recv_customer_unique_total: pick(reach, "합계"),
      recv_customer_unique_event: pick(reach, "이벤트"),
      apply_total: pick(apply, "합계"),
      apply_contract_customer: pick(apply, "계약고객"),
      apply_prospect_customer: pick(apply, "잠재고객"),
    };
  });

  return { rows, warnings, sheetUsed: sheetName };
}
