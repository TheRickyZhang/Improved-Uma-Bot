#!/bin/bash
set -e
cd "$(dirname "$0")"

git pull --autostash -X ours --no-edit || true

if ! command -v adb &>/dev/null; then
    echo "adb not found. Install with: sudo pacman -S android-tools"
    exit 1
fi

if ! command -v python3.12 &>/dev/null; then
    PYTHON=$(command -v python3 || command -v python)
else
    PYTHON=python3.12
fi

if [ -z "$PYTHON" ]; then
    echo "Python not found."
    exit 1
fi

$PYTHON -m pip install -r requirements.txt --quiet

export UAT_AUTORESTART=1

$PYTHON bake_templates.py
$PYTHON main.py
