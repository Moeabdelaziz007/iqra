import { NextResponse } from 'next/server';

export function getPiValidationKeyResponse() {
  const key = process.env.PI_VALIDATION_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: 'PI_VALIDATION_KEY is not configured' }, { status: 503 });
  }

  return new NextResponse(key, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
