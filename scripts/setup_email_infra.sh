#!/bin/bash

# IQRA Email Infrastructure Setup
# "وَقُل رَّبِّ زِدْنِي عِلْمًا"

echo "=================================================="
echo "  🤍 IQRA Email Infrastructure Setup (CLI Mode)"
echo "=================================================="

# Ensure the user has provided the necessary keys
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ] || [ -z "$FORWARD_TO" ] || [ -z "$RESEND_DKIM_VALUE" ]; then
  echo "❌ ERROR: Missing required environment variables."
  echo "Please export the following before running this script:"
  echo "export CLOUDFLARE_API_TOKEN='your_cf_token'"
  echo "export CLOUDFLARE_ZONE_ID='your_zone_id'"
  echo "export FORWARD_TO='amrikyy@gmail.com'"
  echo "export RESEND_DKIM_VALUE='your_dkim_value_from_resend'"
  exit 1
fi

echo "✅ Environment variables detected."

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "⚙️ Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔐 Please ensure you are logged into Vercel..."
# vercel login

echo "🌐 Adding Cloudflare MX Records to Vercel DNS..."
vercel dns add axiomid.app @ MX route1.mx.cloudflare.net 59
vercel dns add axiomid.app @ MX route2.mx.cloudflare.net 26
vercel dns add axiomid.app @ MX route3.mx.cloudflare.net 83

echo "🌐 Adding SPF Record (Cloudflare + Resend) to Vercel DNS..."
vercel dns add axiomid.app @ TXT "v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all"

echo "🌐 Adding Resend DKIM Record to Vercel DNS..."
vercel dns add axiomid.app resend._domainkey TXT "$RESEND_DKIM_VALUE"

echo "☁️ Enabling Cloudflare Email Routing via API..."
curl --request POST \
  --url "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/email/routing/enable" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --header "Content-Type: application/json"

echo "☁️ Creating Forwarding Rule: iqra@axiomid.app → $FORWARD_TO..."
curl --request POST \
  --url "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/email/routing/rules" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "IQRA Identity Email",
    "enabled": true,
    "matchers": [
      {
        "type": "literal",
        "field": "to",
        "value": "iqra@axiomid.app"
      }
    ],
    "actions": [
      {
        "type": "forward",
        "value": ["'"$FORWARD_TO"'"]
      }
    ]
  }'

echo "✅ Cloudflare Email Routing configured."

echo "🔒 Please add your keys securely to Vercel Production Environment:"
echo "Run: vercel env add RESEND_API_KEY production"
echo "Run: vercel env add CLOUDFLARE_API_TOKEN production"

echo "=================================================="
echo "  Setup Complete. DNS propagation may take 24-48h."
echo "  To verify, run: bash scripts/verify_dns.sh"
echo "=================================================="
