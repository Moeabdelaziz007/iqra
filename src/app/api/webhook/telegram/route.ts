import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhook } from '#utils/telegram_bot';

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
