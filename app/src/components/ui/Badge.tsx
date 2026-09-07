import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/lib/types";

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "warning" | "danger" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    accent: "bg-[var(--accent-weak)] text-[var(--accent)] border-[var(--accent)]/30",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** 근거 등급 배지. A/B=성과 데이터(파랑 계열), C/D=인사이트·가설(회색 계열) - 시각적으로 명확히 분리. */
export function EvidenceBadge({ type }: { type: EvidenceType }) {
  const map: Record<EvidenceType, { label: string; tone: "info" | "neutral" }> = {
    A: { label: "A · 원본 수치", tone: "info" },
    B: { label: "B · 파생 지표", tone: "info" },
    C: { label: "C · 정성 리뷰", tone: "neutral" },
    D: { label: "D · 분석 가설", tone: "neutral" },
  };
  const m = map[type];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

const STATUS_MAP: Record<string, { label: string; tone: "success" | "warning" | "info" | "danger" }> = {
  plan: { label: "계획", tone: "info" },
  result: { label: "결과", tone: "success" },
  mixed: { label: "혼재", tone: "warning" },
  "확인 필요": { label: "확인 필요", tone: "danger" },
};

export function DataStatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
