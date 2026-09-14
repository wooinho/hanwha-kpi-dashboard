"use client";

import { useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Dataset } from "@/lib/types";
import { listAvailableMonths, buildMonthlyCampaignInsight } from "@/lib/monthlyCampaignInsight";
import { isNum } from "@/lib/calc";
import Link from "next/link";
import { CalendarSearch } from "lucide-react";

function fmtVal(v: number | "N/A"): string {
  return v === "N/A" ? "N/A" : v.toLocaleString("ko-KR");
}

function pctBadgeTone(pct: number | null): "success" | "warning" | "danger" | "neutral" {
  if (pct === null) return "neutral";
  if (pct >= 100) return "success";
  if (pct >= 70) return "warning";
  return "danger";
}

/**
 * 대시보드 상단 - "이 달 운영한 캠페인이 목표 KPI에 어떤 기여를 했는가 + 다음 캠페인 기획 인사이트"를
 * 월별 드롭다운으로 바로 확인하는 배너. 대시보드의 핵심 목적(월별 캠페인 KPI 기여 파악 + 다음 캠페인
 * 인사이트 발견)을 진입 즉시 보여주기 위한 요약 영역이며, 상세 내역은 아래 ①~⑤ 섹션에서 확인한다.
 */
export function MonthlyInsightBanner({ data }: { data: Dataset }) {
  const months = useMemo(() => listAvailableMonths(data), [data]);
  const [month, setMonth] = useState(months[months.length - 1] ?? "");
  const insight = useMemo(() => (month ? buildMonthlyCampaignInsight(data, month) : null), [data, month]);

  if (!insight) return null;

  return (
    <Card className="border-2 border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent-weak)] to-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="mb-0 flex items-center gap-1.5 text-base">
          <CalendarSearch size={17} /> 이 달 캠페인 KPI 기여 인사이트
        </CardTitle>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          조회 월
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm font-medium"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {insight.reportStatus === "보고서 누락" && (
        <Badge tone="danger" className="mt-2">
          이 달은 운영 리뷰 보고서 누락(파일 오류) - 참고 시 유의
        </Badge>
      )}

      <p className="mt-3 text-sm font-medium text-gray-800">{insight.summary}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {insight.kpiSnapshot.map((k) => (
          <div key={k.metric} className="rounded-md border border-[var(--border)] bg-white/70 px-2 py-1.5">
            <p className="text-[11px] text-gray-500">{k.label}</p>
            <p className="text-sm font-bold text-gray-900">
              {fmtVal(k.value)}
              <span className="ml-0.5 text-[10px] font-normal text-gray-400">{k.unit}</span>
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <Badge tone={pctBadgeTone(k.vsTargetPct)}>
                {k.vsTargetPct === null ? "N/A" : `목표대비 ${k.vsTargetPct.toFixed(0)}%`}
              </Badge>
              {k.momChangePct !== null && (
                <span className={`text-[10px] ${k.momChangePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  전월대비 {k.momChangePct >= 0 ? "+" : ""}
                  {k.momChangePct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold text-gray-600">이 달 운영/기획된 캠페인 ({insight.campaigns.length}건)</p>
        {insight.campaigns.length === 0 ? (
          <p className="text-xs text-gray-400">해당 월에 등록된 캠페인이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {insight.campaigns.map((c) => (
              <Link key={c.eventId} href={`/detail/${c.eventId}`}>
                <Badge tone={c.evidence === "A" || c.evidence === "B" ? "info" : c.evidence === "C" ? "neutral" : "danger"}>
                  {c.eventName}
                  {isNum(c.participantCount) ? ` · ${c.participantCount.toLocaleString("ko-KR")}명` : ""} ({c.evidence})
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-md border-l-2 border-emerald-400 bg-emerald-50/50 px-2 py-1.5">
          <p className="mb-1 text-xs font-semibold text-emerald-700">기여했을 가능성이 있는 요인</p>
          {insight.contributingHighlights.length === 0 ? (
            <p className="text-xs text-gray-400">관련 관찰 내용이 없습니다.</p>
          ) : (
            <ul className="list-disc pl-4 text-xs text-gray-700">
              {insight.contributingHighlights.slice(0, 3).map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{h.eventName}</span>: {h.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-md border-l-2 border-red-300 bg-red-50/40 px-2 py-1.5">
          <p className="mb-1 text-xs font-semibold text-red-600">개선이 필요한 요인</p>
          {insight.concerns.length === 0 ? (
            <p className="text-xs text-gray-400">관련 개선 제안이 없습니다.</p>
          ) : (
            <ul className="list-disc pl-4 text-xs text-gray-700">
              {insight.concerns.slice(0, 3).map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{h.eventName}</span>: {h.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-md border-l-2 border-amber-400 bg-amber-50/50 px-2 py-1.5">
        <p className="mb-1 text-xs font-semibold text-amber-700">다음 캠페인 기획을 위한 인사이트 (가설, 검증 필요)</p>
        <ul className="list-disc pl-4 text-xs text-gray-700">
          {insight.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
