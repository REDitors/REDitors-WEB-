#!/bin/bash

# ========================================
# REDitors Voice-to-Text PRO v2.0
# Enhanced Installer for Adobe Premiere Pro
# ========================================

echo ""
echo "========================================"
echo " REDitors Voice-to-Text PRO v2.0"
echo " Professional Transcription Plugin"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "[ERROR] Please run this installer with sudo"
    echo ""
    echo "Usage: sudo bash install-macos.sh"
    echo ""
    exit 1
fi

echo "[OK] Running with administrator privileges"
echo ""

# Set installation path
INSTALL_PATH="/Library/Application Support/Adobe/CEP/extensions/REDitors-VoiceToText-PremierePro"

echo "Installing to: $INSTALL_PATH"
echo ""

# Create directory if it doesn't exist
if [ ! -d "$INSTALL_PATH" ]; then
    echo "[STEP 1/4] Creating installation directory..."
    mkdir -p "$INSTALL_PATH"
    echo "[OK] Directory created"
else
    echo "[STEP 1/4] Installation directory exists"
    echo "[WARNING] Existing installation found - will be overwritten"
fi
echo ""

# Copy files
echo "[STEP 2/4] Copying plugin files..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp -R "$SCRIPT_DIR/"* "$INSTALL_PATH/"

if [ $? -eq 0 ]; then
    echo "[OK] Files copied successfully"
else
    echo "[ERROR] Failed to copy files!"
    exit 1
fi
echo ""

# Set permissions
echo "[STEP 3/4] Setting permissions..."
chmod -R 755 "$INSTALL_PATH"
echo "[OK] Permissions set"
echo ""

# Enable CEP debug mode
echo "[STEP 4/4] Enabling CEP debug mode..."
defaults write com.adobe.CSXS.11 PlayerDebugMode 1

if [ $? -eq 0 ]; then
    echo "[OK] Debug mode enabled"
else
    echo "[WARNING] Could not enable debug mode"
fi
echo ""

echo "========================================"
echo " Installation Successful!"
echo "========================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Configure API Key"
echo "   Open: $INSTALL_PATH/js/main.js"
echo "   Edit line 15 with your OpenAI API key"
echo ""
echo "2. Restart Premiere Pro"
echo "   Close Premiere Pro completely and reopen"
echo ""
echo "3. Access Plugin"
echo "   Window → Extensions → REDitors Voice-to-Text PRO"
echo ""
echo "4. Read Documentation"
echo "   See README.md for complete guide"
echo ""
echo "========================================"
echo ""
echo "Installation Directory:"
echo "$INSTALL_PATH"
echo ""
echo "For support, check the comprehensive README.md"
echo ""