"use client";

import { useRef, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDataOverride } from "@/components/DataOverrideProvider";
import { parseMonthlyKpiWorkbook, type ParsedMonthRow } from "@/lib/parseMonthlyKpiXlsx";
import { mergeMonthlyKpi, toMonthlyKpiCsv } from "@/lib/monthlyKpiOverride";
import { commitCsvToGithub, verifyGithubToken, actionsRunsUrl } from "@/lib/githubCommit";
import type { MonthlyKpiRow } from "@/lib/types";
import { UploadCloud, RotateCcw, Download, ChevronDown, ChevronUp, ShieldCheck, ExternalLink } from "lucide-react";

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

  const [showDeploy, setShowDeploy] = useState(false);
  const [token, setToken] = useState("");
  const [deploy, setDeploy] = useState<
    | { state: "idle" }
    | { state: "busy"; message: string }
    | { state: "done"; commitUrl: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

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

  const deployToEveryone = async () => {
    if (!parsed && !appliedRows) return;
    if (!token.trim()) {
      setDeploy({ state: "error", message: "GitHub 토큰을 입력해주세요." });
      return;
    }
    setDeploy({ state: "busy", message: "토큰 확인 중..." });
    try {
      const check = await verifyGithubToken(token.trim());
      if (!check.ok) {
        setDeploy({ state: "error", message: check.message });
        return;
      }
      setDeploy({ state: "busy", message: "data/processed/monthly_kpi.csv 커밋 중..." });
      const merged = mergeMonthlyKpi(baseMonthlyKpi, parsed?.rows ?? appliedRows);
      const csv = toMonthlyKpiCsv(merged);
      const fileLabel = parsed?.fileName ?? sourceFileName ?? "업로드 파일";
      const result = await commitCsvToGithub(
        "data/processed/monthly_kpi.csv",
        csv,
        `엑셀 업로드로 monthly_kpi.csv 갱신 (${fileLabel})`,
        token.trim()
      );
      setDeploy({ state: "done", commitUrl: result.commitUrl });
    } catch (e) {
      setDeploy({ state: "error", message: e instanceof Error ? e.message : String(e) });
    }
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
        브라우저에서 바로 미리볼 수 있습니다. 업로드만으로는 <b>내 브라우저에만</b> 반영되고 다른 방문자에게는
        보이지 않습니다(정적 사이트라 서버가 없음). <b>이 링크를 가진 모든 사람에게 반영</b>하려면 아래 노란
        영역의 &quot;관리자: 실제로 반영하기&quot;(GitHub 토큰 필요)를 쓰거나, &quot;CSV로 내보내기&quot;로 받은
        파일을 <code>data/processed/monthly_kpi.csv</code>에 덮어쓰고 <code>publish_to_github.bat</code>을
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

      {(parsed || appliedRows) && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <button
            onClick={() => setShowDeploy((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"
          >
            <ShieldCheck size={14} />
            관리자: 이 링크를 가진 모든 사람에게 실제로 반영하기
            {showDeploy ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showDeploy && (
            <div className="mt-2 flex flex-col gap-2 text-xs text-gray-700">
              <p>
                아래에 <b>GitHub 개인용 액세스 토큰(Fine-grained)</b>을 입력하면, 이 브라우저에서
                <code> data/processed/monthly_kpi.csv</code>를 저장소에 직접 커밋합니다. 커밋되면
                GitHub Actions가 자동으로 사이트를 다시 빌드해 약 1~2분 뒤{" "}
                <b>https://wooinho.github.io/hanwha-kpi-dashboard/ 링크를 가진 모든 사람</b>에게
                반영됩니다.
              </p>
              <ul className="list-disc pl-4 text-gray-500">
                <li>토큰 만드는 법: GitHub → Settings → Developer settings → Fine-grained tokens →
                  Repository access를 <code>wooinho/hanwha-kpi-dashboard</code> 저장소 하나로만 제한 →
                  Permissions에서 <code>Contents: Read and write</code>만 부여</li>
                <li>이 토큰은 저장소에 쓸 수 있는 비밀번호와 같습니다. 신뢰하는 사람과만 공유하고,
                  이 페이지는 토큰을 저장하지 않습니다(새로고침하면 다시 입력해야 함).</li>
              </ul>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  placeholder="github_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs"
                  autoComplete="off"
                />
                <button
                  onClick={deployToEveryone}
                  disabled={deploy.state === "busy"}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deploy.state === "busy" ? "처리 중..." : "모두에게 반영하기"}
                </button>
              </div>
              {deploy.state === "busy" && <p className="text-gray-500">{deploy.message}</p>}
              {deploy.state === "error" && <p className="text-red-600">오류: {deploy.message}</p>}
              {deploy.state === "done" && (
                <p className="flex flex-wrap items-center gap-2 text-emerald-700">
                  커밋 완료! Actions 빌드가 끝나면 자동 반영됩니다.
                  <a href={deploy.commitUrl} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 underline">
                    커밋 보기 <ExternalLink size={11} />
                  </a>
                  <a href={actionsRunsUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 underline">
                    빌드 진행 상황 <ExternalLink size={11} />
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
