#!/bin/bash
# Stop Waydroid and disconnect ADB

echo "Disconnecting ADB..."
adb disconnect 2>/dev/null

echo "Stopping Waydroid session..."
waydroid session stop 2>/dev/null

echo "Cleaning up network rules..."
sudo iptables -D FORWARD -i waydroid0 -j ACCEPT 2>/dev/null || true
sudo iptables -D FORWARD -o waydroid0 -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null || true
sudo iptables -t nat -D POSTROUTING -s 192.168.240.0/24 ! -o waydroid0 -j MASQUERADE 2>/dev/null || true

echo "Done."
