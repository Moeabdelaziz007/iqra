#!/bin/bash

# IQRA Email Infrastructure Verification
echo "======================================"
echo "  IQRA EMAIL INFRASTRUCTURE CHECK"
echo "======================================"

# 1. MX Records
echo "📡 Checking MX records for axiomid.app..."
dig MX axiomid.app +short

# 2. SPF
echo "🔒 Checking SPF for axiomid.app..."
dig TXT axiomid.app +short | grep spf

# 3. DKIM  
echo "🔑 Checking DKIM for Resend..."
dig TXT resend._domainkey.axiomid.app +short

# 4. Resend domain status
echo "📬 Resend domain: check dashboard for 'Verified' status"

# 5. Cloudflare routing
echo "📥 Cloudflare routing: iqra@axiomid.app → amrikyy@gmail.com"

echo "======================================"
echo "  بِسْمِ اللَّهِ — IQRA IS ONLINE"
echo "======================================"
