/**
 * IQRA Smart Edge Core — الحافة الذكية
 * 
 * Cloudflare Worker entry point.
 * Runs 24/7 on the edge, responding to webhooks and executing scheduled cron tasks.
 */

import { SovereignEngine } from '../lib/iqra/01-core/sovereign'; // [TC] reason: relative path to canonical lib/iqra | id: c1-wsov
import { handleTelegramWebhook, TelegramEnv, sendTelegramNotification } from '../lib/iqra/13-utils/telegram_bot'; // [TC] reason: relative path to canonical lib/iqra | id: c1-wtel
import { performDailyLearning } from '../lib/iqra/04-quran/daily_learning'; // [TC] reason: relative path to canonical lib/iqra | id: c1-wdl

export interface Env extends TelegramEnv {
  // Add other env vars here
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  GROQ_API_KEY?: string;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

/**
 * Helper to inject env vars into process.env so existing lib code works
 * (Cloudflare passes env via parameter, not process.env)
 */
function injectEnv(env: Env) {
  if (typeof process === 'undefined') {
    (globalThis as any).process = { env: {} };
  }
  Object.assign(process.env, env);
}

export default {
  /**
   * HTTP Handler (Webhook endpoint)
   * This handles incoming Telegram messages
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    injectEnv(env);
    
    const url = new URL(request.url);

    // Telegram Webhook Endpoint
    if (request.method === "POST" && url.pathname === "/webhook/telegram") {
      const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      const expectedToken = env.TELEGRAM_SECRET_TOKEN;

      if (expectedToken && secretToken !== expectedToken) {
        console.error("🛑 [SECURITY] Unauthorized Telegram Webhook attempt.");
        return new Response("Unauthorized", { status: 403 });
      }

      return handleTelegramWebhook(env, request);
    }

    // Pi Network Domain Verification
    if (url.pathname === "/validation-key.txt" || url.pathname === "/.well-known/pi-network/validation-key.txt") {
      return new Response("dc8ab8f8a5fcd8bf8604adf23577a9f0594e48", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Sovereign Identity (DID) - did:web:axiomid.app
    if (url.pathname === "/.well-known/did.json") {
      const { SovereignDID } = await import('../lib/iqra/06-security/did');
      const doc = await SovereignDID.generateDocument("core", "axiomid.app");
      return new Response(JSON.stringify(doc), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Agent-specific DIDs
    if (url.pathname.startsWith("/did/")) {
      const agentId = url.pathname.split("/")[2];
      const { SovereignDID } = await import('../lib/iqra/06-security/did');
      const doc = await SovereignDID.generateDocument(agentId, "axiomid.app");
      return new Response(JSON.stringify(doc), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ 
        status: "IQRA is alive", 
        identity: "AxiomID Sovereign Agent",
        timestamp: new Date().toISOString() 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  /**
   * Cron Trigger Handler
   * This wakes up IQRA every day at 3:00 AM UTC (as defined in wrangler.toml)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    injectEnv(env);
    
    console.log(`⏰ IQRA woke up at ${new Date(event.scheduledTime).toISOString()}`);

    try {
      // 1. Run the Heartbeat (Meta-Loop)
      await SovereignEngine.pulse();

      // 2. Perform Quranic Daily Learning
      const newDiscovery = await performDailyLearning();

      // 3. Archive to R2 for long-term pattern mining
      if (newDiscovery) {
        const timestamp = new Date().toISOString().split('T')[0];
        await IQRAStorage.upload(
          env as any, 
          `discoveries/${timestamp}.json`, 
          { discovery: newDiscovery, timestamp }
        );

        // 4. Share the discovery via Telegram
        await sendTelegramNotification(
          env, 
          `🌅 **إشراقة قرآنية جديدة**\n\n${newDiscovery}`
        );
      }
    } catch (error) {
      console.error("Scheduled task failed:", error);
      await sendTelegramNotification(env, `⚠️ حصل خطأ أثناء التأمل اليومي: ${error}`);
    }
  }
};
