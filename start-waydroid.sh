#!/bin/bash
# Start Waydroid session, connect ADB, and update bot config with current IP

set -e

echo "Setting up network forwarding..."
sudo sysctl -q net.ipv4.ip_forward=1
# Allow Waydroid traffic past Docker's FORWARD DROP policy (iptables)
# Remove old rules first to avoid duplicates (ignore errors if they don't exist)
sudo iptables -D FORWARD -i waydroid0 -j ACCEPT 2>/dev/null || true
sudo iptables -D FORWARD -o waydroid0 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
sudo iptables -I FORWARD -i waydroid0 -j ACCEPT
sudo iptables -I FORWARD -o waydroid0 -m state --state RELATED,ESTABLISHED -j ACCEPT
# NAT masquerade so Waydroid containers can reach the internet
sudo iptables -t nat -C POSTROUTING -s 192.168.240.0/24 ! -o waydroid0 -j MASQUERADE 2>/dev/null || \
    sudo iptables -t nat -A POSTROUTING -s 192.168.240.0/24 ! -o waydroid0 -j MASQUERADE

echo "Starting Waydroid session..."
waydroid session start &
sleep 3

echo "Launching UI..."
waydroid show-full-ui &
sleep 2

# Wait for container IP (poll up to 30 seconds)
IP=""
for i in $(seq 1 15); do
    IP=$(waydroid status 2>/dev/null | grep "IP address" | awk '{print $NF}')
    if [ -n "$IP" ] && [ "$IP" != "UNKNOWN" ]; then
        break
    fi
    echo "Waiting for container network... ($i)"
    sleep 2
done
if [ -z "$IP" ] || [ "$IP" = "UNKNOWN" ]; then
    echo "ERROR: Could not get Waydroid IP after 30s"
    exit 1
fi
echo "Waydroid IP: $IP"

# Connect ADB
DEVICE="${IP}:5555"
adb connect "$DEVICE" 2>/dev/null
sleep 1

# Verify connection
if adb -s "$DEVICE" shell echo ok 2>/dev/null | grep -q ok; then
    echo "ADB connected to $DEVICE"
else
    echo "WARNING: ADB connection to $DEVICE failed, retrying..."
    adb kill-server && sleep 1 && adb start-server && sleep 1
    adb connect "$DEVICE"
fi

# Update bot config with current IP
CONFIG="$HOME/Games/umamusume-sweepy/config.yaml"
if [ -f "$CONFIG" ]; then
    sed -i "s/device_name: .*/device_name: $DEVICE/" "$CONFIG"
    echo "Updated config.yaml with device: $DEVICE"
fi

# Kill Google bloat that eats CPU
echo "Killing background bloat..."
adb -s "$DEVICE" shell "am force-stop com.google.android.gms" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.google.android.googlequicksearchbox" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.android.vending" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.google.android.gm.exchange" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.google.android.syncadapters.calendar" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.google.android.setupwizard" 2>/dev/null
adb -s "$DEVICE" shell "am force-stop com.google.android.partnersetup" 2>/dev/null

# Disable them so they don't restart
adb -s "$DEVICE" shell "pm disable-user --user 0 com.google.android.googlequicksearchbox" 2>/dev/null
adb -s "$DEVICE" shell "pm disable-user --user 0 com.google.android.gm.exchange" 2>/dev/null
adb -s "$DEVICE" shell "pm disable-user --user 0 com.google.android.syncadapters.calendar" 2>/dev/null
adb -s "$DEVICE" shell "pm disable-user --user 0 com.google.android.setupwizard" 2>/dev/null
adb -s "$DEVICE" shell "pm disable-user --user 0 com.google.android.partnersetup" 2>/dev/null

echo ""
echo "Ready. Run the bot with: cd ~/Games/umamusume-sweepy && python3 main.py"
