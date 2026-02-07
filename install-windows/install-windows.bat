@echo off
REM ========================================
REM REDitors Voice-to-Text PRO v2.0
REM Enhanced Installer for Adobe Premiere Pro
REM ========================================

echo.
echo ========================================
echo  REDitors Voice-to-Text PRO v2.0
echo  Professional Transcription Plugin
echo ========================================
echo.

REM Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] This installer must be run as Administrator!
    echo.
    echo Please right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo [OK] Running with Administrator privileges
echo.

REM Set installation path
set INSTALL_PATH=C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\REDitors-VoiceToText-PremierePro

echo Installing to: %INSTALL_PATH%
echo.

REM Create directory if it doesn't exist
if not exist "%INSTALL_PATH%" (
    echo [STEP 1/4] Creating installation directory...
    mkdir "%INSTALL_PATH%"
    echo [OK] Directory created
) else (
    echo [STEP 1/4] Installation directory exists
    echo [WARNING] Existing installation found - will be overwritten
)
echo.

REM Copy files
echo [STEP 2/4] Copying plugin files...
xcopy /E /I /Y "%~dp0*.*" "%INSTALL_PATH%"

if %errorLevel% NEQ 0 (
    echo [ERROR] Failed to copy files!
    pause
    exit /b 1
)
echo [OK] Files copied successfully
echo.

REM Enable CEP debug mode
echo [STEP 3/4] Enabling CEP debug mode...
reg add HKEY_CURRENT_USER\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

if %errorLevel% EQU 0 (
    echo [OK] Debug mode enabled
) else (
    echo [WARNING] Could not enable debug mode - may need manual configuration
)
echo.

REM Create desktop shortcut (optional)
echo [STEP 4/4] Finalizing installation...
echo [OK] Installation complete!
echo.

echo ========================================
echo  Installation Successful!
echo ========================================
echo.
echo NEXT STEPS:
echo.
echo 1. Configure API Key
echo    Open: %INSTALL_PATH%\js\main.js
echo    Edit line 15 with your OpenAI API key
echo.
echo 2. Restart Premiere Pro
echo    Close Premiere Pro completely and reopen
echo.
echo 3. Access Plugin
echo    Window ^> Extensions ^> REDitors Voice-to-Text PRO
echo.
echo 4. Read Documentation
echo    See README.md for complete guide
echo.
echo ========================================
echo.
echo Installation Directory:
echo %INSTALL_PATH%
echo.
echo For support, check the comprehensive README.md
echo.
pause