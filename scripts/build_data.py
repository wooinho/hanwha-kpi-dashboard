# -*- coding: utf-8 -*-
"""
한화생명 고객터치 시스템 KPI 대시보드 - 정제 데이터 빌드 스크립트

입력:
  - scripts/event_log.py            (사람이 검수한 이벤트/혜택/정성리뷰 큐레이션 - pptx 5개 원문 기반)
  - data/raw/[고객터치 시스템] 월별 주요지표 .xlsx  (GA접속/터치발송/고객응모 월별 집계 - 자동 파싱)

출력 (data/processed/):
  - events.csv, benefits.csv, performance.csv, insights.csv   (공통 스키마, 대시보드 8절)
  - monthly_kpi.csv                                            (이벤트 단위로 귀속 불가능한 월별 전사 집계 - 트렌드 화면용)
  - data_audit.json, data_dictionary.md                        (감사 결과, 4절)

원칙 (재발방지 메모):
  - 원본에 없는 수치는 만들지 않는다. 없으면 python 값 None -> CSV/JSON에서 빈 값/"" 이 아니라
    문자열 "N/A" 또는 "데이터 없음"으로 강제 출력한다 (0으로 왜곡 금지).
  - 분모가 없거나 0이면 계산하지 않고 "N/A".
  - evidence_type A/B 만 '성과 데이터'로 취급, C/D는 '인사이트/가설'로 분리해서 별도 파일(insights.csv)에 둔다.
  - 이벤트 단위로 귀속시킬 수 없는 xlsx 월별 합계(전사 GA 접속자, 전체 터치발송 등)는 특정 event_id에
    억지로 연결하지 않고 monthly_kpi.csv 로 별도 관리한다 (인과 오귀속 방지).
"""
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import event_log  # noqa: E402

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "data" / "raw"
OUT = BASE / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

NA = "N/A"          # 계산 불가/미기재 수치
NO_DATA = "데이터 없음"  # 텍스트성 필드 미기재

EVENTS_COLUMNS = [
    "event_id", "source_file", "report_month", "event_month", "data_status",
    "event_name", "event_category", "target_primary", "target_secondary",
    "business_objective", "target_behavior", "participation_condition",
    "mechanic_type", "channel", "seasonal_theme", "key_message", "cta",
    "start_date", "end_date", "data_quality_status", "review_required", "source_page",
]

BENEFITS_COLUMNS = [
    "benefit_id", "event_id", "benefit_name", "benefit_type", "benefit_tier",
    "benefit_value", "winner_count", "benefit_budget", "minimum_reward_value",
    "reward_method", "scarcity_type", "premium_level", "practicality_level",
    "seasonality_level", "data_quality_status", "source_page",
]

PERFORMANCE_COLUMNS = [
    "performance_id", "event_id", "exposure_count", "unique_visitor_count",
    "participant_count", "mission_complete_count", "share_count", "touch_send_count",
    "customer_response_count", "repeat_participant_count", "winner_count",
    "completion_rate", "participation_rate", "share_rate", "touch_conversion_rate",
    "cost_per_participant", "cost_per_completion", "previous_event_value", "change_rate",
    "qualitative_result", "evidence_type", "confidence_level", "source_page", "review_kind",
]
# review_kind (evidence_type=C 행에만 의미 있음, 화면1 하단 리스트 분류용):
#   result_qualitative = 관찰된 성과(핵심 성과 후보) / improve = 개선 필요 항목
#   plan_rationale = 계획 기획 의도(의사결정 참고) / observation = 일반 관찰 / process = 프로세스 개선

INSIGHTS_COLUMNS = [
    "insight_id", "event_id", "fact", "interpretation", "limitation",
    "next_month_hypothesis", "verification_kpi", "evidence_type",
    "source_file", "source_page",
]


def nz(v):
    """None -> N/A 문자열, 그 외는 그대로."""
    if v is None or v == "":
        return NA
    return v


def nz_text(v):
    if v is None or v == "":
        return NO_DATA
    return v


def write_csv(path: Path, columns, rows):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, NA) for c in columns})
    print(f"  -> {path.relative_to(BASE)} ({len(rows)} rows)")


