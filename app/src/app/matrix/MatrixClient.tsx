"use client";

import { useMemo, useState } from "react";
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
import { DataStatusBadge, Badge } from "@/components/ui/Badge";
import { buildMatrixRows, type MatrixRow } from "@/lib/matrix";
import { fmtKrw, fmtNumber, fmtPercent, isNum } from "@/lib/calc";
import Link from "next/link";
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

export function MatrixClient({ data }: { data: Dataset }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([]);

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
  const rows = useMemo(() => allRows.filter((r) => filteredIds.has(r.event.event_id)), [allRows, filteredIds]);

  const chartData = useMemo(
    () =>
      rows
        .filter((r) => isNum(r.participantCount) && isNum(r.totalBudget))
        .map((r) => ({
          x: isNum(r.participationRate) ? r.participationRate : 0,
          y: r.participantCount as number,
          z: r.totalBudget as number,
          name: r.event.event_name,
          type: r.mainBenefitType,
        })),
    [rows]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor((r) => r.event.event_name, {
        id: "name",
        header: "이벤트명 / 회차",
        cell: (info) => (
          <Link
            href={`/detail/${info.row.original.event.event_id}`}
            className="font-medium text-gray-900 hover:text-[var(--accent)] hover:underline"
          >
            {info.getValue()}
            <span className="ml-1 text-xs text-gray-400">({info.row.original.event.event_month})</span>
          </Link>
        ),
      }),
      columnHelper.accessor((r) => r.event.data_status, {
        id: "status",
        header: "구분",
        cell: (info) => <DataStatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("target", { header: "타깃" }),
      columnHelper.accessor((r) => r.event.participation_condition, {
        id: "condition",
        header: "참여 조건",
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor((r) => r.event.mechanic_type, {
        id: "mechanic",
        header: "이벤트 장치",
        cell: (info) => <span className="text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor("mainBenefitName", { header: "메인 혜택", cell: (i) => <span className="text-xs">{i.getValue()}</span> }),
      columnHelper.accessor("mainBenefitType", { header: "혜택 유형" }),
      columnHelper.accessor("totalBudget", { header: "총 예산", cell: (i) => fmtKrw(i.getValue()) }),
      columnHelper.accessor("totalWinners", { header: "당첨 인원", cell: (i) => fmtNumber(i.getValue()) }),
      columnHelper.accessor("minReward", { header: "최소 보상", cell: (i) => fmtKrw(i.getValue()) }),
      columnHelper.accessor("participantCount", { header: "참여자 수", cell: (i) => fmtNumber(i.getValue()) }),
      columnHelper.accessor("missionCompleteCount", { header: "미션 달성자 수", cell: (i) => fmtNumber(i.getValue()) }),
      columnHelper.accessor("participationRate", { header: "참여율", cell: (i) => fmtPercent(i.getValue()) }),
      columnHelper.accessor("changeRate", { header: "전회차 증감률", cell: (i) => fmtPercent(i.getValue()) }),
      columnHelper.accessor("bestEvidence", {
        header: "근거 등급",
        cell: (i) => {
          const v = i.getValue();
          return v === "없음" ? <Badge tone="danger">근거 부족</Badge> : <Badge tone={v === "A" || v === "B" ? "info" : "neutral"}>{v}</Badge>;
        },
      }),
    ],
    []
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
        <h1 className="text-xl font-bold text-gray-900">이벤트 × 혜택 성과맵</h1>
        <p className="text-sm text-gray-500">값이 없는 셀은 0이 아니라 N/A · 데이터 없음으로 표시됩니다.</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} options={options} showBenefitType />

      <Card>
        <CardTitle>참여 조건 대비 참여 성과 (버블 크기 = 경품 예산)</CardTitle>
        {chartData.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
            <span>비교에 필요한 데이터가 부족합니다.</span>
            <span className="text-xs">
              원본 보고서에 이벤트별 참여율·참여자 수가 함께 기재된 사례가 없어 산점도를 생성할 수 없습니다.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)] hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="whitespace-nowrap px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
