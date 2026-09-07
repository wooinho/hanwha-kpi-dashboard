/**
 * 핵심 KPI 계산식 (프롬프트 7.1절).
 * 원칙: 분모가 없거나 0이면 계산하지 않고 "N/A"를 반환한다. 절대 0을 반환해 왜곡하지 않는다.
 * 모든 함수는 순수 함수 - 대시보드 UI와 테스트(tests/calc.test.ts)에서 동일하게 사용한다.
 */
import { NA } from "./types";

export type Num = number | typeof NA;

export function isNum(v: Num): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 안전한 나눗셈. 분자/분모 중 하나라도 N/A이거나 분모가 0이면 N/A. */
export function safeDiv(numerator: Num, denominator: Num): Num {
  if (!isNum(numerator) || !isNum(denominator)) return NA;
  if (denominator === 0) return NA;
  return numerator / denominator;
}

export function safeRatio(numerator: Num, denominator: Num): Num {
  const r = safeDiv(numerator, denominator);
  return isNum(r) ? r : NA;
}

/** 참여율 = 참여자 수 ÷ 이벤트 방문자 수 */
export function participationRate(participantCount: Num, visitorCount: Num): Num {
  return safeRatio(participantCount, visitorCount);
}

/** 미션 달성률 = 미션 달성자 수 ÷ 참여자 수 */
export function completionRate(missionCompleteCount: Num, participantCount: Num): Num {
  return safeRatio(missionCompleteCount, participantCount);
}

/** 공유율 = 공유 수 ÷ 참여자 수 */
export function shareRate(shareCount: Num, participantCount: Num): Num {
  return safeRatio(shareCount, participantCount);
}

/** 평균 혜택 비용 = 총 경품 예산 ÷ 총 당첨 인원 */
export function avgBenefitCost(totalBudget: Num, totalWinners: Num): Num {
  return safeDiv(totalBudget, totalWinners);
}

/** 참여자당 비용 = 총 경품 예산 ÷ 참여자 수 */
export function costPerParticipant(totalBudget: Num, participantCount: Num): Num {
  return safeDiv(totalBudget, participantCount);
}

/** 미션 달성자 1인당 경품 비용 = 총 경품 예산 ÷ 미션 달성자 수 */
export function costPerCompletion(totalBudget: Num, missionCompleteCount: Num): Num {
  return safeDiv(totalBudget, missionCompleteCount);
}

/** 전 회차 증감률(%) = (현재값 - 비교값) ÷ 비교값 × 100. 비교값이 0/N/A면 N/A. */
export function changeRate(current: Num, previous: Num): Num {
  if (!isNum(current) || !isNum(previous) || previous === 0) return NA;
  return ((current - previous) / previous) * 100;
}

/** 표시용 포맷터: 숫자면 천단위 콤마, N/A면 "N/A" 문자열 그대로. */
export function fmtNumber(v: Num): string {
  return isNum(v) ? v.toLocaleString("ko-KR") : NA;
}

/** 퍼센트 포맷 (소수 1자리) */
export function fmtPercent(v: Num): string {
  return isNum(v) ? `${v.toFixed(1)}%` : NA;
}

/** 원화 한국식 단위 병기: 42,000,000 -> "4,200만 원" */
export function fmtKrw(v: Num): string {
  if (!isNum(v)) return NA;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (abs >= 1_0000_0000) {
    const eok = abs / 1_0000_0000;
    return `${sign}${trimZero(eok)}억 원`;
  }
  if (abs >= 1_0000) {
    const man = abs / 1_0000;
    return `${sign}${trimZero(man)}만 원`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

function trimZero(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}
