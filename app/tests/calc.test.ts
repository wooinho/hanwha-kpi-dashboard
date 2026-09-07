import { describe, it, expect } from "vitest";
import {
  safeDiv,
  participationRate,
  completionRate,
  shareRate,
  avgBenefitCost,
  costPerParticipant,
  costPerCompletion,
  changeRate,
  fmtNumber,
  fmtPercent,
  fmtKrw,
  isNum,
} from "@/lib/calc";
import { NA } from "@/lib/types";

describe("주요 계산식 (프롬프트 7.1절)", () => {
  it("참여율 = 참여자 수 / 방문자 수", () => {
    expect(participationRate(50, 200)).toBeCloseTo(0.25);
  });

  it("미션 달성률 = 달성자 수 / 참여자 수", () => {
    expect(completionRate(30, 50)).toBeCloseTo(0.6);
  });

  it("공유율 = 공유 수 / 참여자 수", () => {
    expect(shareRate(10, 50)).toBeCloseTo(0.2);
  });

  it("평균 혜택 비용 = 총 예산 / 총 당첨 인원", () => {
    expect(avgBenefitCost(38_000_000, 20_000)).toBeCloseTo(1900);
  });

  it("참여자당 비용 = 총 예산 / 참여자 수", () => {
    expect(costPerParticipant(1_000_000, 100)).toBeCloseTo(10_000);
  });

  it("미션 달성자당 비용 = 총 예산 / 미션 달성자 수", () => {
    expect(costPerCompletion(1_000_000, 50)).toBeCloseTo(20_000);
  });

  it("전 회차 증감률 = (현재-비교)/비교 * 100", () => {
    expect(changeRate(120, 100)).toBeCloseTo(20);
    expect(changeRate(80, 100)).toBeCloseTo(-20);
  });

  it("실제 8월 계획 데이터로 계산: 터치어워즈 1인당 평균 비용", () => {
    // 7월 보고서 표: 총 당첨 195명, 총 예산 4,150,000원 (evidence A)
    const cost = avgBenefitCost(4_150_000, 195);
    expect(cost).toBeCloseTo(21282.05, 1);
  });
});

describe("데이터 누락·분모 0 처리 (0으로 왜곡 금지)", () => {
  it("분모가 0이면 N/A (0이나 Infinity가 아님)", () => {
    expect(safeDiv(10, 0)).toBe(NA);
    expect(participationRate(10, 0)).toBe(NA);
    expect(avgBenefitCost(1000, 0)).toBe(NA);
  });

  it("분자 또는 분모가 N/A(원본 미기재)면 계산하지 않고 N/A", () => {
    expect(safeDiv(NA, 10)).toBe(NA);
    expect(safeDiv(10, NA)).toBe(NA);
    expect(participationRate(NA, 100)).toBe(NA);
  });

  it("changeRate: 비교값이 0이거나 N/A면 N/A (0으로 나누지 않음)", () => {
    expect(changeRate(50, 0)).toBe(NA);
    expect(changeRate(50, NA)).toBe(NA);
    expect(changeRate(NA, 50)).toBe(NA);
  });

  it("isNum은 N/A를 숫자로 취급하지 않는다", () => {
    expect(isNum(NA)).toBe(false);
    expect(isNum(0)).toBe(true);
    expect(isNum(42)).toBe(true);
  });

  it("포맷터: N/A는 항상 'N/A' 문자열로 표시되고 0과 구분된다", () => {
    expect(fmtNumber(NA)).toBe("N/A");
    expect(fmtNumber(0)).toBe("0");
    expect(fmtPercent(NA)).toBe("N/A");
    expect(fmtKrw(NA)).toBe("N/A");
  });
});

describe("한국식 원화 단위 포맷", () => {
  it("억 단위", () => {
    expect(fmtKrw(42_000_000)).toBe("4,200만 원");
    expect(fmtKrw(120_000_000)).toBe("1.2억 원");
  });
  it("만원 단위", () => {
    expect(fmtKrw(38_000_000)).toBe("3,800만 원");
  });
  it("천원 미만은 그대로 원 단위", () => {
    expect(fmtKrw(500)).toBe("500원");
  });
});
