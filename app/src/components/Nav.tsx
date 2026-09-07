import Link from "next/link";

/**
 * 단순화된 헤더. 기존 6탭 인덱스(Executive Overview/성과맵/트렌드/상세진단/플래너/품질관리)가
 * "분석하기에 너무 복잡하다"는 피드백에 따라, "이벤트가 목표 KPI에 기여한 바 분석" 화면 하나로
 * 통합하고 나머지는 인덱스에서 제외함(라우트 자체는 남아있어 필요시 URL로 직접 접근 가능).
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          <span className="text-sm font-bold text-gray-900">한화생명 고객터치 KPI · 이벤트 기여 분석</span>
        </Link>
      </div>
    </header>
  );
}
