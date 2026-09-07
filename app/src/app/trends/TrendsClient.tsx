"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buildMonthlyEventAgg, buildCategorySeries } from "@/lib/trends";
import { fmtKrw } from "@/lib/calc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

const CATEGORIES = ["골든위크", "터치어워즈", "11시 콘서트", "설계지원팀장", "원시트·소식지", "영업부스트 패키지", "지방문화혜택"];

export function TrendsClient({ data }: { data: Dataset }) {
  const [category, setCategory] = useState(CATEGORIES[0]);

  const monthAgg = useMemo(() => buildMonthlyEventAgg(data), [data]);
  const monthlyKpi = useMemo(
    () => [...data.monthlyKpi].sort((a, b) => a.year_month.localeCompare(b.year_month)),
    [data]
  );
  const categorySeries = useMemo(() => buildCategorySeries(data, category), [data, category]);

  const kpiChartData = monthlyKpi.map((m) => ({
    month: m.year_month,
    GA접속자: m.report_status === "정상" || m.ga_login_count !== "N/A" ? (typeof m.ga_login_count === "number" ? m.ga_login_count : null) : null,
    터치발송: typeof m.touch_send_total === "number" ? m.touch_send_total : null,
    고객응모: typeof m.apply_total === "number" ? m.apply_total : null,
    missing: m.report_status === "보고서 누락",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">월별·회차별 트렌드</h1>
        <p className="text-sm text-gray-500">
          2026-06은 <Badge tone="danger">보고서 누락</Badge> — 운영 리뷰 pptx는 없지만 xlsx 누적 집계치는 존재하여 점선으로 표시합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>월별 이벤트 수 추이 (event_month 기준)</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthAgg}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="eventCount" name="이벤트 수" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>월별 경품 예산·당첨 인원 추이 (합계 확인된 이벤트만)</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthAgg}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v, name) => (name === "예산" ? fmtKrw(Number(v)) : String(v))}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="totalBudget" name="예산" stroke="#ff6600" connectNulls={false} />
              <Line yAxisId="right" type="monotone" dataKey="totalWinners" name="당첨 인원" stroke="#2563eb" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-400">
            선이 끊긴 구간은 해당 월에 예산/당첨인원 총계가 원본에 기재되지 않았음을 의미합니다(0 아님).
          </p>
        </Card>

        <Card>
          <CardTitle>전사 활동 지표 추이 (GA 접속자·터치발송·고객응모, 이벤트 미귀속)</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={kpiChartData}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceArea x1="2026-06" x2="2026-06" fill="#dc2626" fillOpacity={0.08} />
              <Line type="monotone" dataKey="GA접속자" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="터치발송" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="고객응모" stroke="#ff6600" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-gray-400">
            음영 표시 = 2026-06(보고서 누락 월). 수치 자체는 xlsx 누적 집계에 남아있어 표시하되, 다른 달 대비 낮아 부분 집계 가능성이 있습니다(화면6 참고).
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle className="mb-0">동일 프로그램 회차별 비교</CardTitle>
            <select
              className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {categorySeries.every((c) => c.budget === null && c.winners === null) ? (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
              이 프로그램은 회차별 예산/당첨 인원 총계가 원본에 없어 비교할 수 없습니다.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categorySeries}>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="budget" name="예산" fill="var(--accent)" />
                <Bar dataKey="winners" name="당첨 인원" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
