import { loadDataset } from "@/lib/loadData";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, DataStatusBadge, EvidenceBadge } from "@/components/ui/Badge";
import { fmtKrw, fmtNumber } from "@/lib/calc";
import { NA } from "@/lib/types";

// 정적 export(output: 'export')는 서버가 없어 동적 라우트를 빌드 시점에 전부 미리 생성해야 한다.
// events.csv의 모든 event_id에 대해 정적 페이지를 만든다.
export function generateStaticParams() {
  const data = loadDataset();
  return data.events.map((e) => ({ eventId: e.event_id }));
}

export default async function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const data = loadDataset();
  const event = data.events.find((e) => e.event_id === eventId);
  if (!event) notFound();

  const benefits = data.benefits.filter((b) => b.event_id === eventId);
  const perf = data.performance.filter((p) => p.event_id === eventId);
  const insights = data.insights.filter((i) => i.event_id === eventId);

  const quantRows = perf.filter((p) => p.evidence_type === "A" || p.evidence_type === "B");
  const qualRows = perf.filter((p) => p.evidence_type === "C");
  const gapRows = perf.filter((p) => p.evidence_type === "D");

  // 전 회차(동일 카테고리, 다른 월) 비교 대상
  const sameCategory = data.events
    .filter((e) => e.event_category === event.event_category && e.event_id !== event.event_id)
    .sort((a, b) => a.event_month.localeCompare(b.event_month));

  const contributing = qualRows.filter((p) => p.review_kind === "result_qualitative" || p.review_kind === "observation");
  const hindering = qualRows.filter((p) => p.review_kind === "improve");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/detail" className="text-xs text-gray-400 hover:text-[var(--accent)]">
          ← 이벤트 목록으로
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{event.event_name}</h1>
          <DataStatusBadge status={event.data_status} />
          {event.review_required && <Badge tone="danger">검수 필요</Badge>}
          <Badge tone="neutral">{event.event_category}</Badge>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          보고월 {event.report_month} · 진행월 {event.event_month} · 출처 {event.source_file} ({event.source_page})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>이벤트 개요</CardTitle>
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <Row label="사업 목적" value={event.business_objective} full />
            <Row label="핵심 타깃" value={event.target_primary} />
            <Row label="보조 타깃" value={event.target_secondary} />
            <Row label="유도 행동" value={event.target_behavior} />
            <Row label="참여 조건" value={event.participation_condition} full />
            <Row label="이벤트 장치" value={event.mechanic_type} />
            <Row label="채널" value={event.channel} />
            <Row label="시즌 테마" value={event.seasonal_theme} />
            <Row label="핵심 메시지" value={event.key_message} full />
            <Row label="CTA" value={event.cta} full />
          </dl>
        </Card>

        <Card>
          <CardTitle>혜택 구성</CardTitle>
          {benefits.length === 0 ? (
            <Empty text="원본에 확정된 혜택 구성이 확인되지 않습니다." />
          ) : (
            <ul className="flex flex-col gap-2">
              {benefits.map((b) => (
                <li key={b.benefit_id} className="rounded-md border border-[var(--border)] p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{b.benefit_name}</span>
                    <Badge tone="neutral">{b.benefit_type}</Badge>
                    {b.benefit_tier !== NA && <Badge tone="info">{b.benefit_tier}</Badge>}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 sm:grid-cols-3">
                    <span>단가: {fmtKrw(b.benefit_value)}</span>
                    <span>당첨 인원: {fmtNumber(b.winner_count)}</span>
                    <span>예산: {fmtKrw(b.benefit_budget)}</span>
                    <span>지급 방식: {b.reward_method}</span>
                    <span>희소성: {b.scarcity_type}</span>
                    <span>프리미엄: {b.premium_level}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{b.data_quality_status}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>정량 성과 (근거 A·B)</CardTitle>
          {quantRows.length === 0 ? (
            <Empty text="원본에 기재된 정량 성과 수치가 없습니다." />
          ) : (
            <ul className="flex flex-col gap-2">
              {quantRows.map((p) => (
                <li key={p.performance_id} className="text-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <EvidenceBadge type={p.evidence_type} />
                    <span className="text-xs text-gray-400">{p.confidence_level}</span>
                  </div>
                  <p className="text-gray-800">{p.qualitative_result}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500">전 회차 비교 (동일 카테고리: {event.event_category})</p>
            {sameCategory.length === 0 ? (
              <Empty text="비교 가능한 다른 회차가 없습니다." />
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {sameCategory.map((e) => (
                  <li key={e.event_id}>
                    <Link href={`/detail/${e.event_id}`} className="text-gray-700 hover:text-[var(--accent)] hover:underline">
                      {e.event_month} ({e.data_status}) · {e.data_quality_status}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>보고서 정성 리뷰 (근거 C)</CardTitle>
          {qualRows.length === 0 ? (
            <Empty text="정성 리뷰가 확인되지 않습니다." />
          ) : (
            <ul className="flex flex-col gap-2">
              {qualRows.map((p) => (
                <li key={p.performance_id} className="text-sm text-gray-700">
                  {p.qualitative_result}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardTitle>성과에 기여했을 가능성이 있는 요인 (해석, 인과 아님)</CardTitle>
          {contributing.length === 0 ? (
            <Empty text="해당하는 관찰 내용이 없습니다." />
          ) : (
            <ul className="list-disc pl-4 text-sm text-gray-700">
              {contributing.map((p) => (
                <li key={p.performance_id}>{p.qualitative_result}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="border-l-4 border-l-amber-400">
          <CardTitle>성과 저해 가능 요인 (개선 제안)</CardTitle>
          {hindering.length === 0 ? (
            <Empty text="해당하는 개선 제안이 없습니다." />
          ) : (
            <ul className="list-disc pl-4 text-sm text-gray-700">
              {hindering.map((p) => (
                <li key={p.performance_id}>{p.qualitative_result}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2 border-l-4 border-l-gray-300">
          <CardTitle>검증되지 않은 가설 (근거 D)</CardTitle>
          {insights.length === 0 && gapRows.length === 0 ? (
            <Empty text="가설이 없습니다." />
          ) : (
            <ul className="flex flex-col gap-3 text-sm text-gray-700">
              {insights.map((i) => (
                <li key={i.insight_id}>
                  <p className="font-medium text-gray-900">가설: {i.next_month_hypothesis}</p>
                  <p className="text-xs text-gray-500">한계: {i.limitation}</p>
                  <p className="text-xs text-gray-400">검증 KPI: {i.verification_kpi}</p>
                </li>
              ))}
              {gapRows.map((p) => (
                <li key={p.performance_id} className="text-gray-500">
                  {p.qualitative_result}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-3" : "col-span-3 sm:col-span-1"}>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400">{text}</p>;
}
