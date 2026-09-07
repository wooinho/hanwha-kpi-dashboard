# -*- coding: utf-8 -*-
"""
1) 내부_*.xlsx (이벤트 페이지 일별 실측치) -> 캠페인별 월 합계 산출
2) 카카오_*.xls (카카오톡 채널 메시지 발송/노출/클릭 통계) -> 캠페인별 채널 발송분 합계 산출
   (전사 발송 집계(xlsx 월별주요지표)와는 별개 채널 데이터이므로 직접 합산/대체하지 않고
    별도 참고 지표로만 집계한다 - 정의가 다를 수 있어 임의로 일치시키지 않음)

결과를 콘솔에 출력하고 data/processed/media_cross_check.json 으로 저장한다.
"""
import json
from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "data" / "raw" / "media_reports"
OUT = BASE / "data" / "processed" / "media_cross_check.json"


def sum_internal_file(path: Path) -> dict:
    df = pd.read_excel(path, engine="openpyxl")
    df.columns = [str(c).strip() for c in df.columns]
    numeric_cols = [c for c in df.columns if c != "기준일자"]
    totals = {c: int(df[c].sum()) for c in numeric_cols}
    totals["일수"] = len(df)
    totals["기간"] = f"{df['기준일자'].min()} ~ {df['기준일자'].max()}"
    return totals


def find_col(columns, *keywords):
    for c in columns:
        name = str(c).replace(" ", "")
        for kw in keywords:
            if kw.replace(" ", "") in name:
                return c
    return None


def sum_kakao_file(path: Path) -> dict | None:
    engine = "xlrd" if path.suffix.lower() == ".xls" else "openpyxl"
    xls = pd.ExcelFile(path, engine=engine)
    sheet = xls.sheet_names[0]
    raw = xls.parse(sheet, header=None)

    # 헤더 행 탐색: '집계일시' 또는 '기준일자'가 포함된 행을 헤더로 사용
    header_row_idx = None
    for i in range(min(5, len(raw))):
        row_vals = [str(v) for v in raw.iloc[i].tolist()]
        if any("집계일" in v or "기준일" in v for v in row_vals):
            header_row_idx = i
            break
    if header_row_idx is None:
        return None

    df = xls.parse(sheet, header=header_row_idx)
    df.columns = [str(c).strip() for c in df.columns]
    date_col = find_col(df.columns, "집계일", "기준일")
    send_col = find_col(df.columns, "발송수")
    impression_col = find_col(df.columns, "노출수")
    click_col = find_col(df.columns, "전체클릭수", "전체 클릭수")

    if date_col is None:
        return None

    df = df[df[date_col].notna()]
    result = {
        "행수": len(df),
        "기간": f"{df[date_col].min()} ~ {df[date_col].max()}",
    }
    if send_col:
        result["발송수_합계"] = int(pd.to_numeric(df[send_col], errors="coerce").fillna(0).sum())
    if impression_col:
        result["노출수_합계"] = int(pd.to_numeric(df[impression_col], errors="coerce").fillna(0).sum())
    if click_col:
        result["전체클릭수_합계"] = int(pd.to_numeric(df[click_col], errors="coerce").fillna(0).sum())
    return result


def main():
    report = {}
    for campaign_dir in sorted(RAW.iterdir()):
        if not campaign_dir.is_dir():
            continue
        campaign = campaign_dir.name
        report[campaign] = {"internal": {}, "kakao_channel_rounds": {}}

        for f in sorted(campaign_dir.glob("*.xlsx")):
            print(f"[내부 실측] {campaign} / {f.name}")
            try:
                report[campaign]["internal"][f.name] = sum_internal_file(f)
            except Exception as e:
                print(f"  !! FAILED: {e}")
                report[campaign]["internal"][f.name] = {"error": str(e)}

        kakao_total = {"발송수_합계": 0, "노출수_합계": 0, "전체클릭수_합계": 0}
        for f in sorted(campaign_dir.glob("*.xls")):
            try:
                res = sum_kakao_file(f)
                report[campaign]["kakao_channel_rounds"][f.name] = res
                if res:
                    for k in kakao_total:
                        kakao_total[k] += res.get(k, 0)
                print(f"[카카오 채널] {campaign} / {f.name} -> {res}")
            except Exception as e:
                print(f"  !! FAILED: {f.name}: {e}")
                report[campaign]["kakao_channel_rounds"][f.name] = {"error": str(e)}
        report[campaign]["kakao_channel_total_all_rounds"] = kakao_total

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\n저장: {OUT}")


if __name__ == "__main__":
    main()
