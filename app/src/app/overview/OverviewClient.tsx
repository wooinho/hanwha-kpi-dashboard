"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lib/types";
import { DEFAULT_FILTERS, filterEvents, uniqueSorted } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import { KpiCard } from "@/components/KpiCard";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge, EvidenceBadge } from "@/components/ui/Badge";
import { computeOverviewMetrics, latestMonthChangeRate } from "@/lib/aggregate";
import { fmtKrw, fmtNumber, fmtPercent, isNum } from "@/lib/calc";
import { NA } from "@/lib/types";
import Link from "next/link";

export function OverviewClient({ data }: { data: Dataset }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const options = useMemo(
    () => ({
      reportMonths: uniqueSorted(data.events.map((e) => e.report_month)),
      eventMonths: uniqueSorted(data.events.map((e) => e.event_month)),
      categories: uniqueSorted(data.events.map((e) => e.event_category)),
      targets: uniqueSorted(
        data.events.flatMap((e) => [e.target_primary, e.target_secondary]).filter((t) => t !== "데이터 없음")
      ),
      benefitTypes: uniqueSorted(data.benefits.map((b) => b.benefit_type).filter((t) => t !== "합계")),
      dataStatuses: uniqueSorted(data.events.map((e) => e.data_status)),
    }),
    [data]
  );

  const filtered = useMemo(() => filterEvents(data.events, data.benefits, filters), [data, filters]);
  const filteredIds = useMemo(() => new Set(filtered.map((e) => e.event_id)), [filtered]);
  const perf = useMemo(() => data.performance.filter((p) => filteredIds.has(p.event_id)), [data, filteredIds]);

  const metrics = useMemo(
    () => computeOverviewMetrics(filtered, data.performance, data.benefits),
    [filtered, data]
  );

  const touchTrend = useMemo(() => latestMonthChangeRate(data.monthlyKpi, "touch_send_total"), [data]);

  const resultReviews = perf.filter((p) => p.evidence_type === "C" && p.review_kind === "result_qualitative");
  const improveReviews = perf.filter((p) => p.evidence_type === "C" && p.review_kind === "improve");
  const planEvents = filtered.filter((e) => e.data_status === "plan");
  const reviewNeeded = filtered.filter((e) => e.review_required);
  const noEvidence = perf.filter((p) => p.evidence_type === "D" && p.review_kind === "no_evidence");

  const nameOf = (eventId: string) => data.events.find((e) => e.event_id === eventId)?.event_name ?? eventId;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Executive Overview</h1>
        <p className="text-sm text-gray-500">
          광고 매체 지표가 아닌, 이벤트·혜택·참여 행동 중심 KPI입니다. 값이 없는 항목은 0이 아니라{" "}
          <Badge tone="neutral">데이터 없음</Badge>으로 표시됩니다.
        </p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} options={options} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="운영 프로모션 수" value={`${metrics.promotionCount}건`} />
        <KpiCard
          label="확인 가능한 참여자 수"
          value={fmtNumber(metrics.participantCount)}
          isDataMissing={metrics.participantCount === NA}
          sub={metrics.participantCount === NA ? "원본에 참여자 수 미기재" : undefined}
        />
        <KpiCard
          label="미션 달성자 수"
          value={fmtNumber(metrics.missionCompleteCount)}
          isDataMissing={metrics.missionCompleteCount === NA}
          sub={metrics.missionCompleteCount === NA ? "원본에 미기재" : undefined}
        />
        <KpiCard
          label="총 경품 예산"
          value={metrics.totalBudget === NA ? NA : fmtKrw(metrics.totalBudget)}
          isDataMissing={metrics.totalBudget === NA}
          sub="계획 수치 포함 가능"
        />
        <KpiCard
          label="총 당첨 인원"
          value={fmtNumber(metrics.totalWinners)}
          isDataMissing={metrics.totalWinners === NA}
        />
        <KpiCard
          label="정량 데이터 확보율"
          value={fmtPercent(metrics.quantitativeCoverageRate)}
          sub={metrics.quantitativeCoverageLabel}
        />
        <KpiCard
          label="전사 터치발송 전월대비"
          value={isNum(touchTrend.rate) ? fmtPercent(touchTrend.rate) : NA}
          sub={touchTrend.month ? `${touchTrend.month} 기준 (전사 집계, 이벤트 미귀속)` : "데이터 부족"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>이번 달 관찰된 핵심 성과 (정성, 근거 C)</CardTitle>
          {resultReviews.length === 0 ? (
            <EmptyNote text="선택한 조건에서 정성 성과 리뷰가 없습니다." />
          ) : (
            <ul className="flex flex-col gap-3">
              {resultReviews.slice(0, 3).map((p) => (
                <li key={p.performance_id} className="text-sm text-gray-700">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-gray-900">{nameOf(p.event_id)}</span>
                    <EvidenceBadge type={p.evidence_type} />
                  </div>
                  {p.qualitative_result}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>성과와 함께 관찰된 이벤트·혜택 조합 (가설, 근거 D)</CardTitle>
          <InsightMini insights={data.insights.filter((i) => filteredIds.has(i.event_id) || i.event_id === NA)} nameOf={nameOf} />
        </Card>

        <Card>
          <CardTitle>개선이 필요한 항목</CardTitle>
          {improveReviews.length === 0 ? (
            <EmptyNote text="선택한 조건에서 개선 제안 리뷰가 없습니다." />
          ) : (
            <ul className="flex flex-col gap-3">
              {improveReviews.slice(0, 3).map((p) => (
                <li key={p.performance_id} className="text-sm text-gray-700">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-gray-900">{nameOf(p.event_id)}</span>
                    <EvidenceBadge type={p.evidence_type} />
                  </div>
                  {p.qualitative_result}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>다음 달 의사결정 필요 항목 ({planEvents.length}건 계획 / {reviewNeeded.length}건 검수 필요)</CardTitle>
          <ul className="flex flex-col gap-2">
            {planEvents.map((e) => (
              <li key={e.event_id} className="flex items-center justify-between text-sm">
                <Link href={`/detail/${e.event_id}`} className="text-gray-800 hover:text-[var(--accent)] hover:underline">
                  {e.event_month} · {e.event_name}
                </Link>
                <Badge tone="info">계획 확정 필요</Badge>
              </li>
            ))}
            {planEvents.length === 0 && <EmptyNote text="선택한 조건에서 계획(plan) 건이 없습니다." />}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>데이터 부족 경고 ({noEvidence.length + reviewNeeded.length}건)</CardTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">정량·정성 근거가 전혀 없는 이벤트</p>
              <ul className="flex flex-col gap-1 text-sm text-gray-700">
                {noEvidence.map((p) => (
                  <li key={p.performance_id}>
                    <Link href={`/detail/${p.event_id}`} className="hover:text-[var(--accent)] hover:underline">
                      {nameOf(p.event_id)}
                    </Link>
                  </li>
                ))}
                {noEvidence.length === 0 && <li className="text-gray-400">없음</li>}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">사람 검수가 필요한 이벤트(review_required)</p>
              <ul className="flex flex-col gap-1 text-sm text-gray-700">
                {reviewNeeded.slice(0, 8).map((e) => (
                  <li key={e.event_id}>
                    <Link href={`/detail/${e.event_id}`} className="hover:text-[var(--accent)] hover:underline">
                      {e.event_name} ({e.report_month})
                    </Link>
                  </li>
                ))}
              </ul>
              {reviewNeeded.length > 8 && (
                <p className="mt-1 text-xs text-gray-400">외 {reviewNeeded.length - 8}건 더 · 화면6 데이터 품질 관리에서 전체 확인</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-sm text-gray-400">{text}</p>;
}

function InsightMini({
  insights,
  nameOf,
}: {
  insights: Dataset["insights"];
  nameOf: (id: string) => string;
}) {
  if (insights.length === 0) return <EmptyNote text="선택한 조건에서 인사이트가 없습니다." />;
  return (
    <ul className="flex flex-col gap-3">
      {insights.slice(0, 3).map((i) => (
        <li key={i.insight_id} className="text-sm text-gray-700">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium text-gray-900">{i.event_id === NA ? "전사" : nameOf(i.event_id)}</span>
            <EvidenceBadge type={i.evidence_type} />
          </div>
          <p>{i.fact}</p>
          <p className="mt-1 text-xs text-gray-400">한계: {i.limitation}</p>
        </li>
      ))}
    </ul>
  );
}
