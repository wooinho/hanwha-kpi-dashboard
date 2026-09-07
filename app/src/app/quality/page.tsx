import { loadDataset, loadAudit } from "@/lib/loadData";
import { Card, CardTitle } from "@/components/ui/Card";
import { UploadStub } from "./UploadStub";

export default function QualityPage() {
  const data = loadDataset();
  const audit = loadAudit() as {
    "10_file_reliability": { file: string; report_month: string; reliability: string }[];
    "7_missing_fields": string[];
    "8_unit_or_extraction_errors": string[];
    "9_plan_vs_result_mixed_cases": { file: string; case: string }[];
  };

  const byCategory = new Map<string, { total: number; withEvidence: number }>();
  for (const e of data.events) {
    const rec = byCategory.get(e.event_category) ?? { total: 0, withEvidence: 0 };
    rec.total += 1;
    const hasAB = data.performance.some(
      (p) => p.event_id === e.event_id && (p.evidence_type === "A" || p.evidence_type === "B")
    );
    if (hasAB) rec.withEvidence += 1;
    byCategory.set(e.event_category, rec);
  }

  const reviewNeeded = data.events.filter((e) => e.review_required);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">데이터 품질 관리</h1>
        <p className="text-sm text-gray-500">데이터 감사 결과(data_audit.json)를 기반으로 합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>월별 보고서 수집 현황</CardTitle>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1">파일</th>
                <th className="py-1">보고월</th>
                <th className="py-1">신뢰도</th>
              </tr>
            </thead>
            <tbody>
              {audit["10_file_reliability"].map((f) => (
                <tr key={f.file} className="border-t border-[var(--border)] align-top">
                  <td className="py-1.5 pr-2 text-xs">{f.file}</td>
                  <td className="py-1.5 pr-2 text-xs whitespace-nowrap">{f.report_month}</td>
                  <td className="py-1.5 text-xs text-gray-500">{f.reliability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardTitle>프로모션(카테고리)별 정량 데이터(A/B) 보유율</CardTitle>
          <ul className="flex flex-col gap-2">
            {Array.from(byCategory.entries()).map(([cat, rec]) => {
              const pct = Math.round((rec.withEvidence / rec.total) * 100);
              return (
                <li key={cat} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-gray-700">{cat}</span>
                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-gray-400">
                    {rec.withEvidence}/{rec.total}건 ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardTitle>누락 필드</CardTitle>
          <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700">
            {audit["7_missing_fields"].map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>단위/텍스트 추출 오류</CardTitle>
          <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700">
            {audit["8_unit_or_extraction_errors"].map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>계획·결과 혼재 항목</CardTitle>
          <ul className="flex flex-col gap-2 text-sm">
            {audit["9_plan_vs_result_mixed_cases"].map((c, i) => (
              <li key={i} className="rounded-md border border-[var(--border)] p-2">
                <span className="mr-2 font-medium text-gray-800">{c.file}</span>
                <span className="text-gray-600">{c.case}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>검수 필요 수치/이벤트 ({reviewNeeded.length}건)</CardTitle>
          <div className="scroll-x">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1 pr-2">이벤트</th>
                  <th className="py-1 pr-2">보고월</th>
                  <th className="py-1">신뢰도 메모</th>
                </tr>
              </thead>
              <tbody>
                {reviewNeeded.map((e) => (
                  <tr key={e.event_id} className="border-t border-[var(--border)]">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{e.event_name}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap text-xs text-gray-500">{e.report_month}</td>
                    <td className="py-1.5 text-xs text-gray-500">{e.data_quality_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle>다음 보고서에 추가해야 할 필드</CardTitle>
          <ul className="list-disc space-y-1 pl-4 text-sm text-gray-700">
            <li>이벤트별 방문자 수 / 참여자 수 / 미션 달성자 수 (현재 전 기간 공통 누락)</li>
            <li>이벤트별 공유 수, 반복 참여자 수</li>
            <li>혜택별 실제 지급 완료 인원(계획 대비 실집행)</li>
            <li>지방문화혜택(광주/부산 등) 지역별 미션 달성 인원 - 원본에서 확인 안 됨</li>
            <li>회차 간 비교를 위한 전월/전회차 값 자체(비교 기준 데이터)</li>
          </ul>
        </Card>

        <Card>
          <CardTitle>신규 보고서 업로드 (구조 설계용 스텁)</CardTitle>
          <UploadStub />
        </Card>
      </div>
    </div>
  );
}
