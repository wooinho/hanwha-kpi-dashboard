@echo off
REM 데이터/코드를 수정한 뒤 이 파일을 더블클릭하면:
REM   1) scripts/build_data.py 재실행 (원본이 바뀐 경우 CSV 재생성)
REM   2) Next.js 정적 export 재빌드
REM   3) docs/ 갱신
REM   4) 커밋 + GitHub push (같은 링크로 자동 재배포됨)
setlocal
cd /d "%~dp0"

echo [1/4] 데이터 재생성 중...
python scripts\build_data.py
if errorlevel 1 goto :error

echo [2/4] Next.js 정적 빌드 중 (GitHub Pages 하위 경로 적용)...
cd app
set GITHUB_PAGES=true
call npm run build
set GITHUB_PAGES=
if errorlevel 1 goto :error
cd ..

echo [3/4] docs/ 갱신 중...
rmdir /s /q docs 2>nul
mkdir docs
xcopy /e /i /y app\out\* docs\ >nul
type nul > docs\.nojekyll

echo [4/4] GitHub에 반영 중...
git add -A
git commit -m "대시보드 갱신"
git push

echo 완료! https://wooinho.github.io/hanwha-kpi-dashboard/ 에 몇 분 내 반영됩니다.
goto :eof

:error
echo 오류가 발생했습니다. 위 로그를 확인하세요.
exit /b 1