def build_events_benefits_performance_insights():
    events_rows = []
    benefits_rows = []
    performance_rows = []
    insights_rows = []
    benefit_seq = 0
    perf_seq = 0
    insight_seq = 0

    for ev in event_log.EVENTS:
        events_rows.append({
            "event_id": ev["event_id"],
            "source_file": ev["source_file"],
            "report_month": ev["report_month"],
            "event_month": ev["event_month"],
            "data_status": ev["data_status"],
            "event_name": ev["event_name"],
            "event_category": ev["event_category"],
            "target_primary": nz_text(ev.get("target_primary")),
            "target_secondary": nz_text(ev.get("target_secondary")),
            "business_objective": nz_text(ev.get("business_objective")),
            "target_behavior": nz_text(ev.get("target_behavior")),
            "participation_condition": nz_text(ev.get("participation_condition")),
            "mechanic_type": nz_text(ev.get("mechanic_type")),
            "channel": nz_text(ev.get("channel")),
            "seasonal_theme": nz_text(ev.get("seasonal_theme")),
            "key_message": nz_text(ev.get("key_message")),
            "cta": nz_text(ev.get("cta")),
            "start_date": nz(ev.get("start_date")),
            "end_date": nz(ev.get("end_date")),
            "data_quality_status": ev["data_quality_status"],
            "review_required": ev["review_required"],
            "source_page": ev["source_page"],
        })

        # ---- benefits ----
        for b in ev.get("benefits", []):
            benefit_seq += 1
            benefits_rows.append({
                "benefit_id": f"BEN-{benefit_seq:04d}",
                "event_id": ev["event_id"],
                "benefit_name": b["benefit_name"],
                "benefit_type": b["benefit_type"],
                "benefit_tier": b["benefit_tier"],
                "benefit_value": nz(b.get("benefit_value")),
                "winner_count": nz(b.get("winner_count")),
                "benefit_budget": nz(b.get("benefit_budget")),
                "minimum_reward_value": nz(b.get("minimum_reward_value")),
                "reward_method": nz_text(b.get("reward_method")),
                "scarcity_type": nz_text(b.get("scarcity_type")),
                "premium_level": nz_text(b.get("premium_level")),
                "practicality_level": nz_text(b.get("practicality_level")),
                "seasonality_level": nz_text(b.get("seasonality_level")),
                "data_quality_status": b.get("data_quality_status", "확인 필요"),
                "source_page": b.get("source_page", ev["source_page"]),
            })

        # 이벤트 합계(표에 직접 기재된 총 당첨인원/총예산)가 있으면 별도 'TOTAL' 혜택행으로도 기록
        total_winner = ev.get("total_winner_count")
        total_budget = ev.get("total_budget")
        if total_winner is not None or total_budget is not None:
            benefit_seq += 1
            avg_cost = NA
            if isinstance(total_winner, int) and isinstance(total_budget, int) and total_winner > 0:
                avg_cost = round(total_budget / total_winner, 1)
            benefits_rows.append({
                "benefit_id": f"BEN-{benefit_seq:04d}",
                "event_id": ev["event_id"],
                "benefit_name": "(전체 합계)",
                "benefit_type": "합계",
                "benefit_tier": NA,
                "benefit_value": NA,
                "winner_count": nz(total_winner),
                "benefit_budget": nz(total_budget),
                "minimum_reward_value": NA,
                "reward_method": NO_DATA,
                "scarcity_type": NO_DATA,
                "premium_level": NO_DATA,
                "practicality_level": NO_DATA,
                "seasonality_level": NO_DATA,
                "data_quality_status": "A(표 합계 직접 기재)" if (total_winner and total_budget) else "확인 필요",
                "source_page": ev["source_page"],
            })
            # 평균 혜택 비용(=총예산/총당첨인원)을 계산 가능하면 performance 행에 B 근거로 반영
            if avg_cost != NA:
                perf_seq += 1
                performance_rows.append({
                    "performance_id": f"PERF-{perf_seq:04d}",
                    "event_id": ev["event_id"],
                    "exposure_count": NA, "unique_visitor_count": NA, "participant_count": NA,
                    "mission_complete_count": NA, "share_count": NA, "touch_send_count": NA,
                    "customer_response_count": NA, "repeat_participant_count": NA,
                    "winner_count": total_winner,
                    "completion_rate": NA, "participation_rate": NA, "share_rate": NA,
                    "touch_conversion_rate": NA,
                    "cost_per_participant": NA,  # 참여자 수 없어 계산 불가
                    "cost_per_completion": NA,
                    "previous_event_value": NA, "change_rate": NA,
                    "qualitative_result": f"1인당 평균 혜택 비용(계획) = 총 경품예산 {total_budget:,}원 / 총 당첨인원 {total_winner:,}명 = 약 {avg_cost:,.1f}원",
                    "evidence_type": "B",
                    "confidence_level": "중(계획 수치 기반 파생값, 실제 집행 결과 아님)",
                    "source_page": ev["source_page"],
                    "review_kind": NA,
                })

        # ---- 실측 데이터(내부 로그 등, 사용자가 2026-09-04 추가 제공) -> performance(evidence A) ----
        measured = ev.get("measured")
        if measured:
            perf_seq += 1
            pc = measured.get("participant_count")
            uv = measured.get("unique_visitor_count")
            tsc = measured.get("touch_send_count")
            part_rate = None
            if isinstance(pc, int) and isinstance(uv, int) and uv > 0:
                part_rate = round(pc / uv * 100, 1)
            summary_bits = []
            if uv is not None:
                summary_bits.append(f"방문/클릭 {uv:,}")
            if measured.get("customer_response_count") is not None:
                summary_bits.append(f"수신고객 {measured['customer_response_count']:,}")
            if pc is not None:
                summary_bits.append(f"참여(응모) {pc:,}")
            if tsc is not None:
                summary_bits.append(f"터치발송 {tsc:,}")
            summary = f"[내부 실측 로그] {measured['source_file']} ({measured['source_page']}) - " + ", ".join(summary_bits)
            performance_rows.append({
                "performance_id": f"PERF-{perf_seq:04d}",
                "event_id": ev["event_id"],
                "exposure_count": NA,
                "unique_visitor_count": nz(uv),
                "participant_count": nz(pc),
                "mission_complete_count": NA,
                "share_count": NA,
                "touch_send_count": nz(tsc),
                "customer_response_count": nz(measured.get("customer_response_count")),
                "repeat_participant_count": NA,
                "winner_count": NA,
                "completion_rate": NA,
                "participation_rate": nz(part_rate),
                "share_rate": NA, "touch_conversion_rate": NA,
                "cost_per_participant": NA, "cost_per_completion": NA,
                "previous_event_value": NA, "change_rate": NA,
                "qualitative_result": summary + ". " + measured.get("note", ""),
                "evidence_type": "A",
                "confidence_level": "원본 내부 로그 직접 집계(일별 데이터 합산)",
                "source_page": measured["source_page"],
                "review_kind": NA,
            })
            caveat = measured.get("touch_send_count_caveat")
            if caveat:
                perf_seq += 1
                performance_rows.append({
                    "performance_id": f"PERF-{perf_seq:04d}",
                    "event_id": ev["event_id"],
                    "exposure_count": NA, "unique_visitor_count": NA, "participant_count": NA,
                    "mission_complete_count": NA, "share_count": NA, "touch_send_count": NA,
                    "customer_response_count": NA, "repeat_participant_count": NA, "winner_count": NA,
                    "completion_rate": NA, "participation_rate": NA, "share_rate": NA,
                    "touch_conversion_rate": NA, "cost_per_participant": NA, "cost_per_completion": NA,
                    "previous_event_value": NA, "change_rate": NA,
                    "qualitative_result": caveat,
                    "evidence_type": "D",
                    "confidence_level": "확인 필요(두 원본 간 정의 불일치)",
                    "source_page": measured["source_page"],
                    "review_kind": "no_evidence",
                })

        # ---- 카카오톡 채널 발송 로그 요약(참고용, 전사/이벤트 전체 성과와 구분) -> performance(evidence A) ----
        kakao = ev.get("kakao_channel_summary")
        if kakao:
            perf_seq += 1
            performance_rows.append({
                "performance_id": f"PERF-{perf_seq:04d}",
                "event_id": ev["event_id"],
                "exposure_count": nz(kakao.get("impression_total")),
                "unique_visitor_count": NA, "participant_count": NA,
                "mission_complete_count": NA, "share_count": NA, "touch_send_count": NA,
                "customer_response_count": NA, "repeat_participant_count": NA, "winner_count": NA,
                "completion_rate": NA, "participation_rate": NA, "share_rate": NA,
                "touch_conversion_rate": NA, "cost_per_participant": NA, "cost_per_completion": NA,
                "previous_event_value": NA, "change_rate": NA,
                "qualitative_result": (
                    f"[카카오 채널 발송 로그, {kakao['rounds']}회차, {kakao['channels']}] "
                    f"노출수 합계 {kakao['impression_total']:,}, 클릭수 합계 {kakao['click_total']:,}. {kakao['note']}"
                ),
                "evidence_type": "A",
                "confidence_level": "채널 한정 수치(전사/이벤트 전체 방문자와 다름, 참고용)",
                "source_page": kakao["source_file"],
                "review_kind": NA,
            })

        # ---- 정성 리뷰 -> performance(evidence C) ----
        for rv in ev.get("reviews", []):
            perf_seq += 1
            performance_rows.append({
                "performance_id": f"PERF-{perf_seq:04d}",
                "event_id": ev["event_id"],
                "exposure_count": NA, "unique_visitor_count": NA, "participant_count": NA,
                "mission_complete_count": NA, "share_count": NA, "touch_send_count": NA,
                "customer_response_count": NA, "repeat_participant_count": NA, "winner_count": NA,
                "completion_rate": NA, "participation_rate": NA, "share_rate": NA,
                "touch_conversion_rate": NA, "cost_per_participant": NA, "cost_per_completion": NA,
                "previous_event_value": NA, "change_rate": NA,
                "qualitative_result": rv["quote"],
                "evidence_type": "C",
                "confidence_level": "정성 리뷰(수치 아님)",
                "source_page": ev["source_page"],
                "review_kind": rv.get("kind", NA),
            })

        # 정량 데이터가 전혀 없는 이벤트는 '데이터 없음'을 명시하는 안내용 performance 행 1개 추가
        if (
            not ev.get("reviews")
            and total_winner is None
            and total_budget is None
            and not measured
            and not kakao
        ):
            perf_seq += 1
            performance_rows.append({
                "performance_id": f"PERF-{perf_seq:04d}",
                "event_id": ev["event_id"],
                "exposure_count": NA, "unique_visitor_count": NA, "participant_count": NA,
                "mission_complete_count": NA, "share_count": NA, "touch_send_count": NA,
                "customer_response_count": NA, "repeat_participant_count": NA, "winner_count": NA,
                "completion_rate": NA, "participation_rate": NA, "share_rate": NA,
                "touch_conversion_rate": NA, "cost_per_participant": NA, "cost_per_completion": NA,
                "previous_event_value": NA, "change_rate": NA,
                "qualitative_result": "원본 보고서에 이 이벤트의 정량 성과 또는 정성 리뷰가 확인되지 않음",
                "evidence_type": "D",
                "confidence_level": "근거 부족",
                "source_page": ev["source_page"],
                "review_kind": "no_evidence",
            })

    # ---- 7월 보고서 slide9 "9월 운영 제언" -> insights.csv (구조: 사실->해석->한계->가설->검증KPI) ----
    src = event_log.SEPT_RECOMMENDATIONS_SOURCE
    insight_seq += 1
    insights_rows.append({
        "insight_id": f"INS-{insight_seq:04d}",
        "event_id": "2026-07_11CONCERT",
        "fact": "11시 콘서트는 응모 조건이 강화되었음에도, 사연 작성 예시를 프로모션 페이지에 선제적으로 노출한 이후 '이전 차수 대비 최다 참여 모객'을 달성했다고 보고서에 기재됨(정확한 인원수는 원문에 없음).",
        "interpretation": "사연 작성 예시 제공이 참여 허들을 낮춰 모객 증가와 함께 관찰됐을 가능성이 있음.",
        "limitation": "실제 응모자 수, 노출/방문자 수, 비교 대상 회차의 조건이 원문에 없어 예시 제공의 개별 효과를 다른 요인(시즌, 경품 등)과 분리할 수 없음. '영향을 주었다'가 아니라 '함께 관찰됐다' 수준으로만 서술 가능.",
        "next_month_hypothesis": "참여 예시(사연 템플릿) 제공을 다른 사연형 이벤트에도 표준 적용하면 참여 허들이 낮아져 응모자 수가 늘어날 수 있다는 가설.",
        "verification_kpi": "이벤트 방문자 수, 참여율, 미션 달성률, 사연 예시 노출 여부별 응모 전환율",
        "evidence_type": "D",
        "source_file": src["source_file"], "source_page": src["source_page"],
    })
    insight_seq += 1
    insights_rows.append({
        "insight_id": f"INS-{insight_seq:04d}",
        "event_id": "2026-07_GOLDENWEEK",
        "fact": "지난 7월 골든위크에서 경품 예산 증대 기조에 맞춰 최소 경품 단가를 상향 운영했다고 보고서에 기재됨. 2026-09-04 추가된 내부 로그로 절대 수치는 확인됨(방문/클릭 73,971 -> 응모 43,097명, 참여전환 약 58.3%, evidence A) - 다만 상향 이전(6월 등) 수치가 없어 전후 비교는 여전히 불가.",
        "interpretation": "높은 참여전환율(약 58.3%)이 최소 경품 단가 상향과 함께 관찰됨. 다만 이 수치 하나만으로는 상향 자체의 효과인지 이벤트 콘셉트·시즌 효과인지 분리할 수 없음.",
        "limitation": "6월(비교 대상 회차)이 보고서 파일 오류로 삭제되어 상향 전 수치를 확보할 수 없음. 동일 조건 비교군 부재로 인과관계 단정 불가 - '영향을 주었다'가 아니라 '높은 전환율과 함께 관찰됐다' 수준으로만 서술.",
        "next_month_hypothesis": "최소 경품 단가를 1,000원 이상으로 표준화하면 소액 경품으로 인한 이탈이 줄고 참여 전환율이 개선될 수 있다는 가설(보고서 자체 제언).",
        "verification_kpi": "참여율, 참여자 수, 이탈률(방문 대비 미참여), 1인당 평균 혜택 비용",
        "evidence_type": "D",
        "source_file": src["source_file"], "source_page": src["source_page"],
    })
    insight_seq += 1
    insights_rows.append({
        "insight_id": f"INS-{insight_seq:04d}",
        "event_id": NA,
        "fact": "프로모션 제작 프로세스의 평균 소요 기간이 17~23일로 보고서에 기재됨.",
        "interpretation": "제작 일정이 촉박할 경우 KV 완성도·검수 품질에 영향을 줄 수 있다는 것이 2월~7월 보고서에 반복적으로 언급된 개선 요구사항(카피 완성도, 검수 강화 등)과 함께 관찰됨.",
        "limitation": "제작 기간과 실제 성과(참여율 등) 간의 정량적 상관관계는 원문에 없어 검증되지 않음.",
        "next_month_hypothesis": "SB·경품안 확정 후 제작 착수 원칙을 지키고 17~23일 일정을 선제적으로 확보하면 검수 품질(오탈자, 조건 불일치 등)이 개선될 수 있다는 가설.",
        "verification_kpi": "이벤트별 제작 착수~오픈 소요일, 오픈 후 수정/정정 발생 건수",
        "evidence_type": "D",
        "source_file": src["source_file"], "source_page": src["source_page"],
    })
    insight_seq += 1
    insights_rows.append({
        "insight_id": f"INS-{insight_seq:04d}",
        "event_id": NA,
        "fact": (
            "2026-09-04 추가된 내부 로그(골든위크 총 응모 43,097명 + 11시콘서트 8월 공연 응모 1,160명 = 44,257명)가 "
            "기존 xlsx 월별 주요지표의 2026-07 전사 고객응모 집계(44,258명, 계약고객 29,697/잠재고객 14,561)와 "
            "1명 오차로 거의 정확히 일치함(계약고객: 28,706+990=29,696 vs 29,697, 잠재고객: 14,391+170=14,561 vs 14,561 정확히 일치)."
        ),
        "interpretation": "두 개의 서로 다른 원본(이벤트별 내부 로그 vs 전사 월별 집계표)이 상호 검증되어, 2026-07 고객응모 수치의 신뢰도가 높다고 판단됨(evidence A 근거 2건 교차 일치).",
        "limitation": "터치어워즈(불꽃어워즈)는 응모형이 아닌 미션형 이벤트라 이 응모 집계에 포함되지 않는 것으로 보이나, 원문에 명시적으로 확인되지는 않음. 또한 이 일치가 우연의 일치일 가능성도 완전히 배제할 수는 없음(표본이 2개월뿐).",
        "next_month_hypothesis": "다음 달에도 이벤트별 내부 로그와 전사 월별 집계표를 함께 확보해 교차검증을 반복하면, 데이터 신뢰도를 지속적으로 담보할 수 있다는 가설.",
        "verification_kpi": "월별 이벤트별 응모 로그 vs 전사 집계표의 일치율",
        "evidence_type": "D",
        "source_file": "내부_골든위크_7월_260701-260731.xlsx, 내부_11시콘서트_8월_신사들의오페라_260715-260731.xlsx, [고객터치 시스템] 월별 주요지표 .xlsx",
        "source_page": "일별 로그 합계 vs 3.고객응모 시트",
    })

    return events_rows, benefits_rows, performance_rows, insights_rows


