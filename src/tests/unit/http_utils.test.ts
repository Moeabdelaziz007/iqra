/**
 * Unit Tests: src/app/_utils/http.ts
 *
 * Tests the three exported functions after the PR refactor that
 * removed resolveSignedDomain():
 *   - resolveBaseUrl(req)  — derives the proto+host base URL
 *   - resolveDomain(req)   — derives just the host/domain
 *   - piValidationKeyResponse() — returns the PI validation key or 503
 *
 * Also asserts that resolveSignedDomain is NOT exported (it was
 * deleted in this PR to stop signed artifacts from being locked to a
 * fixed domain and to instead use the request domain directly).
 *
 * NextRequest is approximated with a plain object carrying a
 * `headers.get()` method — the same surface the real Next.js type
 * exposes and that our helpers consume. All three functions read env
 * vars at call time, not at import time, so we can safely use static
 * imports and mutate process.env between tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveBaseUrl,
  resolveDomain,
  piValidationKeyResponse,
} from '../../app/_utils/http';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal NextRequest-shaped object for the helpers under test. */
function makeReq(host: string | null): any {
  return {
    headers: {
      get: (name: string) => (name === 'host' ? host : null),
    },
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  };
}

// Store originals so we can restore them after each test.
const ORIG_APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ORIG_APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN;
const ORIG_PI_KEY = process.env.PI_VALIDATION_KEY;

afterEach(() => {
  // Restore to whatever they were before any test ran.
  if (ORIG_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIG_APP_URL;
  }
  if (ORIG_APP_DOMAIN === undefined) {
    delete process.env.NEXT_PUBLIC_APP_DOMAIN;
  } else {
    process.env.NEXT_PUBLIC_APP_DOMAIN = ORIG_APP_DOMAIN;
  }
  if (ORIG_PI_KEY === undefined) {
    delete process.env.PI_VALIDATION_KEY;
  } else {
    process.env.PI_VALIDATION_KEY = ORIG_PI_KEY;
  }
});

// ── resolveBaseUrl ────────────────────────────────────────────────────────────

describe('resolveBaseUrl()', () => {
  it('uses NEXT_PUBLIC_APP_URL env when set (strips trailing slash)', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';
    const result = resolveBaseUrl(makeReq('anything.com'));
    expect(result).toBe('https://example.com');
  });

  it('uses NEXT_PUBLIC_APP_URL without trailing slash as-is', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    const result = resolveBaseUrl(makeReq('anything.com'));
    expect(result).toBe('https://example.com');
  });

  it('uses http:// scheme for localhost host when no env set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = resolveBaseUrl(makeReq('localhost:3000'));
    expect(result).toBe('http://localhost:3000');
  });

  it('uses https:// scheme for non-localhost host when no env set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = resolveBaseUrl(makeReq('myapp.vercel.app'));
    expect(result).toBe('https://myapp.vercel.app');
  });

  it('falls back to localhost:3000 when host header is null and no env set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = resolveBaseUrl(makeReq(null));
    expect(result).toBe('http://localhost:3000');
  });

  it('returns non-empty string for any reasonable host', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = resolveBaseUrl(makeReq('example.io'));
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^https?:\/\//);
  });
});

// ── resolveDomain ─────────────────────────────────────────────────────────────

describe('resolveDomain()', () => {
  it('returns NEXT_PUBLIC_APP_DOMAIN env when set without scheme', () => {
    process.env.NEXT_PUBLIC_APP_DOMAIN = 'axiomid.app';
    const result = resolveDomain(makeReq('localhost:3000'));
    expect(result).toBe('axiomid.app');
  });

  it('strips https:// scheme from NEXT_PUBLIC_APP_DOMAIN', () => {
    process.env.NEXT_PUBLIC_APP_DOMAIN = 'https://axiomid.app';
    const result = resolveDomain(makeReq('localhost:3000'));
    expect(result).toBe('axiomid.app');
  });

  it('strips http:// scheme from NEXT_PUBLIC_APP_DOMAIN', () => {
    process.env.NEXT_PUBLIC_APP_DOMAIN = 'http://axiomid.app';
    const result = resolveDomain(makeReq('localhost:3000'));
    expect(result).toBe('axiomid.app');
  });

  it('uses the request host header when NEXT_PUBLIC_APP_DOMAIN is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_DOMAIN;
    const result = resolveDomain(makeReq('myapp.vercel.app'));
    expect(result).toBe('myapp.vercel.app');
  });

  it('falls back to localhost:3000 when host header is null and no env set', () => {
    delete process.env.NEXT_PUBLIC_APP_DOMAIN;
    const result = resolveDomain(makeReq(null));
    expect(result).toBe('localhost:3000');
  });

  // Key behavioural difference from the removed resolveSignedDomain():
  // resolveDomain() DOES read the request host header when there is no
  // NEXT_PUBLIC_APP_DOMAIN env override. resolveSignedDomain() was
  // unconditionally pinned to 'axiomid.app' regardless of request.
  it('mirrors the request host when no env override is configured', () => {
    delete process.env.NEXT_PUBLIC_APP_DOMAIN;
    const result = resolveDomain(makeReq('dev-preview.example.com'));
    expect(result).toBe('dev-preview.example.com');
  });

  it('env override takes precedence over any request host', () => {
    process.env.NEXT_PUBLIC_APP_DOMAIN = 'production.axiomid.app';
    const result = resolveDomain(makeReq('attacker.example.com'));
    expect(result).toBe('production.axiomid.app');
  });
});

// ── resolveSignedDomain removed ───────────────────────────────────────────────

describe('resolveSignedDomain — removed in this PR', () => {
  it('resolveSignedDomain is NOT exported from http.ts', async () => {
    // Import the module as a namespace to inspect its exports.
    const httpModule = await import('../../app/_utils/http');
    expect((httpModule as any).resolveSignedDomain).toBeUndefined();
  });
});

// ── piValidationKeyResponse ───────────────────────────────────────────────────

describe('piValidationKeyResponse()', () => {
  it('returns 503 JSON error when PI_VALIDATION_KEY is not set', async () => {
    delete process.env.PI_VALIDATION_KEY;
    const response = piValidationKeyResponse();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toMatch(/PI_VALIDATION_KEY/);
  });

  it('returns 200 response when PI_VALIDATION_KEY is set', async () => {
    process.env.PI_VALIDATION_KEY = 'my-validation-key-123';
    const response = piValidationKeyResponse();
    expect(response.status).toBe(200);
  });

  it('response body contains the key value when set', async () => {
    process.env.PI_VALIDATION_KEY = 'test-key-abc';
    const response = piValidationKeyResponse();
    const text = await response.text();
    expect(text).toBe('test-key-abc');
  });

  it('trims whitespace from PI_VALIDATION_KEY before returning', async () => {
    process.env.PI_VALIDATION_KEY = '  trimmed-key  ';
    const response = piValidationKeyResponse();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe('trimmed-key');
  });

  it('returns 503 when PI_VALIDATION_KEY is only whitespace (falsy after trim)', async () => {
    process.env.PI_VALIDATION_KEY = '   ';
    const response = piValidationKeyResponse();
    // After trimming, the value is '' which is falsy → 503
    expect(response.status).toBe(503);
  });

  it('Content-Type is text/plain when key is present', async () => {
    process.env.PI_VALIDATION_KEY = 'some-key';
    const response = piValidationKeyResponse();
    expect(response.headers.get('content-type')).toContain('text/plain');
  });
});