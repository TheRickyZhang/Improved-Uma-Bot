#!/bin/bash
set -e
cd "$(dirname "$0")"

pick_python() {
    for py in python3.12 python3.11 python3.10 python3 python; do
        if ! command -v "$py" &>/dev/null; then
            continue
        fi
        version=$("$py" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || true)
        case "$version" in
            3.10|3.11|3.12|3.13)
                echo "$py"
                return 0
                ;;
        esac
    done
    return 1
}

PYTHON=$(pick_python || true)
if [ -z "$PYTHON" ]; then
    echo "Supported Python not found. Install Python 3.10-3.13."
    exit 1
fi

echo "Using $PYTHON"

if [ $# -gt 0 ]; then
    "$PYTHON" -m unittest "$@"
else
    "$PYTHON" -m unittest discover -s tests -p "test_*.py"
fi