def build_monthly_kpi_from_xlsx():
    """xlsx '월별 주요지표'에서 전사 월별 집계(이벤트 단위로 귀속 불가)를 뽑는다."""
    import openpyxl

    xlsx_path = next(RAW.glob("*고객터치*월별*주요지표*.xlsx"))
    wb = openpyxl.load_workbook(str(xlsx_path), data_only=True)
    ws1 = wb["1.GA 접속"]

    def cell(r, c):
        return ws1.cell(row=r, column=c).value

    months = []
    # R7:R18 -> 년도(col B=2), 년월(col C=3), GA(col D=4) : 2026-01 ~ 2026-12 (09~12는 #REF! 수식 오류)
    for r in range(7, 19):
        ym = cell(r, 3)
        ga = cell(r, 4)
        if ym is None:
            continue
        ga_ok = isinstance(ga, (int, float))
        months.append({
            "year_month": str(ym),
            "ga_login_count": ga if ga_ok else None,
            "ga_login_flag": "A" if ga_ok else "확인 필요(수식 오류 #REF!)",
        })

    # 터치발송/발송Agt/수신고객 표: 컬럼 D~K = 1~8월(2026), row는 항목별 합계/이벤트/뉴스레터/터치콘텐츠
    def month_series(base_row, label_row_offset=0):
        header_row = base_row  # R23/R31/R39 : 1..8
        data = {}
        for month_idx, col in enumerate(range(4, 12), start=1):  # D~K = col 4..11
            header_val = cell(header_row, col)
            data[month_idx] = header_val
        return data

    touch_send = {"합계": {}, "이벤트": {}, "뉴스레터": {}, "터치콘텐츠": {}}
    for month_idx, col in enumerate(range(4, 12), start=1):
        touch_send["합계"][month_idx] = cell(24, col)
        touch_send["이벤트"][month_idx] = cell(25, col)
        touch_send["뉴스레터"][month_idx] = cell(26, col)
        touch_send["터치콘텐츠"][month_idx] = cell(27, col)

    send_agt = {"합계": {}, "이벤트": {}, "뉴스레터": {}, "터치콘텐츠": {}}
    for month_idx, col in enumerate(range(4, 12), start=1):
        send_agt["합계"][month_idx] = cell(32, col)
        send_agt["이벤트"][month_idx] = cell(33, col)
        send_agt["뉴스레터"][month_idx] = cell(34, col)
        send_agt["터치콘텐츠"][month_idx] = cell(35, col)

    recv_cust = {"합계": {}, "이벤트": {}, "뉴스레터": {}, "터치콘텐츠": {}}
    aug_header = cell(38, 11)  # 2026-08 컬럼 헤더 셀(오타 의심: '오오')
    for month_idx, col in enumerate(range(4, 12), start=1):
        recv_cust["합계"][month_idx] = cell(40, col)
        recv_cust["이벤트"][month_idx] = cell(41, col)
        recv_cust["뉴스레터"][month_idx] = cell(42, col)
        recv_cust["터치콘텐츠"][month_idx] = cell(43, col)

    apply_total = {"합계": {}, "계약고객": {}, "잠재고객": {}}
    for month_idx, col in enumerate(range(4, 12), start=1):
        apply_total["합계"][month_idx] = cell(49, col)
        apply_total["계약고객"][month_idx] = cell(50, col)
        apply_total["잠재고객"][month_idx] = cell(51, col)

    rows = []
    for month_idx in range(1, 9):
        ym = f"2026-{month_idx:02d}"
        ga_row = next((m for m in months if m["year_month"] == ym), None)
        rows.append({
            "year_month": ym,
            "report_status": "보고서 누락" if ym == "2026-06" else "정상",
            "ga_login_count": nz(ga_row["ga_login_count"]) if ga_row else NA,
            "touch_send_total": nz(touch_send["합계"].get(month_idx)),
            "touch_send_event": nz(touch_send["이벤트"].get(month_idx)),
            "touch_send_newsletter": nz(touch_send["뉴스레터"].get(month_idx)),
            "touch_send_content": nz(touch_send["터치콘텐츠"].get(month_idx)),
            "send_agent_unique_total": nz(send_agt["합계"].get(month_idx)),
            "send_agent_unique_event": nz(send_agt["이벤트"].get(month_idx)),
            "recv_customer_unique_total": nz(recv_cust["합계"].get(month_idx)),
            "recv_customer_unique_event": nz(recv_cust["이벤트"].get(month_idx)),
            "apply_total": nz(apply_total["합계"].get(month_idx)),
            "apply_contract_customer": nz(apply_total["계약고객"].get(month_idx)),
            "apply_prospect_customer": nz(apply_total["잠재고객"].get(month_idx)),
            "note": (
                "8월 컬럼 헤더가 원본에 '오오'로 표기되어 있어(정상값 '8' 추정) 단위/헤더 오류로 확인 필요"
                if month_idx == 8 else
                "6월 운영 리뷰 pptx 보고서는 파일 오류로 삭제되어 없음. 단, 이 xlsx 누적 집계에는 6월 수치가 "
                "남아 있으며 다른 달 대비 크게 낮음(GA 5,605명·터치발송 2,964건) - 실제 저조였는지 부분 집계인지 확인 필요"
                if month_idx == 6 else ""
            ),
        })
    return rows, {"aug_header_raw_value": aug_header}


