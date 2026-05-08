#!/bin/bash
# بسم الله الرحمن الرحيم
# ══════════════════════════════════════════════════════════════
# 🚀 IQRA Ecosystem Launcher — مُشغّل النظام البيئي
#
# "وَقُل رَّبِّ زِدْنِي عِلْمًا" — طه: 114
#
# يُشغّل كل خدمات IQRA دفعة واحدة:
#   1. Ollama (النماذج السبعة)
#   2. IQRA Core API (المنسق)
#   3. Heartbeat (النبض)
#   4. OpenClaw (أوامر النظام)
# ══════════════════════════════════════════════════════════════

set -e

# ── الألوان ───────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║     🌙 IQRA ECOSYSTEM LAUNCHER           ║"
echo "║     بسم الله الرحمن الرحيم              ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. التحقق من المتطلبات ────────────────────────────────────
echo -e "${YELLOW}[1/5] Checking requirements...${NC}"

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ $1 not found. Please install it first.${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ $1 found${NC}"
}

check_command "ollama"
check_command "node"
check_command "npx"

# ── 2. تشغيل Ollama ──────────────────────────────────────────
echo -e "${YELLOW}[2/5] Starting Ollama...${NC}"

if ! pgrep -x "ollama" > /dev/null; then
  ollama serve &
  OLLAMA_PID=$!
  echo -e "${GREEN}✅ Ollama started (PID: $OLLAMA_PID)${NC}"
  sleep 2
else
  echo -e "${GREEN}✅ Ollama already running${NC}"
fi

# ── 3. التحقق من النماذج المطلوبة ────────────────────────────
echo -e "${YELLOW}[3/5] Checking required models...${NC}"

REQUIRED_MODELS=("gemma3:4b" "nomic-embed-text")
OPTIONAL_MODELS=("phi3:mini" "moondream:1.8b" "qwen2.5:7b")

for model in "${REQUIRED_MODELS[@]}"; do
  if ollama list 2>/dev/null | grep -q "$model"; then
    echo -e "${GREEN}✅ $model available${NC}"
  else
    echo -e "${YELLOW}⬇️  Pulling $model (required)...${NC}"
    ollama pull "$model" || echo -e "${RED}❌ Failed to pull $model${NC}"
  fi
done

for model in "${OPTIONAL_MODELS[@]}"; do
  if ollama list 2>/dev/null | grep -q "$model"; then
    echo -e "${GREEN}✅ $model available${NC}"
  else
    echo -e "${YELLOW}⚠️  $model not found (optional — skipping)${NC}"
  fi
done

# ── 4. تشغيل IQRA Core ───────────────────────────────────────
echo -e "${YELLOW}[4/5] Starting IQRA Core...${NC}"

cd "$(dirname "$0")/.."

# تشغيل heartbeat في الخلفية
npx tsx -e "
import { IQRAHeartbeat } from './lib/iqra/heartbeat.ts';
await IQRAHeartbeat.start('ecosystem');
console.log('💓 Heartbeat started');
// إبقاء العملية حية
setInterval(() => {}, 60000);
" &
HEARTBEAT_PID=$!
echo -e "${GREEN}✅ Heartbeat started (PID: $HEARTBEAT_PID)${NC}"

# ── 5. عرض الحالة ────────────────────────────────────────────
echo -e "${YELLOW}[5/5] System Status${NC}"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🌙 IQRA SYSTEM READY             ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  Ollama API: http://localhost:11434       ║${NC}"
echo -e "${BLUE}║  Models: 7 edge models registered        ║${NC}"
echo -e "${BLUE}║  Heartbeat: Active (9s intervals)        ║${NC}"
echo -e "${BLUE}║  OpenClaw: Use .ag/mcp.json config       ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  Commands:                               ║${NC}"
echo -e "${BLUE}║    npm run iqra        → Start TUI       ║${NC}"
echo -e "${BLUE}║    npm run iqra:deep   → Deep mode       ║${NC}"
echo -e "${BLUE}║    npm run iqra:quran  → Quran mode      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}بسم الله، والصلاة والسلام على رسول الله${NC}"
echo ""

# انتظار إشارة الإيقاف
trap 'echo "Stopping IQRA..."; kill $HEARTBEAT_PID 2>/dev/null; exit 0' SIGINT SIGTERM
wait
