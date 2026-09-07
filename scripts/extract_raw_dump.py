"""
1차 원문 덤프 스크립트 (감사용).
data/raw 의 모든 pptx/xlsx 파일에서 텍스트/표를 슬라이드·시트·페이지 번호와 함께
data/processed/_raw_dump/ 아래 텍스트 파일로 뽑아낸다.
- 최종 정제 스키마(events/benefits/performance/insights)를 만들기 전, 사람이 실제 원문을
  눈으로 확인하고 감사하기 위한 중간 산출물이다. 숫자를 여기서 임의로 가공하지 않는다.
"""
import sys
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "data" / "raw"
REF = BASE / "data" / "reference"
OUT = BASE / "data" / "processed" / "_raw_dump"
OUT.mkdir(parents=True, exist_ok=True)


def dump_pptx(path: Path, out_path: Path):
    from pptx import Presentation
    from pptx.util import Emu

    prs = Presentation(str(path))
    lines = []
    for i, slide in enumerate(prs.slides, start=1):
        lines.append(f"\n===== SLIDE {i} =====")
        for shape in slide.shapes:
            # 텍스트 프레임
            if shape.has_text_frame and shape.text_frame.text.strip():
                lines.append(f"[TEXT] {shape.text_frame.text.strip()}")
            # 표
            if shape.has_table:
                tbl = shape.table
                lines.append("[TABLE]")
                for r_idx, row in enumerate(tbl.rows):
                    cells = [c.text.strip().replace("\n", " / ") for c in row.cells]
                    lines.append(f"  row{r_idx}: " + " | ".join(cells))
            # 차트 (제목만이라도)
            if shape.has_chart:
                try:
                    chart = shape.chart
                    lines.append(f"[CHART] type={chart.chart_type}")
                    for series in chart.series:
                        vals = list(series.values)
                        lines.append(f"  series={series.name} values={vals}")
                    try:
                        cats = list(chart.plots[0].categories)
                        lines.append(f"  categories={cats}")
                    except Exception:
                        pass
                except Exception as e:
                    lines.append(f"[CHART] (read error: {e})")
        # 노트
        if slide.has_notes_slide:
            note = slide.notes_slide.notes_text_frame.text.strip()
            if note:
                lines.append(f"[NOTES] {note}")
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> {out_path} ({len(lines)} lines)")


def dump_xlsx(path: Path, out_path: Path):
    import openpyxl

    wb = openpyxl.load_workbook(str(path), data_only=True)
    lines = []
    for ws in wb.worksheets:
        lines.append(f"\n===== SHEET: {ws.title} (dims={ws.dimensions}) =====")
        for row in ws.iter_rows():
            vals = []
            any_val = False
            for cell in row:
                v = cell.value
                if v is not None:
                    any_val = True
                vals.append("" if v is None else str(v))
            if any_val:
                lines.append(f"R{row[0].row}: " + " | ".join(vals))
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> {out_path} ({len(lines)} lines)")


def main():
    targets = []
    for p in sorted(RAW.glob("*.pptx")):
        targets.append(("pptx", p))
    for p in sorted(RAW.glob("*.xlsx")):
        targets.append(("xlsx", p))
    for p in sorted(REF.glob("*.pptx")):
        targets.append(("pptx", p))

    for kind, p in targets:
        safe_name = p.stem.replace(" ", "_")
        out_path = OUT / f"{safe_name}.txt"
        print(f"[{kind}] {p.name}")
        try:
            if kind == "pptx":
                dump_pptx(p, out_path)
            else:
                dump_xlsx(p, out_path)
        except Exception as e:
            print(f"  !! FAILED: {e}")
            out_path.write_text(f"EXTRACTION FAILED: {e}", encoding="utf-8")


if __name__ == "__main__":
    main()
