"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import type { Dataset } from "@/lib/types";
import { DEFAULT_FILTERS, filterEvents, uniqueSorted } from "@/lib/filters";
import { FilterBar } from "@/components/FilterBar";
import { Card, CardTitle } from "@/components/ui/Card";
import { DataStatusBadge, Badge, EvidenceBadge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/KpiCard";
import { KpiAchievementCard } from "@/components/KpiAchievementCard";
import { buildMatrixRows, type MatrixRow } from "@/lib/matrix";
import { computeOverviewMetrics } from "@/lib/aggregate";
import { computeKpiAchievements } from "@/lib/kpiAchievement";
import { fmtKrw, fmtNumber, fmtPercent, isNum } from "@/lib/calc";
import { NA } from "@/lib/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const columnHelper = createColumnHelper<MatrixRow>();

/**
 * 목표 KPI에 이벤트가 어떤 기여를 했는지 분석하는 단일 화면.
 * (기존 6탭 구조가 "분석하기에 너무 복잡하다"는 피드백에 따라, 이벤트→혜택→참여 성과→기여/저해 요인을
 *  한 화면에서 바로 볼 수 있도록 통합함. 트렌드/플래너/데이터품질 탭은 인덱스에서 제외.)
 */
export function ContributionClient({ data }: { data: Dataset }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  // 기본 정렬: 근거 등급(A→D→없음) 오름차순 - "인사이트를 찾기 어렵다"는 피드백에 따라
  // 근거 있는(=KPI 달성에 실제로 영향을 준 것으로 확인된) 이벤트가 표 맨 위로 오게 함.
  const [sorting, setSorting] = useState<SortingState>([{ id: "bestEvidence", desc: false }]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [onlyEvidenced, setOnlyEvidenced] = useState(true);

  const achievements = useMemo(() => computeKpiAchievements(data), [data]);

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

  const filteredEvents = useMemo(() => filterEvents(data.events, data.benefits, filters), [data, filters]);
  const filteredIds = useMemo(() => new Set(filteredEvents.map((e) => e.event_id)), [filteredEvents]);

  const allRows = useMemo(() => buildMatrixRows(data), [data]);
  const rows = useMemo(() => {
    const base = allRows.filter((r) => filteredIds.has(r.event.event_id));
    return onlyEvidenced ? base.filter((r) => r.bestEvidence !== "없음" && r.bestEvidence !== "D") : base;
  }, [allRows, filteredIds, onlyEvidenced]);
  const hiddenCount = useMemo(
    () => allRows.filter((r) => filteredIds.has(r.event.event_id)).length - rows.length,
    [allRows, filteredIds, rows]
  );

  const metrics = useMemo(
    () => computeOverviewMetrics(filteredEvents, data.performance, data.benefits),
    [filteredEvents, data]
  );

  const chartData = useMemo(
    () =>
      rows
        .filter((r) => isNum(r.participantCount) && isNum(r.totalBudget))
        .map((r) => ({
          x: isNum(r.participationRate) ? r.participationRate : 0,
          y: r.participantCount as number,
          z: r.totalBudget as number,
          name: r.event.event_name,
        })),
    [rows]
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "expander",
        header: "",
        cell: ({ row }) => {
          const id = row.original.event.event_id;
          const open = expanded.has(id);
          return (
            <button
              onClick={() => toggle(id)}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100"
              aria-label="기여 요인 펼치기"
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          );
        },
      }),
      columnHelper.accessor((r) => r.event.event_name, {
        id: "name",
        header: "이벤트명 / 회차",
        cell: (info) => (
          <button onClick={() => toggle(info.row.original.event.event_id)} className="text-left font-medium text-gray-900 hover:text-[var(--accent)]">
            {info.getValue()}
            <span className="ml-1 text-xs text-gray-400">({info.row.original.event.event_month})</span>
          </button>
        ),
      }),
      columnHelper.accessor((r) => r.event.data_status, {
        id: "status",
        header: "구분",
        cell: (info) => <DataStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("target", { header: "타깃" }),
      columnHelper.accessor("participantCount", { header: "참여자 수", cell: (i) => fmtNumber(i.getValue()) }),
      columnHelper.accessor("participationRate", { header: "참여율", cell: (i) => fmtPercent(i.getValue()) }),
      columnHelper.accessor("totalBudget", { header: "총 예산", cell: (i) => fmtKrw(i.getValue()) }),
      columnHelper.accessor("totalWinners", { header: "당첨 인원", cell: (i) => fmtNumber(i.getValue()) }),
      columnHelper.accessor("changeRate", { header: "전회차 증감률", cell: (i) => fmtPercent(i.getValue()) }),
      columnHelper.accessor("bestEvidence", {
        header: "근거 등급",
        cell: (i) => {
          const v = i.getValue();
          return v === "없음" ? <Badge tone="danger">근거 부족</Badge> : <Badge tone={v === "A" || v === "B" ? "info" : "neutral"}>{v}</Badge>;
        },
      }),
    ],
    [expanded]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">이벤트별 KPI 기여 분석</h1>
        <p className="text-sm text-gray-500">
          목표 KPI 대비 달성 현황과, 그 수치에 영향을 미친 이벤트 내역을 한 화면에서 봅니다. 값이 없는
          항목은 0이 아니라 <Badge tone="neutral">N/A</Badge>로 표시됩니다.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700">① 목표 KPI 대비 달성 현황 (전사 집계, 2026년)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {achievements.map((item) => (
            <KpiAchievementCard key={item.metric} item={item} />
          ))}
        </div>
        <p className="text-xs text-gray-400">
          목표치는 [고객터치 시스템] 월별 주요지표 .xlsx 시트 제목에 직접 기재된 값입니다(evidence A). 이
          집계는 이벤트·뉴스레터·터치콘텐츠 등 전체 채널을 합산한 전사 수치라, 아래 이벤트 내역과 1:1로
          대응하지 않을 수 있습니다.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-gray-700">② 이벤트 운영 요약 (아래 필터 적용됨)</h2>
        <FilterBar filters={filters} onChange={setFilters} options={options} showBenefitType />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="운영 프로모션 수" value={`${filteredEvents.length}건`} />
          <KpiCard
            label="확인 가능한 참여자 수"
            value={fmtNumber(metrics.participantCount)}
            isDataMissing={metrics.participantCount === NA}
          />
          <KpiCard
            label="총 경품 예산"
            value={metrics.totalBudget === NA ? NA : fmtKrw(metrics.totalBudget)}
            isDataMissing={metrics.totalBudget === NA}
          />
          <KpiCard label="정량 데이터 확보율" value={fmtPercent(metrics.quantitativeCoverageRate)} sub={metrics.quantitativeCoverageLabel} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-700">③ 달성 수치에 영향을 미친 이벤트 내역</h2>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={onlyEvidenced}
              onChange={(e) => setOnlyEvidenced(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            근거(A·B·C) 있는 이벤트만 보기
            {onlyEvidenced && hiddenCount > 0 && (
              <span className="text-gray-400">— 근거 부족 {hiddenCount}건 숨김</span>
            )}
          </label>
        </div>

        <Card>
          <CardTitle>참여 조건 대비 참여 성과 (버블 크기 = 경품 예산)</CardTitle>
          {chartData.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
              <span>비교에 필요한 데이터가 부족합니다.</span>
              <span className="text-xs">원본 보고서에 이벤트별 참여율·참여자 수가 함께 기재된 사례가 없어 산점도를 생성할 수 없습니다.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid stroke="#eee" />
                <XAxis dataKey="x" name="참여율" unit="%" tick={{ fontSize: 12 }} />
                <YAxis dataKey="y" name="참여자 수" tick={{ fontSize: 12 }} />
                <ZAxis dataKey="z" range={[60, 400]} name="경품 예산" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={chartData} fill="var(--accent)" />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Card>

      <Card className="p-0">
        <div className="scroll-x">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer whitespace-nowrap px-3 py-2 select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const eventId = row.original.event.event_id;
                const open = expanded.has(eventId);
                return (
                  <Fragment key={row.id}>
                    <tr className="border-t border-[var(--border)] hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="border-t border-[var(--border)] bg-gray-50/60">
                        <td colSpan={row.getVisibleCells().length} className="px-3 py-3">
                          <ContributionDetail eventId={eventId} data={data} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      </section>
    </div>
  );
}

function ContributionDetail({ eventId, data }: { eventId: string; data: Dataset }) {
  const perf = data.performance.filter((p) => p.event_id === eventId);
  const insights = data.insights.filter((i) => i.event_id === eventId);

  const quant = perf.filter((p) => p.evidence_type === "A" || p.evidence_type === "B");
  const contributing = perf.filter(
    (p) => p.evidence_type === "C" && (p.review_kind === "result_qualitative" || p.review_kind === "observation")
  );
  const hindering = perf.filter((p) => p.evidence_type === "C" && p.review_kind === "improve");

  return (
    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <EvidenceBadge type="A" /> 근거 있는 성과
        </p>
        {quant.length === 0 ? (
          <p className="text-xs text-gray-400">원본에 확인되는 정량 성과가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-xs text-gray-700">
            {quant.map((p) => (
              <li key={p.performance_id}>{p.qualitative_result}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-emerald-700">기여했을 가능성이 있는 요인</p>
        {contributing.length === 0 ? (
          <p className="text-xs text-gray-400">해당 관찰 내용이 없습니다.</p>
        ) : (
          <ul className="list-disc pl-4 text-xs text-gray-700">
            {contributing.map((p) => (
              <li key={p.performance_id}>{p.qualitative_result}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold text-amber-700">저해 가능 요인 / 검증 필요 가설</p>
        {hindering.length === 0 && insights.length === 0 ? (
          <p className="text-xs text-gray-400">해당 내용이 없습니다.</p>
        ) : (
          <ul className="list-disc pl-4 text-xs text-gray-700">
            {hindering.map((p) => (
              <li key={p.performance_id}>{p.qualitative_result}</li>
            ))}
            {insights.map((i) => (
              <li key={i.insight_id}>
                가설: {i.next_month_hypothesis}
                <span className="block text-gray-400">한계: {i.limitation}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
