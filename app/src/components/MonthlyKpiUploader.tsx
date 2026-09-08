"use client";

import { useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDataOverride } from "@/components/DataOverrideProvider";
import { parseMonthlyKpiWorkbook, type ParsedMonthRow } from "@/lib/parseMonthlyKpiXlsx";
import { mergeMonthlyKpi, toMonthlyKpiCsv } from "@/lib/monthlyKpiOverride";
import type { MonthlyKpiRow } from "@/lib/types";
import { UploadCloud, RotateCcw, Download, ChevronDown, ChevronUp } from "lucide-react";

function fmt(v: number | null): string {
  return v === null ? "N/A" : v.toLocaleString("ko-KR");
}

function rowsDiffer(a: MonthlyKpiRow | undefined, b: ParsedMonthRow): boolean {
  if (!a) return true;
  const eq = (x: number | string, y: number | null) => (y === null ? x === "N/A" : x === y);
  return !(
    eq(a.ga_login_count, b.ga_login_count) &&
    eq(a.touch_send_total, b.touch_send_total) &&
    eq(a.touch_send_event, b.touch_send_event) &&
    eq(a.send_agent_unique_total, b.send_agent_unique_total) &&
    eq(a.apply_total, b.apply_total)
  );
}

export function MonthlyKpiUploader({ baseMonthlyKpi }: { baseMonthlyKpi: MonthlyKpiRow[] }) {
  const { rows: appliedRows, sourceFileName, appliedAt, apply, clear } = useDataOverride();
  const [parsed, setParsed] = useState<{ rows: ParsedMonthRow[]; warnings: string[]; fileName: string } | null>(
    null
  );
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setError(null);
    setParsed(null);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("현재는 .xlsx 파일만 지원합니다 ([고객터치 시스템] 월별 주요지표 .xlsx 형식).");
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const result = parseMonthlyKpiWorkbook(buf);
      if (result.rows.length === 0) {
        setError("이 파일에서 월별 지표를 찾지 못했습니다. 원본 '[고객터치 시스템] 월별 주요지표' 형식이 맞는지 확인해주세요.");
        return;
      }
      setParsed({ rows: result.rows, warnings: result.warnings, fileName: file.name });
      setExpanded(true);
    } catch (e) {
      setError(`파일을 읽는 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const applyPreview = () => {
    if (!parsed) return;
    apply(parsed.rows, parsed.fileName);
  };

  const downloadCsv = () => {
    const merged = mergeMonthlyKpi(baseMonthlyKpi, parsed?.rows ?? appliedRows);
    const csv = toMonthlyKpiCsv(merged);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monthly_kpi.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = parsed?.rows ?? [];
  const baseByMonth = new Map(baseMonthlyKpi.map((r) => [r.year_month, r]));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="mb-0 flex items-center gap-1.5">
          <UploadCloud size={15} /> 엑셀로 업데이트
        </CardTitle>
        {appliedRows && (
          <Badge tone="info">
            미리보기 적용됨: {sourceFileName} ({appliedAt ? new Date(appliedAt).toLocaleString("ko-KR") : ""})
          </Badge>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        새 달의 <b>[고객터치 시스템] 월별 주요지표 .xlsx</b> 파일을 올리면, 위 ① 목표 KPI 달성 현황을 이
        브라우저에서 바로 미리볼 수 있습니다. <b>이 미리보기는 내 브라우저에만 저장되며 실제 배포 사이트에는
        반영되지 않습니다</b>(정적 사이트라 서버가 없음). 모두에게 반영하려면 아래 &quot;CSV로 내보내기&quot;로
        받은 파일을 <code>data/processed/monthly_kpi.csv</code>에 덮어쓰고 <code>publish_to_github.bat</code>을
        실행하세요.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="text-xs"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {parsed && (
          <button
            onClick={applyPreview}
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            미리보기 적용
          </button>
        )}
        {(parsed || appliedRows) && (
          <button
            onClick={downloadCsv}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Download size={13} /> CSV로 내보내기
          </button>
        )}
        {appliedRows && (
          <button
            onClick={() => {
              clear();
              setParsed(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw size={13} /> 미리보기 초기화
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {parsed && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-gray-600"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            읽은 값 미리보기 ({previewRows.length}개월)
          </button>
          {parsed.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-amber-600">
              {parsed.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {expanded && (
            <div className="scroll-x mt-2">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-2 py-1">월</th>
                    <th className="px-2 py-1">상태</th>
                    <th className="px-2 py-1">GA접속</th>
                    <th className="px-2 py-1">터치발송</th>
                    <th className="px-2 py-1">발송Agt</th>
                    <th className="px-2 py-1">고객응모</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => {
                    const base = baseByMonth.get(r.year_month);
                    const isNew = !base;
                    const changed = rowsDiffer(base, r);
                    return (
                      <tr key={r.year_month} className="border-t border-[var(--border)]">
                        <td className="px-2 py-1 font-medium">{r.year_month}</td>
                        <td className="px-2 py-1">
                          {isNew ? (
                            <Badge tone="success">신규</Badge>
                          ) : changed ? (
                            <Badge tone="warning">변경</Badge>
                          ) : (
                            <Badge tone="neutral">동일</Badge>
                          )}
                        </td>
                        <td className="px-2 py-1">{fmt(r.ga_login_count)}</td>
                        <td className="px-2 py-1">{fmt(r.touch_send_total)}</td>
                        <td className="px-2 py-1">{fmt(r.send_agent_unique_total)}</td>
                        <td className="px-2 py-1">{fmt(r.apply_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
