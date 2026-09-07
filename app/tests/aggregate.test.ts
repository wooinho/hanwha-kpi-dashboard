import { describe, it, expect } from "vitest";
import { sumNum } from "@/lib/aggregate";
import { NA } from "@/lib/types";

describe("sumNum - 원본 미기재 값을 0으로 왜곡하지 않는 합계", () => {
  it("숫자만 있으면 정상 합산", () => {
    expect(sumNum([10, 20, 30])).toBe(60);
  });

  it("N/A가 섞여 있으면 숫자만 합산한다(N/A를 0으로 취급하지 않되, 무시하고 합산)", () => {
    expect(sumNum([10, NA, 20])).toBe(30);
  });

  it("전부 N/A면 합계도 N/A (0이 아님)", () => {
    expect(sumNum([NA, NA, NA])).toBe(NA);
  });

  it("빈 배열도 N/A", () => {
    expect(sumNum([])).toBe(NA);
  });
});
