import type { Dataset } from "./types";
import { isNum, type Num } from "./calc";
import { sumNum } from "./aggregate";
import { buildMatrixRows, type MatrixRow } from "./matrix";

export type ContributionLevel = "confirmed" | "observed" | "insufficient";

/** 한국어 주격 조사 은/는 선택 (받침 유무 기준). */
export function eunNeun(word: string): "은" | "는" {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "는"; // 한글 완성형 범위 밖이면 기본값
  const hasBatchim = (code - 0xac00) % 28 !== 0;
  return hasBatchim ? "은" : "는";
}

export interface CampaignInsight {
  category: string;
  roundCount: number;
  evidencedRoundCount: number; // A/B 근거가 있는 회차 수
  qualitativeOnlyRoundCount: number; // C만 있는 회차 수
  noEvidenceRoundCount: number; // D/없음 뿐인 회차 수
  totalParticipants: Num; // A/B 근거 회차만 합산
  totalBudget: Num;
  totalWinners: Num;
  targetBehaviors: string[];
  relatedKpiLabels: string[];
  contributionLevel: ContributionLevel;
  fact: string;
  interpretation: string;
  limitation: string;
  hypothesis: string;
  verificationKpi: string;
  relatedInsightIds: string[];
  topRounds: {
    eventId: string;
    eventName: string;
    eventMonth: string;
    dataStatus: string;
    participantCount: Num;
    evidence: MatrixRow["bestEvidence"];
  }[];
}

const EVIDENCE_RANK = { A: 0, B: 1, C: 2, D: 3, 없음: 4 } as const;

/** 이벤트의 유도 행동(target_behavior) 텍스트를 목표 KPI 라벨과 느슨하게 연결한다.
 *  이벤트 스키마에 KPI를 직접 지정하는 필드가 없어, 실제 관찰된 target_behavior 문구를
 *  키워드로 매칭한다 - 새로운 가정을 만들지 않고 원본에 이미 적힌 문구만 사용. */
export function mapBehaviorsToKpiLabels(behaviors: string[]): string[] {
  const labels = new Set<string>();
  for (const b of behaviors) {
    if (b.includes("응모")) labels.add("연간 고객 응모 수");
    if (b.includes("발송")) labels.add("월별 고객터치 발송량");
    if (b.includes("접속")) labels.add("GA(설계사) 월별 접속자 수");
    if (b.includes("공유")) labels.add("월별 고객터치 발송량 (공유를 통한 간접 확산)");
    if (b.includes("미션")) labels.add("월별 발송 GA Agt. 수(unique)");
  }
  return Array.from(labels);
}

