import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseMonthlyKpiWorkbook } from "@/lib/parseMonthlyKpiXlsx";

// 실제 원본 파일로 검증 (data/raw/*.xlsx) - 없으면 스킵 (CI 등에서 원본 미포함 가능)
const XLSX_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "raw",
  "[고객터치 시스템] 월별 주요지표 .xlsx"
);

const hasFixture = fs.existsSync(XLSX_PATH);

describe.skipIf(!hasFixture)("parseMonthlyKpiWorkbook (실제 원본 파일 기준 라벨 스캔 검증)", () => {
  const buf = hasFixture ? fs.readFileSync(XLSX_PATH) : Buffer.alloc(0);
  const result = parseMonthlyKpiWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  it("2026-01 ~ 2026-08의 GA 접속자 수를 정확히 읽는다 (build_data.py와 동일 값)", () => {
    const byMonth = Object.fromEntries(result.rows.map((r) => [r.year_month, r.ga_login_count]));
    expect(byMonth["2026-01"]).toBe(8276);
    expect(byMonth["2026-02"]).toBe(9922);
    expect(byMonth["2026-07"]).toBe(9267);
    expect(byMonth["2026-08"]).toBe(8599);
  });

  it("터치발송 합계/이벤트 값을 정확히 읽는다", () => {
    const jul = result.rows.find((r) => r.year_month === "2026-07")!;
    expect(jul.touch_send_total).toBe(11759);
    expect(jul.touch_send_event).toBe(6657);
  });

  it("고객응모 합계/계약/잠재 값을 정확히 읽는다", () => {
    const jul = result.rows.find((r) => r.year_month === "2026-07")!;
    expect(jul.apply_total).toBe(44258);
    expect(jul.apply_contract_customer).toBe(29697);
    expect(jul.apply_prospect_customer).toBe(14561);
  });

  it("수식 오류(#REF!) 등은 숫자로 왜곡하지 않고 null로 남긴다", () => {
    // 2026-09~12는 GA 시트에 #REF! 로 기재되어 있음(있는 경우에만 검사)
    const sep = result.rows.find((r) => r.year_month === "2026-09");
    if (sep) {
      expect(sep.ga_login_count).toBeNull();
    }
  });
});
