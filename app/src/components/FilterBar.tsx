"use client";

import { ALL, type FilterState } from "@/lib/filters";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      {label}
      <select
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-gray-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={ALL}>전체</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  filters,
  onChange,
  options,
  showBenefitType = false,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  options: {
    reportMonths: string[];
    eventMonths: string[];
    categories: string[];
    targets: string[];
    benefitTypes: string[];
    dataStatuses: string[];
  };
  showBenefitType?: boolean;
}) {
  const set = <K extends keyof FilterState>(key: K, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="card flex flex-wrap items-end gap-4 p-4">
      <Select label="보고 월" value={filters.reportMonth} options={options.reportMonths} onChange={(v) => set("reportMonth", v)} />
      <Select label="실제 이벤트 월" value={filters.eventMonth} options={options.eventMonths} onChange={(v) => set("eventMonth", v)} />
      <Select label="이벤트 유형" value={filters.category} options={options.categories} onChange={(v) => set("category", v)} />
      <Select label="타깃" value={filters.target} options={options.targets} onChange={(v) => set("target", v)} />
      {showBenefitType && (
        <Select label="혜택 유형" value={filters.benefitType} options={options.benefitTypes} onChange={(v) => set("benefitType", v)} />
      )}
      <Select label="계획·결과 구분" value={filters.dataStatus} options={options.dataStatuses} onChange={(v) => set("dataStatus", v)} />
      <Select label="데이터 신뢰도" value={filters.confidence} options={["검수완료", "확인 필요"]} onChange={(v) => set("confidence", v)} />
    </div>
  );
}
