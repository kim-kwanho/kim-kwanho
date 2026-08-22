@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title 크리스마스 블레싱 서버
color 0A
echo ========================================
echo   크리스마스 블레싱 앱 서버 시작
echo ========================================
echo.

cd /d "%~dp0"
echo 현재 디렉토리: %CD%
echo.

if not exist "index.html" (
    echo 오류: index.html 파일을 찾을 수 없습니다.
    echo 현재 위치: %CD%
    pause
    exit /b 1
)

if not exist "app.js" (
    echo 오류: app.js 파일을 찾을 수 없습니다.
    echo 현재 위치: %CD%
    pause
    exit /b 1
)

echo [확인] 필요한 파일들이 존재합니다.
echo.

REM 로컬 IP 주소 확인
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP: =!"
    if "!LOCAL_IP!" neq "" (
        goto :ip_found
    )
)
:ip_found

if "!LOCAL_IP!"=="" set LOCAL_IP=알 수 없음

echo ========================================
echo   서버 접속 주소
echo ========================================
echo.
echo [로컬 접속]
echo   - 메인 앱: http://localhost:8000/index.html
echo.
echo [모바일/다른 기기 접속]
echo   같은 Wi-Fi 네트워크에 연결된 기기에서:
echo   - 메인 앱: http://!LOCAL_IP!:8000/index.html
echo.
echo ========================================
echo.
echo 서버를 시작합니다...
echo 종료하려면 Ctrl+C를 누르세요.
echo ========================================
echo.

REM 모든 네트워크 인터페이스에서 접근 가능하도록 설정
python -m http.server 8000 --bind 0.0.0.0

pause
