// بسم الله الرحمن الرحيم

/**
 * 💬 IQRA Telegram Layer — لسان إقرأ
 * 
 * "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 * 
 * ══════════════════════════════════════════════════════════════
 * الربط:
 *   • IQRAHeartbeat — يُرسل تقارير النبض تلقائياً
 *   • ToolsRegistry — يستقبل أوامر الأدوات من Telegram
 *   • Brain — يُعالج الرسائل عبر iqraThink
 * ══════════════════════════════════════════════════════════════
 */

import { iqraThink } from './brain';
import { IQRALogger } from '../12-infrastructure/logger';
import { appendToTrustChain } from '#security/security';
import { HeartbeatSystem } from '../12-infrastructure/heartbeat';
import { ToolsRegistry } from '../12-infrastructure/tools_registry';

export interface TelegramEnv {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

/**
 * Sends a direct message to the user
 */
export async function sendTelegramNotification(env: TelegramEnv, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram Token or Chat ID is missing. Notification skipped.");
    return false;
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      console.error("Failed to send Telegram message:", await response.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error connecting to Telegram API:", err);
    return false;
  }
}

/**
 * Sends a notification message to Moe
 */
export async function iqraNotify(env: TelegramEnv, message: string) {
  return await sendTelegramNotification(env, message);
}

/**
 * Specifically notify about a new Quranic discovery
 */
export async function notifyQuranDiscovery(env: TelegramEnv, pattern: any) {
  const message = `
📖 *اكتشاف جديد — إقرأ تعلم*

*السورة:* ${pattern.surah || 'N/A'}
*الاكتشاف:* ${pattern.discovery}

_${pattern.arabicNote || 'والله أعلم'}_

🤍 IQRA
  `;
  return await iqraNotify(env, message);
}

/**
 * Setup Heartbeat callbacks for Telegram notifications
 */
export function setupHeartbeatCallbacks(env: TelegramEnv) {
  // تقارير الصحة
  HeartbeatSystem.onHealthReport = async (health) => {
    if (health.status === 'CRITICAL' || health.status === 'DEGRADED') {
      const report = HeartbeatSystem.formatHealthReport(health);
      await iqraNotify(env, `🚨 *تحذير النظام*\n\n${report}`);
    }
  };

  // الاكتشافات القرآنية
  HeartbeatSystem.onDiscovery = async (pattern) => {
    await notifyQuranDiscovery(env, pattern);
  };

  // التنبيهات العامة
  HeartbeatSystem.onAlert = async (message) => {
    await iqraNotify(env, message);
  };

  IQRALogger.info('💬 [TELEGRAM] Heartbeat callbacks configured');
}

/**
 * Handles incoming webhooks from Telegram
 */
export async function handleTelegramWebhook(env: any, request: Request) {
  try {
    const data: any = await request.json();
    
    if (!data || !data.message || !data.message.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = data.message.chat.id.toString();
    const userText = data.message.text;

    // Security: Only Moe can talk to IQRA
    if (chatId !== env.TELEGRAM_CHAT_ID) {
      return new Response("OK", { status: 200 });
    }

    // Trigger "Typing..." action
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });

    // ── Tool Commands ─────────────────────────────────────────────────────
    if (userText.startsWith('/tool ')) {
      const toolCommand = userText.slice(6).trim(); // Remove '/tool '
      const [toolName, ...args] = toolCommand.split(' ');
      
      try {
        const result = await ToolsRegistry.call(toolName, { args });
        if (result.success) {
          const response = typeof result.data === 'object' 
            ? `✅ *${toolName}*\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``
            : `✅ *${toolName}*\n${result.data}`;
          await sendTelegramNotification(env, response);
        } else {
          await sendTelegramNotification(env, `❌ *خطأ في ${toolName}*\n${result.error}`);
        }
      } catch (e) {
        await sendTelegramNotification(env, `❌ *فشل تنفيذ ${toolName}*\n${(e as Error).message}`);
      }
      return new Response("OK", { status: 200 });
    }

    // ── Status Commands ───────────────────────────────────────────────────
    if (userText === '/status' || userText === '/حالة') {
      const health = HeartbeatSystem.getLastHealth();
      if (health) {
        const report = HeartbeatSystem.formatHealthReport(health);
        await sendTelegramNotification(env, report);
      } else {
        await sendTelegramNotification(env, '⚠️ لا توجد تقارير صحة متاحة');
      }
      return new Response("OK", { status: 200 });
    }

    // ── Tools List ────────────────────────────────────────────────────────
    if (userText === '/tools' || userText === '/أدوات') {
      const quranTools = ToolsRegistry.list('QURAN');
      const memoryTools = ToolsRegistry.list('MEMORY');
      const systemTools = ToolsRegistry.list('SYSTEM');
      
      const toolsList = [
        '*🔧 الأدوات المتاحة*\n',
        '*📖 القرآن:*',
        ...quranTools.map(t => `• \`${t.name}\` — ${t.description_ar}`),
        '\n*🧠 الذاكرة:*',
        ...memoryTools.map(t => `• \`${t.name}\` — ${t.description_ar}`),
        '\n*⚙️ النظام:*',
        ...systemTools.map(t => `• \`${t.name}\` — ${t.description_ar}`),
        '\n_استخدم: `/tool اسم_الأداة معاملات`_'
      ].join('\n');
      
      await sendTelegramNotification(env, toolsList);
      return new Response("OK", { status: 200 });
    }

    // ── Heartbeat Commands ────────────────────────────────────────────────
    if (userText === '/heartbeat' || userText === '/نبض') {
      const isRunning = HeartbeatSystem.isRunning();
      const uptime = HeartbeatSystem.getUptime();
      const pulseCount = HeartbeatSystem.getPulseCount();
      
      const uptimeMin = Math.floor(uptime / 60000);
      const uptimeStr = uptimeMin > 60 
        ? `${Math.floor(uptimeMin / 60)}س ${uptimeMin % 60}د`
        : `${uptimeMin}د`;
      
      const heartbeatInfo = [
        `💓 *نبض إقرأ*`,
        ``,
        `🟢 الحالة: ${isRunning ? 'نشط' : 'متوقف'}`,
        `⏰ وقت التشغيل: ${uptimeStr}`,
        `💓 عدد النبضات: ${pulseCount}`,
        ``,
        `_"وَهُوَ الَّذِي يُحْيِي وَيُمِيتُ"_`
      ].join('\n');
      
      await sendTelegramNotification(env, heartbeatInfo);
      return new Response("OK", { status: 200 });
    }

    // ── Default: Brain Processing ─────────────────────────────────────────
    const prompt = `
      Your name is IQRA. You are a Sovereign Intelligence. 
      Moe (the user) messaged you: "${userText}"
      Respond as IQRA—wise, pattern-seeking, and dedicated to the truth found in Quranic wisdom.
      Keep it concise and elegant.
    `;

    let iqraResponse: string;
    try {
      iqraResponse = await iqraThink({
        input: prompt,
        mode: 'research' as any 
      });
    } catch (err) {
      iqraResponse = "أنا أسمعك، لكن يبدو أن هناك مشكلة في اتصالي بالبصيرة (API Error). 🧠⚡";
    }

    await sendTelegramNotification(env, iqraResponse);

    // Log interaction in TrustChain
    appendToTrustChain(
      'TELEGRAM:INTERACTION',
      chatId,
      `user_msg_len=${userText.length} response_len=${iqraResponse.length}`,
      1.0
    );

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error handling Telegram Webhook:", error);
    return new Response("Error", { status: 200 });
  }
}
