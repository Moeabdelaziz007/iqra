import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhook } from '../../../lib/iqra/13-utils/telegram_bot'; /**
 * Handle incoming Telegram webhook POST requests.
 *
 * Reads Telegram credentials from environment variables and delegates processing to the Telegram webhook handler.
 *
 * @returns A NextResponse produced by the Telegram webhook handler; on failure, a JSON response `{ status: 'error' }` with HTTP status 500.
 */

export async function POST(request: NextRequest) {
  const env = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN!,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID!,
  };

  try {
    return await handleTelegramWebhook(env, request as any);
  } catch (error) {
    console.error('Telegram Webhook Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
