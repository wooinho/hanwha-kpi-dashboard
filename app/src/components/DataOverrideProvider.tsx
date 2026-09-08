"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ParsedMonthRow } from "@/lib/parseMonthlyKpiXlsx";

const STORAGE_KEY = "hanwha-kpi-dashboard:monthlyKpiOverride:v1";

interface OverrideState {
  rows: ParsedMonthRow[] | null;
  sourceFileName: string | null;
  appliedAt: string | null;
}

interface DataOverrideContextValue extends OverrideState {
  apply: (rows: ParsedMonthRow[], fileName: string) => void;
  clear: () => void;
}

const DataOverrideContext = createContext<DataOverrideContextValue | null>(null);

/**
 * 업로드한 엑셀 데이터를 이 브라우저(localStorage)에만 저장해 미리보기로 보여준다.
 * 정적 사이트(GitHub Pages, 서버 없음)라 다른 방문자에게는 반영되지 않는다 - 실제 배포는
 * scripts/build_data.py + publish_to_github.bat 로만 가능(README '엑셀로 업데이트' 참고).
 */
export function DataOverrideProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OverrideState>({ rows: null, sourceFileName: null, appliedAt: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // 프라이빗 모드 등으로 localStorage 접근 불가 - 조용히 무시하고 override 없이 진행
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: OverrideState) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장 실패해도 현재 세션 표시는 계속 동작하게 둠
    }
  }, []);

  const apply = useCallback(
    (rows: ParsedMonthRow[], fileName: string) => {
      persist({ rows, sourceFileName: fileName, appliedAt: new Date().toISOString() });
    },
    [persist]
  );

  const clear = useCallback(() => {
    persist({ rows: null, sourceFileName: null, appliedAt: null });
  }, [persist]);

  // 하이드레이션 전에는 override 없음으로 렌더링(서버-클라이언트 불일치 방지)
  const value: DataOverrideContextValue = hydrated
    ? { ...state, apply, clear }
    : { rows: null, sourceFileName: null, appliedAt: null, apply, clear };

  return <DataOverrideContext.Provider value={value}>{children}</DataOverrideContext.Provider>;
}

export function useDataOverride() {
  const ctx = useContext(DataOverrideContext);
  if (!ctx) throw new Error("useDataOverride는 DataOverrideProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
