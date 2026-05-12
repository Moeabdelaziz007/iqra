import { NextRequest, NextResponse } from 'next/server';

export function resolveBaseUrl(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const host = req.headers.get('host') || 'localhost:3000';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export function resolveDomain(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');

  return req.headers.get('host') || 'localhost:3000';
}

export function piValidationKeyResponse() {
  const key = process.env.PI_VALIDATION_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: 'PI_VALIDATION_KEY is not configured' }, { status: 503 });
  }

  return new NextResponse(key, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
