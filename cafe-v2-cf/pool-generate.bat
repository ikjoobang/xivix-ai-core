@echo off
REM ============================================
REM 이미지 풀 사전 생성 (매일 밤 22시 실행)
REM 25장 생성 - 다음날 발행용
REM ============================================
setlocal

set URL=https://cafe-auto-v2.pages.dev/api/pool-generate
set COUNT=25

echo [%date% %time%] 이미지 풀 사전 생성 시작 (%COUNT%장)

for /L %%i in (1,1,%COUNT%) do (
    echo [%%i/%COUNT%] 생성 중...
    C:\Windows\system32\curl.exe -s %URL%
    echo.
    if %%i LSS %COUNT% (
        timeout /t 15 /nobreak >nul
    )
)

echo [%date% %time%] 완료!
echo.

REM 풀 상태 확인
echo === 풀 현황 ===
C:\Windows\system32\curl.exe -s https://cafe-auto-v2.pages.dev/api/pool-status
echo.

pause
