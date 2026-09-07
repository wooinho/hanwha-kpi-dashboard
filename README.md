# 한화생명 고객터치 시스템 KPI 대시보드 (MVP)

한화생명 고객터치 시스템의 월간 운영 결과보고서(pptx)와 월별 주요지표(xlsx)를 분석해,
**광고 매체 지표가 아니라 이벤트·혜택·참여 행동 중심**으로 다음 달 이벤트·혜택 기획을 지원하는
의사결정 도구입니다.

핵심 분석 단위: `월 → 프로모션 → 타깃 → 참여 조건 → 이벤트 장치 → 혜택 → 참여 결과 → 내부 KPI 기여 → 다음 달 제언`

---

## 0. 먼저 읽어야 할 것 — 이 데이터로 할 수 있는 것 / 없는 것

원본 pptx 5개를 직접 열어 텍스트·표·이미지를 확인한 결과, **이벤트별 참여자 수·미션 달성자 수·
공유 수 같은 정량 성과 지표는 대부분 원본 월간보고에 존재하지 않습니다.** 보고서 대부분은
디자인/기획 리뷰 슬라이드(화면 스크린샷 + 개선 코멘트)입니다. 초기 버전에서 성과 수치가 있던 곳은
`[고객터치 시스템] 월별 주요지표.xlsx`(월별 전사 집계)와 7월 보고서의 8월 계획 표뿐이었습니다.

**2026-09-04 업데이트**: 사용자가 카카오톡 채널 발송 로그 24개 + 이벤트 페이지 내부 실측 로그
2개(총 26개 파일)를 추가 제공해, 골든위크 2026-07과 11시콘서트 8월 공연(응모 기간)의 **실제
참여자(응모) 수를 확보하고 xlsx 전사 집계와 교차검증(오차 1명 이내로 일치)**했습니다. 터치어워즈는
7월에 실제 시행됐다는 사실이 카카오 채널 로그로 새로 확인됐지만 참여 성과 수치는 여전히 없습니다.
자세한 교차검증 결과는 [data/processed/data_audit.json](data/processed/data_audit.json)의
`11_media_cross_check_2026-09-04` 항목 참고.

그래도 여전히 미션 달성자 수·공유 수는 전 기간 공통 누락이고, 설계지원팀장·원시트/소식지 등은
정량 데이터가 전혀 없습니다. 그래서 이 대시보드는 "성과를 보여주는 대시보드"라기보다 "**지금
확보된 근거 수준을 정직하게 보여주고, 다음 달에 무엇을 추가로 측정해야 하는지 알려주는
대시보드**"에 가깝습니다. 모든 화면에서 근거 등급(A/B/C/D)을 명시하는 이유입니다.

---

## 1. 설치 방법

사전 요구사항: Node.js 20.9+ (Next.js 16 요구사항), Python 3.10+

```bash
# 1) Python 데이터 파이프라인 의존성
pip install python-pptx openpyxl pandas pypdf

# 2) Next.js 앱 의존성
cd app
npm install
```

## 2. 실행 방법

```bash
# 정제 데이터가 이미 data/processed/ 에 있다면 바로 대시보드만 실행
cd app
npm run dev
# http://localhost:3000 (또는 지정한 포트)
```

원본 파일을 바꾸지 않는 한 `scripts/build_data.py`를 다시 돌릴 필요는 없습니다.
정제 CSV/JSON은 이미 `data/processed/`에 생성되어 있고 앱은 이 파일들을 그대로 읽습니다.

## 3. 데이터 추가 방법 (신규 xlsx/csv 등)

1. 새 원본 파일을 `data/raw/`(공식 월간보고/지표) 또는 `data/reference/`(배경 자료)에 넣는다.
2. `python scripts/extract_raw_dump.py` 실행 → `data/processed/_raw_dump/*.txt`에 슬라이드/표
   텍스트가 그대로 뽑힌다. **이 결과를 사람이 직접 읽고 검수한다** (스크린샷 위주 문서라 자동
   파싱만으로는 이벤트명·수치를 신뢰할 수 없기 때문 — 0절 참고).
3. 검수한 내용을 `scripts/event_log.py`의 `EVENTS` 리스트에 이벤트 단위 딕셔너리로 추가한다.
   원본에 없는 값은 반드시 `None`으로 두고, 애매하면 `data_quality_status`에 "확인 필요"라고 적는다.
4. `python scripts/build_data.py` 재실행 → `events.csv / benefits.csv / performance.csv /
   insights.csv / monthly_kpi.csv / data_audit.json / data_dictionary.md`가 재생성된다.
5. 대시보드를 새로고침한다 (파일을 서버 컴포넌트가 직접 읽으므로 재배포 불필요, `npm run dev`
   재시작만 필요할 수 있음).

CSV 업로드 UI(화면6 데이터 품질 관리)는 브라우저에서 헤더/행 수를 미리 검증하는 용도이며,
실제 정제 파이프라인 반영은 위 4단계(`build_data.py`)를 통해서만 이뤄집니다(로컬 우선 원칙).

