"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Badge } from "@/components/ui/Badge";

/**
 * CSV/XLSX 업로드 구조 스텁.
 * - 이 MVP는 서버가 없는 로컬 우선 구조이므로, 업로드된 파일은 브라우저에서만 미리보기하고
 *   실제 정제 파이프라인 반영은 scripts/build_data.py 재실행(README 참고)으로 이뤄진다.
 * - 여기서는 "구조 설계"만 시연: CSV를 읽어 헤더/행 수를 검증하고, 다음 단계 안내를 보여준다.
 */
export function UploadStub() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rowCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File) => {
    setFileName(file.name);
    setError(null);
    setPreview(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("현재 브라우저 미리보기는 CSV만 지원합니다. XLSX는 scripts/build_data.py 파이프라인에서 처리하세요.");
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setPreview({ headers: res.meta.fields ?? [], rowCount: res.data.length });
      },
      error: (err) => setError(err.message),
    });
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <input
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="text-xs"
      />
      {fileName && <p className="text-xs text-gray-500">선택한 파일: {fileName}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {preview && (
        <div className="rounded-md border border-[var(--border)] p-3">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone="info">미리보기 성공</Badge>
            <span className="text-xs text-gray-500">{preview.rowCount}행 · {preview.headers.length}열</span>
          </div>
          <p className="text-xs text-gray-500">컬럼: {preview.headers.join(", ")}</p>
        </div>
      )}
      <ol className="list-decimal space-y-1 pl-4 text-xs text-gray-500">
        <li>새 월간 보고서(pptx/xlsx)를 data/raw/ 에 추가</li>
        <li>python scripts/extract_raw_dump.py 로 원문 텍스트/표를 재추출</li>
        <li>scripts/event_log.py 에 새 이벤트를 사람이 검수하여 추가</li>
        <li>python scripts/build_data.py 로 CSV·감사 파일 재생성</li>
        <li>대시보드 새로고침 (파일 기반이라 재배포 불필요)</li>
      </ol>
    </div>
  );
}
