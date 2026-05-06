#!/bin/bash

# IQRA Status Helper for macOS Intel
# Gets CPU, RAM, and Temp metrics without heavy dependencies

echo "IQRA Metrics Snapshot - $(date)"

# 1. RAM Usage
total_ram=$(sysctl hw.memsize | awk '{print $2/1024/1024/1024}')
used_ram=$(vm_stat | perl -ne '/page size of (\d+) bytes/ and $s=$1; /Pages active: +(\d+)/ and $a=$1; /Pages speculative: +(\d+)/ and $sp=$1; /Pages wired down: +(\d+)/ and $w=$1; /Pages compressed: +(\d+)/ and $c=$1; END { printf "%.2f", ($a+$sp+$w+$c)*$s/1024/1024/1024 }')
echo "RAM: $used_ram GB / ${total_ram%.*} GB"

# 2. CPU Load (1 min)
cpu_load=$(sysctl -n vm.loadavg | awk '{print $2}')
echo "CPU Load (1m): $cpu_load"

# 3. Temperature (using powermetrics if possible, or fallback)
# Note: powermetrics requires sudo, so we might use a lighter tool if available
# Fallback: check thermal state
thermal_level=$(sysctl -n kern.thermal_level)
echo "Thermal Level: $thermal_level (0=Normal, 1=Fair, 2=Serious, 3=Critical)"

# 4. Git Stats
recent_commits=$(git log --since="24 hours ago" --oneline | wc -l | xargs)
echo "Recent Commits (24h): $recent_commits"