## 4. 월별 보고서 업데이트 방법

매월 반복되는 작업입니다.

1. 새 월간보고 pptx를 `data/raw/`에 추가 (예: `(wylie)한화생명 8월 월간보고_260905(F).pptx`)
2. `[고객터치 시스템] 월별 주요지표.xlsx`를 최신 버전으로 교체
3. 위 "데이터 추가 방법" 2~5단계 수행
4. `data/processed/data_audit.json`의 `10_file_reliability`, `7_missing_fields` 등을 다시 확인하고
   신규 이슈(단위 오류, 계획/결과 혼재 등)가 있으면 `scripts/build_data.py`의 감사 섹션에도 반영

## 5. 데이터 스키마

`data/processed/data_dictionary.md`에 전체 필드 설명이 있습니다. 요약:

- **events.csv**: 이벤트(회차) 1행. `report_month`(보고월) ≠ `event_month`(진행월)일 수 있음,
  `data_status`(plan/result/mixed/확인 필요)로 계획·결과 구분.
- **benefits.csv**: 이벤트 1건에 여러 혜택(N:1). `benefit_tier`(main/sub/entry 등), 개별 항목 수치가
  없고 총계만 있는 경우 `benefit_type='합계'` 행으로 별도 기록.
- **performance.csv**: 정량 성과(A/B)와 정성 리뷰·가설(C/D)이 같은 표에 있지만 `evidence_type`으로
  구분. **UI에서는 A/B만 "성과 데이터"로, C/D는 "인사이트/가설"로 다른 색상/영역에 표시**.
- **insights.csv**: `관찰된 사실 → 해석 → 한계 → 다음 달 가설 → 검증 KPI` 구조.
- **monthly_kpi.csv**: xlsx의 월별 전사 집계(GA접속자/터치발송/고객응모). 특정 이벤트로 귀속시키지
  않음(여러 이벤트가 합산된 값이라 오귀속 방지).

## 6. KPI 계산식

값이 없거나 분모가 0이면 계산하지 않고 `N/A`를 반환합니다(0으로 표시하지 않음). 구현: `app/src/lib/calc.ts`.

| 지표 | 계산식|
|---|---|
| 참여율 | 참여자 수 ÷ 이벤트 방문자 수 |
| 미션 달성률 | 미션 달성자 수 ÷ 참여자 수 |
| 공유율 | 공유 수 ÷ 참여자 수 |
| 평균 혜택 비용 | 총 경품 예산 ÷ 총 당첨 인원 |
| 참여자당 비용 | 총 경품 예산 ÷ 참여자 수 |
| 미션 달성자당 비용 | 총 경품 예산 ÷ 미션 달성자 수 |
| 전 회차 증감률 | (현재값 − 비교값) ÷ 비교값 × 100 |

테스트: `app/tests/calc.test.ts`(계산식), `app/tests/aggregate.test.ts`(N/A 합계),
`app/tests/filters.test.ts`(계획/결과 분리, 검수 필요 필터).

```bash
cd app
npm test
```

## 7. 확인 필요 데이터 (원본 재확인 필요)

- 이벤트별 참여자 수 / 미션 달성자 수 / 공유 수 / 노출·방문자 수 — 전 기간 공통 누락
- 4월·5월 보고서 개별 이벤트명 — 원문 텍스트로 확인 불가(슬라이드가 거의 전량 이미지),
  사용자 제공 목록으로 등록했으며 `review_required=true`
- **광주 미션 달성 175명 / 부산 미션 달성 359명 / "전월 대비 약 2배 증가"** — 제공된 6개 원본
  파일의 텍스트·표·샘플링한 이미지 어디에서도 확인되지 않음
- 7월 보고서 표의 11시콘서트 총 당첨 인원 `"30ㅈ"` — 텍스트 추출 오류 의심, 숫자로 임의 확정하지 않음
- xlsx `2-3월별수신고객` 표 2026-08 컬럼 헤더 `"오오"` — 오타 의심(정상값 "8" 추정)
- 3월 보고서의 "4월 광주 콘서트"가 실제로 report_month=2026-03 / event_month=2026-04로 맞게
  분리된 것인지 — 원본 확인 필요(파일 자체가 4/2 작성이라 완전히 확정하지 않음)

전체 목록: [data/processed/data_audit.json](data/processed/data_audit.json)

## 8. 현재 분석의 한계

- **상관관계 ≠ 인과관계**: 통제군·동일 조건 비교가 없는 관찰은 "영향을 주었다"가 아니라
  "성과와 함께 관찰됐다"로만 서술했습니다(화면4 상세 진단의 "해석" 영역).
- **정량 데이터 확보율이 여전히 낮습니다** (카테고리별 0~33% 수준, 화면6 참고). 대부분의 "성과"는
  정성 리뷰(evidence C)이며 숫자로 점수화하지 않았습니다. 2026-09-04 추가 데이터로 골든위크·
  11시콘서트는 개선됐으나 설계지원팀장·원시트/소식지·지방문화혜택은 여전히 0%입니다.
