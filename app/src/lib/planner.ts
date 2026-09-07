import type { Dataset } from "./types";

export interface PlanOption {
  label: string;
  goal: string;
  target: string;
  mechanic: string;
  benefitStructure: string;
  budgetDirection: string;
  expectedBehavior: string;
  pastEvidence: string;
  risk: string;
  verificationKpi: string;
  neededData: string;
  evidenceQuality: "근거 있음" | "근거 부족(검증 우선 가설)";
}

/**
 * 카테고리별 추천안은 curated event_log/insights에 실제로 존재하는 관찰·리뷰 내용만 재구성한 것이며,
 * 존재하지 않는 성과 예측치(예상 참여자 수 등)는 절대 생성하지 않는다.
 */
const PLAYBOOK: Record<string, { recommended: Omit<PlanOption, "label">; altA: Omit<PlanOption, "label">; altB: Omit<PlanOption, "label"> }> = {
  골든위크: {
    recommended: {
      goal: "참여율 극대화",
      target: "FP/Agt. + 고객",
      mechanic: "추첨 또는 즉석 당첨(확률형)",
      benefitStructure: "모바일 금액권 중심(메인 1만원대 + 서브 1천원대 이원화)",
      budgetDirection: "최소 경품 단가를 1,000원 이상으로 표준화(7월 보고서 자체 제언)",
      expectedBehavior: "이벤트 참여, 반복 참여",
      pastEvidence: "지난 7월 골든위크에서 최소 경품 단가 상향 운영 후 '초기 주목도 제고 및 참여율 극대화 기여'가 정성적으로 관찰됨(evidence C/D, 수치 비교 없음). 8월 계획은 GS25 금액권 1만원/1천원 이원화, 총 2만명/3,800만원(evidence A).",
      risk: "저단가 경품은 실속형 제안 단계에서 그친 사례(2월 보고서)가 있어, 단가만 올린다고 참여가 느는지는 검증되지 않음.",
      verificationKpi: "참여율, 참여자 수, 1인당 평균 혜택 비용",
      neededData: "실제 참여자 수, 방문자 수, 단가 상향 전/후 비교 데이터",
      evidenceQuality: "근거 있음",
    },
    altA: {
      goal: "예산 효율 + 대규모 참여",
      target: "고객(대규모 트래픽)",
      mechanic: "즉석 당첨(슬롯머신형) 전원 참여형",
      benefitStructure: "초저단가 다수 지급형(현재 8월 계획과 유사, 2만명 규모)",
      budgetDirection: "총예산 고정, 당첨 인원 극대화로 1인당 단가는 낮춤",
      expectedBehavior: "시스템 접속, 이벤트 참여",
      pastEvidence: "8월 계획 자체가 이미 이 방향(2만명, 3,800만원 → 1인당 약 1,900원, evidence B).",
      risk: "1인당 단가가 낮아지면 2월 보고서에서 지적된 '경품 매력도 부족'이 재현될 수 있음(정량 검증 안 됨).",
      verificationKpi: "참여율, 이탈률, 완료율",
      neededData: "참여자 수, 이탈 지점 데이터",
      evidenceQuality: "근거 있음",
    },
    altB: {
      goal: "프리미엄 경험 강화",
      target: "FP/Agt.(영업 동기)",
      mechanic: "추첨(고단가 소수 지급)",
      benefitStructure: "숙박·여행/프리미엄 상품 중심(터치어워즈식 구성 차용)",
      budgetDirection: "총예산 유지, 당첨 인원 축소 대신 단가 상향",
      expectedBehavior: "영업 활동, 반복 참여",
      pastEvidence: "터치어워즈의 프리미엄 경품(호텔 상품권 등)이 원시트에 재활용될 만큼 '주목도'가 높았다는 정성 관찰(5월 보고서, evidence C).",
      risk: "당첨 확률이 낮아지면 참여 자체가 줄어들 수 있음 - 근거 부족, 검증 필요.",
      verificationKpi: "참여율, 참여자당 비용, 공유율",
      neededData: "당첨 확률별 참여 의향 데이터(현재 없음)",
      evidenceQuality: "근거 부족(검증 우선 가설)",
    },
  },
  터치어워즈: {
    recommended: {
      goal: "FP/Agt. 영업 동기 부여",
      target: "FP/Agt.",
      mechanic: "미션 수행 + 추첨",
      benefitStructure: "시즌형 프리미엄(숙박·여행) + 공연 티켓 + 식음료 엔트리 혜택의 3단 구성",
      budgetDirection: "8월 계획 기준 195명 / 415만원 유지",
      expectedBehavior: "시스템 접속, 미션 수행",
      pastEvidence: "8월 계획: 한화 호텔앤드리조트 30만원 + 서울세계불꽃축제 티켓 + 설빙 아이스크림, '마지막 기회' 긴급성 메시지로 참여 독려(evidence A, 계획 단계).",
      risk: "2월 보고서에서 지적된 '핵심 혜택 문구가 눈에 띄지 않음' 문제가 반복될 수 있음.",
      verificationKpi: "미션 달성률, 참여자 수",
      neededData: "실제 미션 달성자 수, 참여자 수(현재 전 기간 미기재)",
      evidenceQuality: "근거 있음",
    },
    altA: {
      goal: "예산 효율(참여 허들 완화)",
      target: "FP/Agt.",
      mechanic: "미션 1개 완료 시 자동 응모(2월 보고서 제안)",
      benefitStructure: "생활밀착형 실속 경품 중심",
      budgetDirection: "예산 축소, 당첨 인원 확대",
      expectedBehavior: "시스템 접속",
      pastEvidence: "2월 보고서: '미션 1개만 완료해도 자동 응모' 문구를 강조하면 쉬운 참여 조건이 전달될 것이라는 개선 제안(evidence C, 실행/검증 안 됨).",
      risk: "제안 단계에 머물러 실제 적용·효과 검증 데이터가 없음.",
      verificationKpi: "미션 달성률, 참여율",
      neededData: "적용 전/후 비교 데이터",
      evidenceQuality: "근거 부족(검증 우선 가설)",
    },
    altB: {
      goal: "프리미엄 경험으로 영업 동기 강화",
      target: "FP/Agt.",
      mechanic: "추첨(고가 소수)",
      benefitStructure: "숙박·여행 + 공연 결합형(8월 계획과 동일 방향)",
      budgetDirection: "8월 계획 수준(415만원/195명) 유지 또는 소폭 확대",
      expectedBehavior: "영업 활동, 반복 참여",
      pastEvidence: "8월 계획의 설계 의도: '불꽃축제 관람+리조트 숙박권 결합으로 영업 동기 환기'(evidence A, 계획 단계 - 실제 결과 아님).",
      risk: "계획 단계 수치라 실제 참여 전환으로 이어질지 확인 안 됨.",
      verificationKpi: "참여자 수, 미션 달성률, 반복 참여자 수",
      neededData: "실행 결과 데이터 전체",
      evidenceQuality: "근거 있음",
    },
  },
  "11시 콘서트": {
    recommended: {
      goal: "참여 허들 완화를 통한 응모 확대",
      target: "고객 + FP/Agt.",
      mechanic: "사연 응모 + 예시 템플릿 선제 제공",
      benefitStructure: "공연·문화 티켓(메인) + 식음료(서브)",
      budgetDirection: "8월 계획 기준(195,000원, 당첨 인원은 원문 표기 오류로 확인 필요)",
      expectedBehavior: "공연 응모, 사연 응모",
      pastEvidence: "7월 보고서: 응모 조건 강화에도 사연 작성 예시를 선제 노출해 '이전 차수 대비 최다 참여 모객' 달성이 관찰됨(evidence C, 정확한 인원수 미기재).",
      risk: "예시 제공의 개별 효과가 다른 요인과 분리되지 않아 인과 확정 불가.",
      verificationKpi: "이벤트 방문자 수, 참여율, 사연 예시 노출 여부별 응모 전환율",
      neededData: "노출/방문자 수, 예시 제공 전후 비교군",
      evidenceQuality: "근거 있음",
    },
    altA: {
      goal: "예산 효율(단가 최소화)",
      target: "고객",
      mechanic: "추첨(다수 당첨)",
      benefitStructure: "식음료 등 저단가 경품 비중 확대",
      budgetDirection: "예산 축소",
      expectedBehavior: "공연 응모",
      pastEvidence: "2월 보고서: 'FP 1인당 경품비를 1천원선으로 낮추고 당첨 인원을 늘려 당첨 확률을 높이는 방안'이 제안됨(evidence C, 실행 여부 확인 필요로 원문에 명시).",
      risk: "제안 단계, 실제 적용/효과 데이터 없음.",
      verificationKpi: "당첨 확률, 참여율",
      neededData: "적용 여부 및 결과 데이터",
      evidenceQuality: "근거 부족(검증 우선 가설)",
    },
    altB: {
      goal: "프리미엄 경험/희소성 강화",
      target: "FP/Agt.(초청형)",
      mechanic: "오프라인 초청 + 미션 수행",
      benefitStructure: "유명 출연진 프리미엄 공연(3월 광주 공연 사례처럼 '1년에 한 번' 희소성 메시지)",
      budgetDirection: "고단가 소수 지급",
      expectedBehavior: "미션 수행, 공연 응모",
      pastEvidence: "3월 보고서(지방문화혜택 연계): 지휘자·보컬 출연 오케스트라 콘서트를 '1년에 딱 한 번' 프리미엄으로 소구(evidence D, 슬라이드 이미지 확인·정량 성과는 미기재).",
      risk: "성과 수치(참여/미션 달성)가 전혀 확인되지 않아 효과 미검증.",
      verificationKpi: "미션 달성 인원, 응모자 수",
      neededData: "미션 달성자 수, 응모자 수, 지역별 참여 데이터",
      evidenceQuality: "근거 부족(검증 우선 가설)",
    },
  },
};

