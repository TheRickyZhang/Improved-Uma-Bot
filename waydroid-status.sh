#!/bin/bash
# Quick status check for Waydroid + ADB

echo "=== Waydroid ==="
waydroid status 2>&1

echo ""
echo "=== ADB Devices ==="
adb devices 2>&1

echo ""
echo "=== CPU Governor ==="
powerprofilesctl get 2>/dev/null || cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null
