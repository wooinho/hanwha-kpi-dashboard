import type { Dataset, EventRow } from "./types";
import { NA } from "./types";
import { isNum, type Num } from "./calc";
import { sumNum } from "./aggregate";

export interface MatrixRow {
  event: EventRow;
  target: string;
  mainBenefitName: string;
  mainBenefitType: string;
  totalBudget: Num;
  totalWinners: Num;
  minReward: Num;
  participantCount: Num;
  missionCompleteCount: Num;
  participationRate: Num;
  changeRate: Num;
  bestEvidence: "A" | "B" | "C" | "D" | "없음";
}

const EVIDENCE_RANK = { A: 0, B: 1, C: 2, D: 3 } as const;

export function buildMatrixRows(data: Dataset): MatrixRow[] {
  return data.events.map((event) => {
    const benefits = data.benefits.filter((b) => b.event_id === event.event_id);
    const perf = data.performance.filter((p) => p.event_id === event.event_id);

    const mainBenefit =
      benefits.find((b) => b.benefit_tier === "main") ?? benefits.find((b) => b.benefit_type !== "합계");
    const totalRow = benefits.find((b) => b.benefit_type === "합계");

    const totalBudget = totalRow ? totalRow.benefit_budget : sumNum(benefits.map((b) => b.benefit_budget));
    const totalWinners = totalRow ? totalRow.winner_count : sumNum(benefits.map((b) => b.winner_count));

    const minRewardCandidates = benefits.map((b) => b.minimum_reward_value).filter(isNum);
    const minReward: Num = minRewardCandidates.length > 0 ? Math.min(...minRewardCandidates) : NA;

    const participantCount = sumNum(perf.map((p) => p.participant_count));
    const missionCompleteCount = sumNum(perf.map((p) => p.mission_complete_count));
    const participationRateVals = perf.map((p) => p.participation_rate).filter(isNum);
    const participationRate: Num = participationRateVals.length > 0 ? participationRateVals[0] : NA;
    const changeRateVals = perf.map((p) => p.change_rate).filter(isNum);
    const changeRateVal: Num = changeRateVals.length > 0 ? changeRateVals[0] : NA;

    let bestEvidence: MatrixRow["bestEvidence"] = "없음";
    for (const p of perf) {
      if (bestEvidence === "없음" || EVIDENCE_RANK[p.evidence_type] < EVIDENCE_RANK[bestEvidence]) {
        bestEvidence = p.evidence_type;
      }
    }

    return {
      event,
      target: [event.target_primary, event.target_secondary].filter((t) => t !== "데이터 없음").join(" / ") || "데이터 없음",
      mainBenefitName: mainBenefit?.benefit_name ?? "데이터 없음",
      mainBenefitType: mainBenefit?.benefit_type ?? "데이터 없음",
      totalBudget,
      totalWinners,
      minReward,
      participantCount,
      missionCompleteCount,
      participationRate,
      changeRate: changeRateVal,
      bestEvidence,
    };
  });
}
