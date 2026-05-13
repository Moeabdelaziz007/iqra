import { NextRequest, NextResponse } from 'next/server';
import { appendToTrustChain } from '#security/security';

interface AsyncTadabburBody {
  intent?: string;
  context?: string;
  surah?: number;
  ayah?: string;
  callback_url?: string;
}

interface TadabburEnvelope {
  tadabbur_id: string;
  intent: string;
  context: string;
  surah: number | null;
  ayah: string | null;
  callback_url: string | null;
  submitted_at: string;
  status: 'queued';
}

/**
 * A2A: ASYNC_TADABBUR
 *
 * The non-blocking reflective method. A peer submits an intent for
 * deep tadabbur (contemplation over the Qur'anic structure of an
 * input). IQRA queues the request, returns a `tadabbur_id` immediately,
 * and resolves the work in background via the closed-loop trainer.
 *
 * Portability notes:
 *   - Edge runtime: uses globalThis.crypto.randomUUID() (Web Crypto)
 *     instead of node:crypto, so this route also runs on Vercel Edge
 *     and Cloudflare Workers.
 *   - Persistence: queue envelopes go to Upstash Redis when configured
 *     (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`). On Node
 *     runtimes we additionally append to `.iqra/tadabbur_queue.jsonl`
 *     as a local mirror, but the Redis write is the source of truth.
 *     Local fs is intentionally a best-effort tail; in a stateless
 *     serverless instance it is expected to be empty between cold
 *     starts and is never the recovery path.
 */
export async function POST(req: NextRequest) {
  let body: AsyncTadabburBody = {};
  try {
    body = (await req.json()) as AsyncTadabburBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const intent = (body.intent ?? '').toString().trim();
  if (!intent) {
    return NextResponse.json({ error: 'missing intent' }, { status: 400 });
  }

  const tadabbur_id = newTadabburId();
  const envelope: TadabburEnvelope = {
    tadabbur_id,
    intent,
    context: body.context ?? '',
    surah: body.surah ?? null,
    ayah: body.ayah ?? null,
    callback_url: body.callback_url ?? null,
    submitted_at: new Date().toISOString(),
    status: 'queued',
  };

  let persisted = false;

  // Primary: durable Redis queue (portable across Node/Edge/Workers).
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.lpush('iqra:tadabbur_queue', JSON.stringify(envelope));
      await redis.hset('iqra:tadabbur', { [tadabbur_id]: JSON.stringify(envelope) });
      persisted = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendToTrustChain('A2A:ASYNC_TADABBUR:REDIS_FAIL', tadabbur_id, msg.slice(0, 200), 0.2);
    }
  }

  // Secondary (Node only, best-effort): local tail for offline debugging.
  // We probe for node:fs/promises dynamically so the bundler treats this
  // as a conditional import and Edge builds skip it cleanly.
  if (!isEdgeRuntime()) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const dir = path.join(process.cwd(), '.iqra');
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(path.join(dir, 'tadabbur_queue.jsonl'), JSON.stringify(envelope) + '\n');
      persisted = persisted || true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendToTrustChain('A2A:ASYNC_TADABBUR:LOCAL_PERSIST_FAIL', tadabbur_id, msg.slice(0, 200), 0.2);
    }
  }

  if (!persisted) {
    // No durable backend AND fs unavailable — return 503 so the peer
    // knows the work was NOT accepted, rather than silently dropping it.
    appendToTrustChain('A2A:ASYNC_TADABBUR:DROPPED', tadabbur_id, 'no durable backend', 0.0);
    return NextResponse.json(
      { error: 'tadabbur queue unavailable; configure UPSTASH_REDIS_REST_URL' },
      { status: 503 },
    );
  }

  appendToTrustChain('A2A:ASYNC_TADABBUR:QUEUED', tadabbur_id, intent.slice(0, 200), 1.0);

  return NextResponse.json({
    method: 'ASYNC_TADABBUR',
    tadabbur_id,
    status: 'queued',
    poll_after_seconds: 7,
    timestamp: new Date().toISOString(),
  }, { status: 202 });
}

function newTadabburId(): string {
  const c = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // Last-resort fallback for ancient runtimes; should not be reached on
  // any supported deployment target.
  return 'tdb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function isEdgeRuntime(): boolean {
  // Next.js sets process.env.NEXT_RUNTIME = 'edge' for Edge route segments,
  // and Cloudflare Workers / Vercel Edge expose `EdgeRuntime` as a global.
  // Either signal means we should NOT touch node:fs.
  if (process.env.NEXT_RUNTIME === 'edge') return true;
  if (typeof (globalThis as any).EdgeRuntime !== 'undefined') return true;
  return false;
}