const DEFAULT_PLAYBOOK: { recommended: Omit<PlanOption, "label">; altA: Omit<PlanOption, "label">; altB: Omit<PlanOption, "label"> } = {
  recommended: {
    goal: "확인 필요",
    target: "확인 필요",
    mechanic: "확인 필요",
    benefitStructure: "확인 필요",
    budgetDirection: "확인 필요",
    expectedBehavior: "확인 필요",
    pastEvidence: "이 이벤트 유형은 정량·정성 근거가 충분히 확보되지 않았습니다.",
    risk: "과거 데이터가 부족해 리스크를 특정하기 어렵습니다.",
    verificationKpi: "참여자 수, 미션 달성률, 참여율 등 기본 지표부터 수집 필요",
    neededData: "이벤트 페이지 방문자 수, 참여자 수, 혜택 지급 내역 전반",
    evidenceQuality: "근거 부족(검증 우선 가설)",
  },
  altA: {
    goal: "확인 필요", target: "확인 필요", mechanic: "확인 필요", benefitStructure: "확인 필요",
    budgetDirection: "확인 필요", expectedBehavior: "확인 필요",
    pastEvidence: "근거 부족", risk: "근거 부족", verificationKpi: "확인 필요", neededData: "확인 필요",
    evidenceQuality: "근거 부족(검증 우선 가설)",
  },
  altB: {
    goal: "확인 필요", target: "확인 필요", mechanic: "확인 필요", benefitStructure: "확인 필요",
    budgetDirection: "확인 필요", expectedBehavior: "확인 필요",
    pastEvidence: "근거 부족", risk: "근거 부족", verificationKpi: "확인 필요", neededData: "확인 필요",
    evidenceQuality: "근거 부족(검증 우선 가설)",
  },
};

export function buildPlan(category: string): PlanOption[] {
  const pb = PLAYBOOK[category] ?? DEFAULT_PLAYBOOK;
  return [
    { label: "권고안 (근거 가장 많은 조합)", ...pb.recommended },
    { label: "대안 A (예산 효율/대규모 참여 우선)", ...pb.altA },
    { label: "대안 B (프리미엄 경험/영업 동기 강화)", ...pb.altB },
  ];
}

export function historicalEventsFor(data: Dataset, category: string) {
  return data.events
    .filter((e) => e.event_category === category)
    .sort((a, b) => a.event_month.localeCompare(b.event_month));
}
