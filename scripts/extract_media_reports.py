# -*- coding: utf-8 -*-
"""
신규 추가된 카카오 광고 리포트(.xls, 레거시 바이너리) + 내부 실적 파일(.xlsx)을
data/processed/_raw_dump/media/ 아래 텍스트로 덤프한다 (감사/검토용 1차 산출물).
"""
import pandas as pd
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "data" / "raw" / "media_reports"
OUT = BASE / "data" / "processed" / "_raw_dump" / "media"
OUT.mkdir(parents=True, exist_ok=True)


def dump_excel(path: Path, out_path: Path):
    engine = "xlrd" if path.suffix.lower() == ".xls" else "openpyxl"
    xls = pd.ExcelFile(path, engine=engine)
    lines = []
    for sheet in xls.sheet_names:
        df = xls.parse(sheet, header=None)
        lines.append(f"\n===== SHEET: {sheet} (shape={df.shape}) =====")
        # 상위 60행만 (헤더/요약 구간 확인용), 그 이후는 데이터 성격 파악되면 별도 처리
        for i, row in df.head(80).iterrows():
            vals = [("" if pd.isna(v) else str(v)) for v in row.tolist()]
            if any(v.strip() for v in vals):
                lines.append(f"R{i}: " + " | ".join(vals))
        if len(df) > 80:
            lines.append(f"... ({len(df) - 80} more rows)")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> {out_path} ({len(lines)} lines, {len(xls.sheet_names)} sheets)")


def main():
    for campaign_dir in sorted(RAW.iterdir()):
        if not campaign_dir.is_dir():
            continue
        out_dir = OUT / campaign_dir.name
        out_dir.mkdir(parents=True, exist_ok=True)
        for f in sorted(campaign_dir.glob("*")):
            if f.suffix.lower() not in (".xls", ".xlsx"):
                continue
            print(f"[{campaign_dir.name}] {f.name}")
            out_path = out_dir / f"{f.stem}.txt"
            try:
                dump_excel(f, out_path)
            except Exception as e:
                print(f"  !! FAILED: {e}")
                out_path.write_text(f"EXTRACTION FAILED: {e}", encoding="utf-8")


if __name__ == "__main__":
    main()
