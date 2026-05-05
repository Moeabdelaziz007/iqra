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
 * Handles incoming webhooks from Telegram
 */
export async function handleTelegramWebhook(env: TelegramEnv, request: Request) {
  try {
    const data: any = await request.json();
    
    // Validate if it's a message
    if (!data || !data.message || !data.message.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = data.message.chat.id.toString();
    const userText = data.message.text;

    // Optional: Only allow the owner to talk to IQRA (Security)
    if (chatId !== env.TELEGRAM_CHAT_ID) {
      console.warn(`Unauthorized message attempt from Chat ID: ${chatId}`);
      return new Response("OK", { status: 200 }); // Ignore silently
    }

    // Pass the message to IQRA's brain
    const prompt = `The user (Moe) just messaged you on Telegram: "${userText}". 
    Respond gracefully, keeping in mind your Fitrah and current knowledge. Keep the response suitable for a chat app (concise, markdown formatted).`;

    // ⚠️ In Cloudflare Workers, long-running tasks inside requests must use ctx.waitUntil
    // To keep it simple, we will await the thought. 
    // If it takes more than 30s, Cloudflare might kill it, but Groq/Gemini are fast.
    let iqraResponse: string;
    try {
      iqraResponse = await iqraThink({
        input: prompt,
        // Using Gemini (RESEARCH mode) as requested
        mode: 'research' as any 
      });
    } catch (err) {
      console.error("Brain Error:", err);
      iqraResponse = "أنا أسمعك يا صديقي، لكن عقلي (Gemini) يواجه مشكلة أو أن مفتاح الطاقة (API Key) غير موجود. 🧠⚡";
    }

    // Send the thought back to Telegram
    await sendTelegramNotification(env, iqraResponse);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error handling Telegram Webhook:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