- 4월·5월 이벤트명은 사용자 제공 정보에 의존하므로, 원본 슬라이드 이미지를 육안으로 재검수하는
  것을 권장합니다.
- 예측 모델은 탑재하지 않았습니다(화면5 플래너는 과거 근거 재구성만 제공, "예상 참여자 수" 같은
  임의 수치를 생성하지 않음).
- 6월은 pptx 보고서가 없지만 xlsx 누적 집계에는 남아있어 화면3 트렌드에 표시하되, 다른 달 대비
  수치가 낮아 실제 저조인지 부분 집계인지 확인이 필요합니다.

---

## 9. 기술 구성 및 선택 이유

- **Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS**: 요청된 권장 스택. shadcn/ui
  CLI 대신 Tailwind 기반 자체 UI 프리미티브(Card/Badge/KpiCard 등)를 직접 구현했습니다
  (인터넷 연결·컴포넌트 레지스트리 없이도 로컬에서 완결되도록 하기 위함).
- **Recharts / TanStack Table v8 / Zod / PapaParse / lucide-react**: 요청된 스택 그대로 사용.
- **데이터 저장 = 정제 CSV + JSON (DuckDB/SQLite 대신)**: 이벤트 25건, 혜택 16건 수준의 소규모
  MVP 데이터셋이라 DB 도입 비용 대비 이점이 적고, CSV는 (a) 사람이 Excel로 열어 바로 검수할 수
  있고 (b) Git으로 변경 이력을 추적하기 쉬우며 (c) 별도 서버/드라이버 없이 Next.js 서버 컴포넌트가
  `fs.readFileSync`로 즉시 읽을 수 있습니다. 데이터가 수백~수천 행 이상으로 커지면 DuckDB로
  전환을 권장합니다.
- **로컬 우선**: 대시보드는 외부 API를 호출하지 않고, 모든 데이터는 `data/processed/`의 로컬
  파일에서만 옵니다.

## 9-1. 배포 (GitHub Pages)

- **배포 URL**: https://wooinho.github.io/hanwha-kpi-dashboard/
- **저장소**: https://github.com/wooinho/hanwha-kpi-dashboard (⚠️ Public — 이 대시보드에 표시되는 참여자 수·예산
  등 한화생명 캠페인 내부 수치가 공개 웹에 노출됩니다. 사용자 확인 후 진행됨)
- **구조**: Next.js `output: 'export'`로 완전 정적 사이트를 빌드해 `docs/` 폴더에 넣고, GitHub Pages
  설정을 `main` 브랜치 `/docs` 경로로 지정. 서버가 없으므로 별도 호스팅 비용·유지보수가 없음.
- **저장소에는 올리지 않은 것**: `data/raw/`(원본 pptx/xlsx), `data/reference/`(178MB 제안서 pptx),
  `data/processed/_raw_dump/`(원문 텍스트 덤프), `.claude/`(다른 클라이언트 프로젝트 로컬 경로 포함) —
  `.gitignore` 참고.
- **갱신 방법**: 데이터나 코드를 바꾼 뒤 `publish_to_github.bat`을 더블클릭하면
  `build_data.py` 재실행 → `npm run build`(정적 export) → `docs/` 갱신 → git commit/push까지
  자동으로 처리되어 같은 URL이 몇 분 내 갱신됩니다.
- **basePath**: `app/next.config.ts`는 환경변수 `GITHUB_PAGES=true`일 때만 `basePath`/`assetPrefix`를
  `/hanwha-kpi-dashboard`로 적용합니다. `publish_to_github.bat`이 빌드 시 이 변수를 자동으로 설정하므로,
  평소 `npm run dev`/`npm run build`는 하위 경로 없이 `http://localhost:3100/`에서 그대로 동작합니다.

## 10. 프로젝트 구조

```
한화생명_KPI대시보드/
├── data/
│   ├── raw/                # 원본 pptx/xlsx (월간보고, 월별 주요지표)
│   ├── reference/          # 배경 자료(사업 제안서 등, 이벤트 추출 대상 아님)
│   └── processed/          # 정제 CSV/JSON + _raw_dump(1차 텍스트 추출)
├── scripts/
│   ├── extract_raw_dump.py # pptx/xlsx -> 원문 텍스트/표 덤프 (자동)
│   ├── event_log.py        # 사람이 검수한 이벤트/혜택/리뷰 큐레이션
│   └── build_data.py       # event_log.py + xlsx -> 최종 CSV/감사 JSON
└── app/                    # Next.js 대시보드
    ├── src/app/{overview,matrix,trends,detail,planner,quality}/
    ├── src/lib/            # 타입, 데이터 로더, KPI 계산, 필터, 추천 로직
    └── tests/              # vitest 테스트
```
