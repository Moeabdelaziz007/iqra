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

/**
 * Resolve the domain that should appear in SIGNED artifacts (AIX
 * manifests, DID documents, Pi claims). Unlike `resolveDomain` this
 * helper REFUSES to derive the value from the request `Host` header,
 * because `Host` is client-controlled and a peer who forges it could
 * obtain a validly signed manifest pointing at an attacker-chosen
 * domain. Resolution order:
 *
 *   1. NEXT_PUBLIC_APP_DOMAIN env var (trimmed, scheme stripped)
 *   2. The sovereign authority constant `axiomid.app`
 *
 * Never reads `req` so the same domain is signed no matter what the
 * caller sends.
 */
export function resolveSignedDomain(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '');
  return 'axiomid.app';
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