def main():
    print("[1/3] events / benefits / performance / insights 생성")
    events_rows, benefits_rows, performance_rows, insights_rows = build_events_benefits_performance_insights()
    write_csv(OUT / "events.csv", EVENTS_COLUMNS, events_rows)
    write_csv(OUT / "benefits.csv", BENEFITS_COLUMNS, benefits_rows)
    write_csv(OUT / "performance.csv", PERFORMANCE_COLUMNS, performance_rows)
    write_csv(OUT / "insights.csv", INSIGHTS_COLUMNS, insights_rows)

    print("[2/3] monthly_kpi.csv 생성 (xlsx 전사 월별 집계, 이벤트 미귀속)")
    monthly_rows, xlsx_meta = build_monthly_kpi_from_xlsx()
    write_csv(
        OUT / "monthly_kpi.csv",
        list(monthly_rows[0].keys()),
        monthly_rows,
    )

    print("[3/4] kpi_targets.json 생성 (xlsx에 직접 기재된 목표치)")
    build_kpi_targets_json()

    print("[4/4] data_audit.json / data_dictionary.md 생성")
    build_audit_json(events_rows, benefits_rows, performance_rows, insights_rows, monthly_rows, xlsx_meta)
    build_data_dictionary()

    print("\n===== 요약 =====")
    print(f"이벤트 수: {len(events_rows)}")
    print(f"혜택 수: {len(benefits_rows)}")
    print(f"성과/리뷰 행 수: {len(performance_rows)}")
    print(f"인사이트 수: {len(insights_rows)}")
    review_needed = sum(1 for e in events_rows if str(e['review_required']).lower() == 'true')
    print(f"검수 필요(review_required=True) 이벤트: {review_needed} / {len(events_rows)}")


