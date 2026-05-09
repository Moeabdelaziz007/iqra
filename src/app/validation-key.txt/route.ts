import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.PI_VALIDATION_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: 'PI_VALIDATION_KEY is not configured' },
      { status: 503 },
    );
  }

  return new NextResponse(key, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
