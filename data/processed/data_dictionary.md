# 데이터 사전 (Data Dictionary)

## events.csv
| 필드 | 설명 |
|---|---|
| event_id | 이벤트(회차) 고유 ID. `{event_month}_{영문카테고리}` 또는 계획건은 `_PLAN` 접미사 |
| source_file | 원본 파일명 |
| report_month | 보고서 작성/발행 월 (YYYY-MM) |
| event_month | 실제 이벤트 진행(예정) 월 (YYYY-MM) - report_month와 다를 수 있음 |
| data_status | plan(계획) / result(결과) / mixed(혼재) / 확인 필요 |
| event_name | 이벤트명 |
| event_category | 골든위크/터치어워즈/11시 콘서트/지방문화혜택/설계지원팀장/영업부스트 패키지/원시트·소식지/기타 |
| target_primary / target_secondary | 핵심/보조 타깃 (FP/Agt., 고객, 설계지원팀장 등) |
| business_objective | 사업 목적 |
| target_behavior | 유도 행동 |
| participation_condition | 참여 조건 |
| mechanic_type | 이벤트 장치(미션/추첨/공유/설문 등) |
| channel | 채널 |
| seasonal_theme | 시즌 테마 |
| key_message / cta | 핵심 메시지 / 행동 유도 문구 |
| start_date / end_date | 진행 기간(확인되는 경우만, 대부분 N/A) |
| data_quality_status | 데이터 신뢰도/이슈 메모 |
| review_required | 사람 검수 필요 여부(true/false) |
| source_page | 원문 슬라이드/페이지 번호 |

## benefits.csv
| 필드 | 설명 |
|---|---|
| benefit_id | 혜택 고유 ID |
| event_id | 소속 이벤트 |
| benefit_name / benefit_type / benefit_tier | 혜택명 / 유형 / 등급(main/sub/guaranteed/entry) |
| benefit_value | 개별 혜택 단가(원) |
| winner_count / benefit_budget | 당첨 인원 / 예산(원) - 개별 항목 기준, 없으면 N/A |
| minimum_reward_value | 최소 보상 단가 |
| reward_method | 지급 구조(전원지급/선착순/즉석당첨/추첨/미션달성/단계별차등/확인 필요) |
| scarcity_type / premium_level / practicality_level / seasonality_level | 분석용 분류 태그(객관적 성과 점수 아님, 필터·가설 태그 용도) |
| data_quality_status | 신뢰도 메모 |
| source_page | 원문 위치 |

`benefit_type='합계'` 행은 이벤트 표에 개별 항목이 아닌 '총 당첨인원/총예산'으로만 기재된 값을 담은 합계 행입니다.

## performance.csv
공통 스키마의 정량 지표 필드 + `qualitative_result`, `evidence_type`(A/B/C/D), `confidence_level`.
- evidence_type A: 원본 직접 기재 수치, B: 원본 수치로 계산한 파생 지표, C: 정성 리뷰, D: 분석 가설/근거 부족 안내.
- **UI에서 A·B만 '성과 데이터'로, C·D는 '인사이트/가설'로 표시**(대시보드 개발 원칙).
- 값이 없는 정량 필드는 전부 `N/A` 문자열입니다(0 아님).

## insights.csv
`관찰된 사실 → 가능한 해석 → 한계 → 다음 달 실행 가설 → 검증 KPI` 구조. `evidence_type`은 전부 C/D.

## monthly_kpi.csv (부가 - 이벤트 단위로 귀속 불가능한 xlsx 전사 월별 집계)
| 필드 | 설명 |
|---|---|
| year_month | YYYY-MM |
| report_status | '정상' 또는 '보고서 누락'(2026-06) |
| ga_login_count | 월별 GA(설계사) 시스템 접속자 수 |
| touch_send_total/event/newsletter/content | 고객터치 발송 건수(합계/이벤트용/뉴스레터/터치콘텐츠) |
| send_agent_unique_total/event | 발송한 GA Agt. unique 수 |
| recv_customer_unique_total/event | 터치를 수신한 고객 unique 수 |
| apply_total/contract_customer/prospect_customer | 고객 응모 수(합계/계약고객/잠재고객) |
| note | 데이터 이슈 메모 |

이 표의 '이벤트' 열은 11시콘서트+골든위크 등 여러 이벤트가 합산된 값이라 **개별 이벤트로 귀속시키지 않습니다**
(오귀속 방지 원칙). 화면3(트렌드)에서만 전사 추이로 사용합니다.

## 근거 등급(evidence_type) 요약
- **A**: 원본 보고서/표에 직접 기재된 수치
- **B**: A를 바탕으로 계산한 파생 지표 (예: 총예산÷총당첨인원)
- **C**: 원본의 정성 리뷰 문장 (수치화하지 않음)
- **D**: 분석 과정에서 도출한 가설 또는 '근거 부족' 안내