def build_kpi_targets_json():
    """[고객터치 시스템] 월별 주요지표 .xlsx 시트에 직접 기재된 목표치(evidence A).
    원문: '1.월별접속자(목표:월평균9천명)', '2-1.월별_터치거리발송량(목표:월평균1.5만건)',
    '2-2월별_발송GAAgt.수(unique,목표:월평균5천명이상)', '3.월별고객응모데이터(목표:연간19.5만명)'."""
    targets = [
        {
            "metric": "ga_login_count",
            "label": "GA(설계사) 월별 접속자 수",
            "target_value": 9000,
            "target_period": "monthly_avg",
            "unit": "명",
            "source": "[고객터치 시스템] 월별 주요지표 .xlsx, '1.월별접속자' 시트 제목",
        },
        {
            "metric": "touch_send_total",
            "label": "월별 고객터치 발송량",
            "target_value": 15000,
            "target_period": "monthly_avg",
            "unit": "건",
            "source": "[고객터치 시스템] 월별 주요지표 .xlsx, '2-1.월별_터치거리발송량' 시트 제목",
        },
        {
            "metric": "send_agent_unique_total",
            "label": "월별 발송 GA Agt. 수(unique)",
            "target_value": 5000,
            "target_period": "monthly_avg",
            "unit": "명",
            "source": "[고객터치 시스템] 월별 주요지표 .xlsx, '2-2월별_발송GAAgt.수' 시트 제목",
        },
        {
            "metric": "apply_total",
            "label": "연간 고객 응모 수",
            "target_value": 195000,
            "target_period": "annual_cumulative",
            "unit": "명",
            "source": "[고객터치 시스템] 월별 주요지표 .xlsx, '3.월별고객응모데이터' 시트 제목",
        },
    ]
    with open(OUT / "kpi_targets.json", "w", encoding="utf-8") as f:
        json.dump(targets, f, ensure_ascii=False, indent=2)
    print(f"  -> {(OUT / 'kpi_targets.json').relative_to(BASE)}")


