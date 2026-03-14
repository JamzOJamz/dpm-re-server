@echo off
setlocal enabledelayedexpansion

set "PKG="
set "FILE="
set "REALM_FLAG="
set "KILL_APP=false"

:parse_args
if "%~1"=="" goto check_args

if "%~1"=="--emulated" (
    set "REALM_FLAG=--realm=emulated"
    shift
    goto parse_args
)
if "%~1"=="--kill" (
    set "KILL_APP=true"
    shift
    goto parse_args
)
if "%~1"=="-e" (
    set "REALM_FLAG=--realm=emulated"
    shift
    goto parse_args
)
if "%~1"=="-k" (
    set "KILL_APP=true"
    shift
    goto parse_args
)
if "%~1"=="-p" (
    set "PKG=%~2"
    shift
    shift
    goto parse_args
)
if "%~1"=="-l" (
    set "FILE=%~2"
    shift
    shift
    goto parse_args
)

echo Unknown argument: %~1
goto usage

:check_args
if "%PKG%"=="" goto usage
if "%FILE%"=="" goto usage
goto main

:usage
echo Usage: %~nx0 -p ^<package^> -l ^<frida_script^> [-e^|--emulated] [-k^|--kill]
exit /b 1

:main

:: Get launcher activity - pipe command into su to avoid quoting issues
for /f "tokens=*" %%a in ('adb shell "echo cmd package resolve-activity --brief %PKG% | su"') do (
    set "activity=%%a"
)
:: for /f already strips CR - no manual strip needed
echo [+] Activity: !activity!

:: Kill app if requested
if "!KILL_APP!"=="true" (
    echo [+] Killing existing app process...
    adb shell "echo am force-stop %PKG% | su"
    timeout /t 1 /nobreak >nul
)

:: Start app
adb shell "echo am start -n !activity! | su"

:: Wait until process appears
echo [+] Waiting for process...
set "pid="
:wait_loop
for /f "tokens=*" %%p in ('adb shell "echo pidof %PKG% | su"') do (
    set "pid=%%p"
)

if not defined pid (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)
if "!pid!"=="" (
    timeout /t 1 /nobreak >nul
    goto wait_loop
)

echo [+] PID: !pid!

:: Attach frida
frida -U -p !pid! -l "%FILE%" %REALM_FLAG%