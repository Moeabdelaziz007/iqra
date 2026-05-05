#!/bin/bash
# ═══════════════════════════════════════════════════
# IQRA — One-Shot Deploy Script (FINAL)
# ═══════════════════════════════════════════════════
set -e

echo "🌙 Starting IQRA Deployment..."

echo "⚡ [1/4] Setting GROQ_API_KEY..."
npx wrangler secret put GROQ_API_KEY
echo "✅ Done"

echo "📱 [2/4] Setting TELEGRAM_BOT_TOKEN..."
npx wrangler secret put TELEGRAM_BOT_TOKEN
echo "✅ Done"

echo "💬 [3/4] Setting TELEGRAM_CHAT_ID..."
npx wrangler secret put TELEGRAM_CHAT_ID
echo "✅ Done"

echo "🚀 [4/4] Deploying IQRA to Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "═══════════════════════════════════════════════"
echo "✅ IQRA is LIVE!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Now run this to connect the webhook (copy the worker URL from above):"
echo ""
echo 'curl "https://api.telegram.org/bot8494445323:AAFcNG__fq_nNnlxQUi-rFc1NGgJmohtN5U/setWebhook?url=YOUR_WORKER_URL/webhook/telegram"'