def build_audit_json(events_rows, benefits_rows, performance_rows, insights_rows, monthly_rows, xlsx_meta):
    files = [
        {"file": "(wylie)한화생명 2월 월간보고_260311(F).pptx", "report_month": "2026-02",
         "reliability": "중(디자인 리뷰 슬라이드 위주, 정량 데이터 없음)"},
        {"file": "(wylie)한화생명 3월 월간보고_260402(F).pptx", "report_month": "2026-03",
         "reliability": "중(SUMMARY 이벤트명 나열 확인, 개별 상세는 3건 중 1건만 리뷰 슬라이드 존재)"},
        {"file": "(wylie)한화생명 4월 월간보고_260507(F).pptx", "report_month": "2026-04",
         "reliability": "낮음(8슬라이드 중 텍스트 8줄 - 거의 전량 이미지, 이벤트명 자동 확인 불가)"},
        {"file": "(wylie)한화생명 5월 월간보고_260608(FF).pptx", "report_month": "2026-05",
         "reliability": "낮음(SUMMARY 외 개별 이벤트명 텍스트 확인 불가, 6월 영업부스트 패키지만 상세 확인)"},
        {"file": "(wylie)한화생명 7월 월간보고_260806_6월은 파일 오류로 삭제.pptx", "report_month": "2026-07",
         "reliability": "높음(8월 계획 표 A등급 수치 확보, 7월 실적은 정성 리뷰만 존재)"},
        {"file": "[고객터치 시스템] 월별 주요지표 .xlsx", "report_month": "N/A(누적 집계 파일)",
         "reliability": "높음(원본 수치 직접 기재, 단 2026-09~12 GA값 수식오류 #REF!, 8월 헤더 오타 '오오' 확인 필요)"},
        {"file": "6월 월간보고", "report_month": "2026-06",
         "reliability": "파일 없음(사용자 확인: 파일 오류로 삭제됨) - 6월은 모든 화면에서 '보고서 누락'으로 표시"},
        {"file": "내부_골든위크_7월_260701-260731.xlsx (2026-09-04 추가)", "report_month": "N/A(이벤트 페이지 일별 로그)",
         "reliability": "높음(evidence A, xlsx 전사 응모 집계와 교차검증 완료 - 오차 1명 이내)"},
        {"file": "내부_11시콘서트_8월_신사들의오페라_260715-260731.xlsx (2026-09-04 추가)", "report_month": "N/A(이벤트 페이지 일별 로그)",
         "reliability": "높음(evidence A, xlsx 전사 응모 집계와 교차검증 완료)"},
        {"file": "카카오_7월 골든위크__1~4차 xls 12개 (2026-09-04 추가)", "report_month": "N/A(카카오 채널 발송 로그)",
         "reliability": "높음(evidence A, 단 채널 발송 로그와 이벤트 페이지 실측치는 정의가 달라 직접 합산 비교 금지)"},
        {"file": "카카오_불꽃어워즈_1~4차 xls 12개 (2026-09-04 추가)", "report_month": "N/A(카카오 채널 발송 로그)",
         "reliability": "높음(evidence A, 7월 터치어워즈 실제 시행 사실을 새로 확인시켜줌 - 참여 성과 자체는 미확인)"},
        {"file": "카카오_11시콘서트_와이드이미지형/카탈로그형 xls 6개 (2026-09-04 추가)", "report_month": "N/A(카카오 채널 발송 로그)",
         "reliability": "높음(evidence A, 채널 한정 수치)"},
    ]

    audit = {
        "generated_at_note": "이 파일은 build_data.py 실행 시점의 원본 재분석 결과이며, 새 보고서 추가 시 재생성됨",
        "1_file_list": [f["file"] for f in files],
        "2_report_months": ["2026-02", "2026-03", "2026-04", "2026-05", "2026-07"],
        "3_actual_event_months_seen": sorted(set(e["event_month"] for e in events_rows)),
        "4_promotion_names": sorted(set(e["event_name"] for e in events_rows)),
        "5_available_performance_metrics": [
            "월별 전사 GA 접속자 수(xlsx, monthly_kpi.csv)",
            "월별 전사 고객터치 발송 건수(합계/이벤트/뉴스레터/터치콘텐츠, xlsx)",
            "월별 발송 GA Agt. unique 수(xlsx)",
            "월별 수신 고객 unique 수(xlsx)",
            "월별 고객 응모(합계/계약고객/잠재고객, xlsx, 2024-11~2026-07)",
            "8월 프로모션별 계획: 총 당첨 인원, 총 경품 예산(7월 보고서 표, A등급)",
            "[2026-09-04 추가] 골든위크 2026-07 실제 참여자(응모) 수 43,097명, 방문/클릭 73,971건, 수신고객 82,076명 "
            "(내부 로그, evidence A, xlsx 전사 집계와 교차검증됨)",
            "[2026-09-04 추가] 11시콘서트 8월 공연 응모자 수 1,160명(2026-07-15~07-31 응모 기간, 내부 로그, evidence A)",
            "[2026-09-04 추가] 골든위크·불꽃어워즈(터치어워즈)·11시콘서트 카카오톡 채널(GA/라이프랩/한금서) 발송 로그 - "
            "노출수/클릭수 확보(evidence A, 채널 한정 참고 지표, 전사 방문자 수와 혼동 금지)",
        ],
        "6_available_benefit_info": [
            "8월 계획 5개 프로모션의 메인/서브 경품명, 일부 단가, 총 당첨인원/총예산(7월 보고서 표)",
            "2~5월 보고서에는 경품이 '제안/코멘트' 수준으로만 언급되고 확정 지급 내역(단가·인원)은 대부분 미기재",
        ],
        "7_missing_fields": [
            "미션 달성자 수, 공유 수는 여전히 전 기간 공통 누락 (내부 로그도 '응모/방문' 단계까지만 있고 미션 완료 여부는 담고 있지 않음)",
            "터치어워즈(불꽃어워즈) 2026-07의 실제 참여자 수 - 카카오 채널 발송 로그로 '시행 사실'은 확인됐으나 참여자 수를 담은 내부 파일은 제공되지 않아 여전히 확인 필요",
            "4월·5월 보고서의 개별 이벤트명 원문 텍스트 근거(대신 사용자 제공 목록 사용, review_required=True) - 아직 미해결",
            "지방문화혜택(광주/부산 등) 미션 달성 인원 수치 - 사용자가 언급한 '광주 175명·부산 359명'을 포함해 "
            "제공된 원본 텍스트·이미지·2026-09-04 추가 파일 어디에서도 확인되지 않음 (원본 재확인 필요, 아직 미해결)",
            "'전월 대비 약 2배 증가'라는 정성 평가 문구도 제공된 원본 어디에서도 검색되지 않음(원본 재확인 필요, 아직 미해결)",
            "[해결됨, 참고] 이벤트별 참여자(응모) 수·방문자 수 - 골든위크 2026-07, 11시콘서트 8월 공연(응모 기간)은 "
            "2026-09-04 추가된 내부 로그로 확인됨. 다른 이벤트(터치어워즈, 설계지원팀장, 원시트 등)는 여전히 누락.",
        ],
        "8_unit_or_extraction_errors": [
            "7월 보고서 표: 11시콘서트 총 당첨 인원이 '30ㅈ'로 기재 - 텍스트 추출 오류 의심, 숫자로 자동 확정하지 않고 확인 필요 처리",
            "xlsx '2-3월별수신고객' 표의 2026-08 컬럼 헤더가 '오오'로 표기(정상값 '8' 추정) - 확인 필요",
            "xlsx GA 접속자 표의 2026-09~12 값이 '#REF!' (수식 참조 오류) - null 처리",
            "[2026-09-04 발견 / 2026-09-05 해결] 골든위크 내부 로그의 '발송수' 합계(84,989건, 2026-07)가 xlsx 전사 "
            "집계의 동월 '이벤트' 터치발송 건수(6,657건)와 약 12.8배 차이 - 두 수치의 정의가 다른 것으로 보임. "
            "사용자 결정에 따라 최초 업로드 파일인 xlsx 기준 값(6,657건)을 touch_send_count로 채택하고, 내부 로그 "
            "수치는 채택하지 않음. 단 xlsx의 '이벤트' 카테고리 자체가 골든위크+11시콘서트 합산치라 골든위크 단독 "
            "값이 아닐 수 있다는 점은 여전히 확인 필요로 남김(performance.csv 해당 행 note 참고).",
        ],
        "9_plan_vs_result_mixed_cases": [
            {"file": "7월 월간보고", "case": "report_month=2026-07 안에 event_month=2026-08 계획(plan) 5건이 포함됨 - 분리 처리함"},
            {"file": "5월 월간보고", "case": "report_month=2026-05 안에 event_month=2026-06 '영업부스트 패키지' 제작 리뷰(plan)가 포함됨 - 분리 처리함"},
            {"file": "3월 월간보고", "case": "SUMMARY 슬라이드가 '4월 광주 콘서트'로 명시 - report_month=2026-03, event_month=2026-04로 분리했으나 파일 자체가 4/2 작성이라 완전한 확정은 아님(확인 필요)"},
            {"file": "카카오_11시콘서트_*, 내부_11시콘서트_8월_신사들의오페라 (2026-09-04 추가)",
             "case": "8월 공연(신사들의오페라) 자체는 아직 미개최(plan)이나, 응모는 2026-07-15~07-31에 이미 완료되어 실제 응모자 수(evidence A)를 확보함 - event_id=2026-08_11CONCERT_PLAN의 data_status를 'plan'에서 'mixed'로 변경."},
            {"file": "카카오_불꽃어워즈_1~4차 (2026-09-04 추가)",
             "case": "7월 보고서에는 '터치어워즈' 7월 시행분에 대한 서술이 없고 8월 '앵콜' 계획만 있었으나, 카카오 채널 발송 로그가 2026-07-01부터 시작된 것을 확인해 실제로는 7월에 원래 시행분이 있었음이 새로 드러남 -> event_id=2026-07_TOUCHAWARDS를 신규 등록(동일 이벤트명 반복 시 별도 회차 관리 원칙 적용)."},
        ],
        "11_media_cross_check_2026-09-04": {
            "요약": "사용자가 추가 제공한 카카오 채널 발송 로그 12+12+6개, 내부 이벤트 페이지 로그 2개(총 32개 파일)를 "
                    "기존 대시보드 데이터와 교차검증함.",
            "검증_성공": [
                "골든위크(43,097명) + 11시콘서트 8월 응모(1,160명) = 44,257명 vs xlsx 전사 2026-07 고객응모 44,258명 (오차 1명)",
                "계약고객 응모: 28,706+990=29,696 vs xlsx 29,697 (오차 1명)",
                "잠재고객 응모: 14,391+170=14,561 vs xlsx 14,561 (정확히 일치)",
            ],
            "불일치_발견_및_해결": [
                "골든위크 내부 로그 '발송수' 84,989건 vs xlsx 전사 '이벤트' 터치발송 6,657건 - 정의 상이 추정. "
                "2026-09-05 사용자 결정: 최초 업로드 파일(xlsx) 기준인 6,657건을 touch_send_count로 채택. "
                "단 이 값은 골든위크+11시콘서트 합산치일 수 있어 완전한 골든위크 단독 수치는 아님(확인 필요 유지).",
            ],
            "신규_확인된_사실": [
                "터치어워즈(불꽃어워즈)는 8월 '앵콜' 이전에 2026-07-01부터 이미 시행되고 있었음(event_id=2026-07_TOUCHAWARDS로 신규 등록)",
                "11시콘서트 8월 공연('신사들의오페라')의 응모 기간은 2026-07-15~07-31이며, 이 기간 응모자 수는 1,160명",
            ],
            "여전히_스킵한_항목": [
                "카카오 채널(GA/라이프랩/한금서)별 발송수 그 자체는 회차마다 채널 전체 재발송 성격이라(예: GA 채널 매 회차 약 8.5~8.6만 건) 순수 발송량으로 합산하면 의미가 왜곡되므로, 발송수는 KPI로 채택하지 않고 노출수/클릭수만 참고 지표로 사용함",
                "설계지원팀장, 원시트/소식지 등 나머지 이벤트는 이번에 추가된 파일에 해당 데이터가 없어 그대로 확인 필요 유지",
            ],
        },
        "10_file_reliability": files,
        "xlsx_raw_flags": xlsx_meta,
        "counts": {
            "events": len(events_rows), "benefits": len(benefits_rows),
            "performance_rows": len(performance_rows), "insights": len(insights_rows),
            "events_review_required": sum(1 for e in events_rows if str(e["review_required"]).lower() == "true"),
        },
    }
    with open(OUT / "data_audit.json", "w", encoding="utf-8") as f:
        json.dump(audit, f, ensure_ascii=False, indent=2)
    print(f"  -> {(OUT / 'data_audit.json').relative_to(BASE)}")


def build_data_dictionary():
    content = """# 데이터 사전 (Data Dictionary)

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
"""
    (OUT / "data_dictionary.md").write_text(content, encoding="utf-8")
    print(f"  -> {(OUT / 'data_dictionary.md').relative_to(BASE)}")


if __name__ == "__main__":
    main()
