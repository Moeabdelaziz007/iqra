/**
 * IQRA Telegram Layer — لسان إقرأ
 * 
 * Handles direct communication with the user via Telegram Bot API.
 * Uses native fetch to run on Cloudflare Workers without dependencies.
 */

import { SovereignEngine } from './sovereign';
import { iqraThink } from './brain';

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

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error handling Telegram Webhook:", error);
    return new Response("Error", { status: 200 });
  }
}
