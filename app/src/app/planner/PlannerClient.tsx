"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lib/types";
import { uniqueSorted } from "@/lib/filters";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buildPlan, historicalEventsFor } from "@/lib/planner";
import Link from "next/link";

export function PlannerClient({ data }: { data: Dataset }) {
  const categories = useMemo(() => uniqueSorted(data.events.map((e) => e.event_category)), [data]);
  const [category, setCategory] = useState(categories[0]);
  const [target, setTarget] = useState("확인 필요");
  const [budget, setBudget] = useState("");
  const [winners, setWinners] = useState("");
  const [minReward, setMinReward] = useState("");
  const [instantReward, setInstantReward] = useState(false);
  const [shareStructure, setShareStructure] = useState(false);

  const historical = useMemo(() => historicalEventsFor(data, category), [data, category]);
  const plans = useMemo(() => buildPlan(category), [category]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">다음 달 이벤트 플래너</h1>
        <p className="text-sm text-gray-500">
          예측 모델이 아닙니다. 과거 관찰 사실과 근거 수준을 그대로 보여주고, 예상 참여자 수 같은 임의 수치는 만들지 않습니다.
        </p>
      </div>

      <Card>
        <CardTitle>조건 선택</CardTitle>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="이벤트 유형">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="타깃">
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {["FP/Agt.", "고객", "설계지원팀장", "GA Agt.", "확인 필요"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="총 경품 예산(원)">
            <input className="input" placeholder="예: 40000000" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label="예상 당첨 인원">
            <input className="input" placeholder="예: 20000" value={winners} onChange={(e) => setWinners(e.target.value)} />
          </Field>
          <Field label="최소 경품 단가(원)">
            <input className="input" placeholder="예: 1000" value={minReward} onChange={(e) => setMinReward(e.target.value)} />
          </Field>
          <Field label="즉시 보상 여부">
            <select className="input" value={String(instantReward)} onChange={(e) => setInstantReward(e.target.value === "true")}>
              <option value="false">아니오(추첨형)</option>
              <option value="true">예(즉석 당첨)</option>
            </select>
          </Field>
          <Field label="공유 구조 여부">
            <select className="input" value={String(shareStructure)} onChange={(e) => setShareStructure(e.target.value === "true")}>
              <option value="false">없음</option>
              <option value="true">있음</option>
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          입력한 예산·인원·단가는 대안 비교 참고용 메모일 뿐, 이를 근거로 성과를 예측하지 않습니다 (예측 모델 미탑재).
        </p>
      </Card>

      <Card>
        <CardTitle>과거 유사 이벤트 ({category})</CardTitle>
        {historical.length === 0 ? (
          <p className="text-sm text-gray-400">이 카테고리의 과거 이벤트가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {historical.map((e) => (
              <li key={e.event_id} className="flex items-center justify-between">
                <Link href={`/detail/${e.event_id}`} className="text-gray-700 hover:text-[var(--accent)] hover:underline">
                  {e.event_month} · {e.event_name} ({e.data_status})
                </Link>
                <span className="text-xs text-gray-400">{e.data_quality_status.slice(0, 24)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.label} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="mb-0">{p.label}</CardTitle>
              <Badge tone={p.evidenceQuality === "근거 있음" ? "info" : "danger"}>{p.evidenceQuality}</Badge>
            </div>
            <PlanField label="목표" value={p.goal} />
            <PlanField label="타깃" value={p.target} />
            <PlanField label="이벤트 장치" value={p.mechanic} />
            <PlanField label="혜택 구조" value={p.benefitStructure} />
            <PlanField label="예산 배분 방향" value={p.budgetDirection} />
            <PlanField label="기대 행동" value={p.expectedBehavior} />
            <PlanField label="과거 근거" value={p.pastEvidence} />
            <PlanField label="리스크" value={p.risk} />
            <PlanField label="검증 KPI" value={p.verificationKpi} />
            <PlanField label="필요 추가 데이터" value={p.neededData} />
          </Card>
        ))}
      </div>

      <style jsx>{`
        .input {
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      {label}
      {children}
    </label>
  );
}

function PlanField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="font-medium text-gray-500">{label}: </span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}
