#!/bin/bash

# IQRA Email Infrastructure Setup Wizard
# "وَقُل رَّبِّ زِدْنِي عِلْمًا"

set -e # Exit on error

echo "=================================================="
echo "  🤍 IQRA Email Infrastructure Setup (CLI Mode)"
echo "=================================================="

# Function to prompt for secrets securely
prompt_secret() {
  local var_name=$1
  local prompt_text=$2
  if [ -z "${!var_name}" ]; then
    read -s -p "$prompt_text: " input_val
    echo ""
    export $var_name="$input_val"
  fi
}

echo "🔍 Checking for required CLI tools..."

if ! command -v vercel &> /dev/null; then
    echo "⚙️ Vercel CLI not found. Installing..."
    npm install -g vercel
else
    echo "✅ Vercel CLI found."
fi

if ! command -v wrangler &> /dev/null; then
    echo "⚙️ Wrangler CLI not found. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found."
fi

echo "--------------------------------------------------"
echo "🔑 AUTHENTICATION (Headless Login)"
echo "--------------------------------------------------"

echo "To log in securely via CLI without opening a browser, we use API tokens."
echo "(As per official docs: set CLOUDFLARE_API_TOKEN and VERCEL_TOKEN)"

prompt_secret "VERCEL_TOKEN" "Enter your Vercel Token (https://vercel.com/account/tokens)"
prompt_secret "CLOUDFLARE_API_TOKEN" "Enter your Cloudflare API Token (Edit Zone DNS + Email Routing)"
prompt_secret "CLOUDFLARE_ACCOUNT_ID" "Enter your Cloudflare Account ID"
prompt_secret "CLOUDFLARE_ZONE_ID" "Enter your Cloudflare Zone ID for axiomid.app"
prompt_secret "FORWARD_TO" "Enter the email to forward to (e.g. amrikyy@gmail.com)"
prompt_secret "RESEND_DKIM_VALUE" "Enter your Resend DKIM TXT value"

echo "--------------------------------------------------"
echo "🚀 EXECUTING INFRASTRUCTURE SETUP"
echo "--------------------------------------------------"

echo "1️⃣ Verifying Vercel Login..."
vercel whoami --token="$VERCEL_TOKEN"

echo "2️⃣ Verifying Cloudflare (Wrangler) Login..."
wrangler whoami

echo "3️⃣ Adding Cloudflare MX Records to Vercel DNS..."
vercel dns add axiomid.app @ MX route1.mx.cloudflare.net 59 --token="$VERCEL_TOKEN"
vercel dns add axiomid.app @ MX route2.mx.cloudflare.net 26 --token="$VERCEL_TOKEN"
vercel dns add axiomid.app @ MX route3.mx.cloudflare.net 83 --token="$VERCEL_TOKEN"

echo "4️⃣ Adding SPF Record (Cloudflare + Resend) to Vercel DNS..."
vercel dns add axiomid.app @ TXT "v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all" --token="$VERCEL_TOKEN"

echo "5️⃣ Adding Resend DKIM Record to Vercel DNS..."
vercel dns add axiomid.app resend._domainkey TXT "$RESEND_DKIM_VALUE" --token="$VERCEL_TOKEN"

echo "6️⃣ Enabling Cloudflare Email Routing via API..."
curl --silent --show-error --fail --request POST \
  --url "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/email/routing/enable" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --header "Content-Type: application/json"

echo "7️⃣ Creating Forwarding Rule: iqra@axiomid.app → $FORWARD_TO..."
curl --silent --show-error --fail --request POST \
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

echo "--------------------------------------------------"
echo "✅ SETUP COMPLETE"
echo "iqra@axiomid.app is now configured."
echo "--------------------------------------------------"
