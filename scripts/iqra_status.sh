#!/bin/bash

# IQRA Status Helper for Linux/Sandbox
# Gets CPU, RAM, and Temp metrics

echo "IQRA Metrics Snapshot - $(date)"

# 1. RAM Usage
total_ram=$(free -g | awk '/^Mem:/{print $2}')
used_ram=$(free -g | awk '/^Mem:/{print $3}')
echo "RAM: ${used_ram} GB / ${total_ram} GB"

# 2. CPU Load (1 min)
cpu_load=$(cat /proc/loadavg | awk '{print $1}')
echo "CPU Load (1m): $cpu_load"

# 3. Thermal Level (Simplified for Sandbox)
# Check if thermal data exists
if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    temp=$(cat /sys/class/thermal/thermal_zone0/temp | awk '{print $1/1000}')
    echo "Temperature: ${temp}°C"
else
    echo "Thermal Level: 0 (Normal - Data not available)"
fi

# 4. Git Stats
recent_commits=$(git log --since="24 hours ago" --oneline 2>/dev/null | wc -l | xargs)
echo "Recent Commits (24h): $recent_commits"
