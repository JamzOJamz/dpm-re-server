#!/bin/bash

REALM_FLAG=""
KILL_APP=false

# Convert long options to short ones
for arg in "$@"; do
    shift
    case "$arg" in
        --emulated) set -- "$@" "-e" ;;
        --kill) set -- "$@" "-k" ;;
        *) set -- "$@" "$arg" ;;
    esac
done

while getopts "p:l:ek" opt; do
  case $opt in
    p) PKG="$OPTARG" ;;
    l) FILE="$OPTARG" ;;
    e) REALM_FLAG="--realm=emulated" ;;
    k) KILL_APP=true ;;
    *) echo "Usage: $0 -p <package> -l <frida_script> [-e|--emulated] [-k|--kill]"; exit 1 ;;
  esac
done

if [ -z "$PKG" ] || [ -z "$FILE" ]; then
  echo "Usage: $0 -p <package> -l <frida_script> [-e|--emulated] [-k|--kill]"
  exit 1
fi

# Get launcher activity
activity=$(adb shell su -c "cmd package resolve-activity --brief $PKG" | tail -n 1 | tr -d '\r')

echo "[+] Activity: $activity"

# Kill app if requested
if [ "$KILL_APP" = true ]; then
    echo "[+] Killing existing app process..."
    adb shell su -c "am force-stop $PKG"
    sleep 1
fi

# Start app
adb shell su -c "am start -n $activity"

# Wait until process appears
echo "[+] Waiting for process..."
while true; do
    pid=$(adb shell su -c "pidof $PKG" | tr -d '\r')
    if [ -n "$pid" ]; then
        break
    fi
done

echo "[+] PID: $pid"

# Attach frida
frida -U -p "$pid" -l "$FILE" $REALM_FLAG