export function buildCampaignInsights(data: Dataset): CampaignInsight[] {
  const rows = buildMatrixRows(data);
  const categories = Array.from(new Set(data.events.map((e) => e.event_category))).sort();

  return categories.map((category) => {
    const catRows = rows.filter((r) => r.event.event_category === category);
    const evidenced = catRows.filter((r) => r.bestEvidence === "A" || r.bestEvidence === "B");
    const qualitativeOnly = catRows.filter((r) => r.bestEvidence === "C");
    const noEvidence = catRows.filter((r) => r.bestEvidence === "D" || r.bestEvidence === "없음");

    const totalParticipants = sumNum(evidenced.map((r) => r.participantCount));
    const totalBudget = sumNum(evidenced.map((r) => r.totalBudget));
    const totalWinners = sumNum(evidenced.map((r) => r.totalWinners));

    const targetBehaviors = Array.from(
      new Set(catRows.map((r) => r.event.target_behavior).filter((b) => b !== "데이터 없음"))
    );
    const relatedKpiLabels = mapBehaviorsToKpiLabels(targetBehaviors);

    const relatedInsightIds = data.insights
      .filter((i) => catRows.some((r) => r.event.event_id === i.event_id))
      .map((i) => i.insight_id);

    const contributionLevel: ContributionLevel =
      evidenced.length > 0 ? "confirmed" : qualitativeOnly.length > 0 ? "observed" : "insufficient";

    const topRounds = [...catRows]
      .sort((a, b) => EVIDENCE_RANK[a.bestEvidence] - EVIDENCE_RANK[b.bestEvidence])
      .slice(0, 5)
      .map((r) => ({
        eventId: r.event.event_id,
        eventName: r.event.event_name,
        eventMonth: r.event.event_month,
        dataStatus: r.event.data_status,
        participantCount: r.participantCount,
        evidence: r.bestEvidence,
      }));

    let fact = `${category}${eunNeun(category)} 총 ${catRows.length}회차 운영/기획됨 (정량 근거 확보 ${evidenced.length}회, 정성 리뷰만 ${qualitativeOnly.length}회, 근거 부족 ${noEvidence.length}회).`;
    if (isNum(totalParticipants) || isNum(totalBudget) || isNum(totalWinners)) {
      const parts: string[] = [];
      if (isNum(totalParticipants)) parts.push(`총 참여자 ${totalParticipants.toLocaleString("ko-KR")}명`);
      if (isNum(totalBudget)) parts.push(`총 예산 ${totalBudget.toLocaleString("ko-KR")}원`);
      if (isNum(totalWinners)) parts.push(`총 당첨 인원 ${totalWinners.toLocaleString("ko-KR")}명`);
      fact += ` (정량 근거 회차 기준) ${parts.join(", ")}.`;
    }

    // 회차 이름표기 - "이벤트명(월, 참여자수)" 형태로, 기존 테이블(③④)의 "이벤트명(월)" 표기 관례를 그대로 씀
    const nameWithCount = (r: MatrixRow) =>
      `${r.event.event_name}(${r.event.event_month}${isNum(r.participantCount) ? `, ${(r.participantCount as number).toLocaleString("ko-KR")}명` : ""})`;
    const nameOnly = (r: MatrixRow) => `${r.event.event_name}(${r.event.event_month})`;

    const kpiPhrase = relatedKpiLabels.length > 0 ? `'${relatedKpiLabels.join("', '")}'` : "관련 KPI";
    const evidencedWithCount = [...evidenced]
      .filter((r) => isNum(r.participantCount))
      .sort((a, b) => (b.participantCount as number) - (a.participantCount as number));
    const noEvidenceNames = noEvidence.map(nameOnly);

    let interpretation: string;
    let hypothesis: string;
    let verificationKpi: string;

    if (contributionLevel === "confirmed") {
      if (evidencedWithCount.length >= 2) {
        const top = evidencedWithCount[0];
        const bottom = evidencedWithCount[evidencedWithCount.length - 1];
        interpretation = `${category} 중에서는 ${nameWithCount(top)}가 가장 많은 참여를 이끌어 ${kpiPhrase} 목표에 가장 크게 기여한 것으로 관찰되고, ${nameWithCount(bottom)}은(는) 상대적으로 참여가 적어 기여가 제한적이었던 것으로 보입니다.`;
      } else if (evidencedWithCount.length === 1) {
        interpretation = `${nameWithCount(evidencedWithCount[0])}가 ${kpiPhrase} 목표에 기여한 것으로 관찰되는, 이 캠페인의 유일한 정량 근거 회차입니다.`;
      } else {
        // 근거 A/B는 있으나(예: 예산 등 파생 지표) 참여자 수 자체는 없는 경우 - 기존 일반 서술 유지
        interpretation =
          relatedKpiLabels.length > 0
            ? `유도 행동(${targetBehaviors.join(", ")})으로 볼 때, 이 캠페인은 ${kpiPhrase} 목표와 함께 관찰되는 참여 실적을 보유하고 있습니다.`
            : `정량 근거는 있으나 유도 행동 정보가 부족해 어떤 목표 KPI와 연결되는지 원문에서 명확히 확인되지 않습니다.`;
      }
      if (noEvidenceNames.length > 0) {
        interpretation += ` 반면 ${noEvidenceNames.slice(0, 3).join(", ")}${noEvidenceNames.length > 3 ? ` 외 ${noEvidenceNames.length - 3}건` : ""}은(는) 근거가 부족해 KPI 기여 여부를 판단할 수 없습니다.`;
      }
      hypothesis =
        relatedInsightIds.length > 0
          ? "이 캠페인에 대한 개별 관찰(아래 인사이트)을 참고하세요."
          : "이 캠페인의 정량 실적이 다른 회차에서도 재현되는지 다음 달에 동일 조건으로 비교해볼 필요가 있습니다.";
      verificationKpi = relatedKpiLabels.length > 0 ? relatedKpiLabels.join(", ") : "참여자 수, 참여율";
    } else if (contributionLevel === "observed") {
      const qualNames = qualitativeOnly.map(nameOnly);
      interpretation = `${qualNames.join(", ")}${qualNames.length > 1 ? " 모두" : ""} 정량 수치는 없지만, 보고서의 정성 리뷰에서 성과가 있었다는 서술이 확인됩니다(수치화하지 않음).`;
      hypothesis = "다음 보고서부터 참여자 수·미션 달성자 수 등 정량 지표를 함께 기록하면 이 캠페인의 실제 기여도를 확인할 수 있습니다.";
      verificationKpi = relatedKpiLabels.length > 0 ? relatedKpiLabels.join(", ") : "참여자 수, 참여율, 미션 달성률";
    } else {
      const noneNames = catRows.map(nameOnly);
      interpretation = `${noneNames.join(", ")}${noneNames.length > 1 ? " 모두" : ""} 정량·정성 근거가 부족해 목표 KPI 기여 여부를 판단할 수 없습니다.`;
      hypothesis = "근거 부족 - 추천 대신 데이터 확보가 우선입니다.";
      verificationKpi = "이벤트 방문자 수, 참여자 수, 미션 달성자 수 (전 항목 미기재)";
    }

    const limitation =
      "여러 회차를 합산한 값이며, 동일 조건 비교군이 없어 '기여했다'가 아니라 '함께 관찰됐다' 수준입니다. " +
      "정량 근거가 없는 회차는 합계에서 제외했습니다(0으로 왜곡하지 않기 위함).";

    return {
      category,
      roundCount: catRows.length,
      evidencedRoundCount: evidenced.length,
      qualitativeOnlyRoundCount: qualitativeOnly.length,
      noEvidenceRoundCount: noEvidence.length,
      totalParticipants,
      totalBudget,
      totalWinners,
      targetBehaviors,
      relatedKpiLabels,
      contributionLevel,
      fact,
      interpretation,
      limitation,
      hypothesis,
      verificationKpi,
      relatedInsightIds,
      topRounds,
    };
  });
}
