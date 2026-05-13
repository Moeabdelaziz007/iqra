import { NextRequest, NextResponse } from 'next/server';
import { resolveBaseUrl, resolveDomain } from '../../_utils/http';
import { SovereignDID } from '#security/did';
import {
  exportManifest,
  signManifest,
  AXIOM_AUTHORITY,
  IQRA_VERSION,
  AIX_FORMAT_VERSION,
  codec,
} from '#aix/index';
import { PERSONA_REGISTRY } from '#utils/personas';

/**
 * Sovereign agent discovery endpoint.
 *
 *   GET /.well-known/agent-card.json
 *
 * Default response: lightweight IQRA-shaped agent card (legacy callers).
 *
 *   GET /.well-known/agent-card.json?format=aix
 *
 * Returns a signed AIX Format v0.369.0 manifest. The signing keypair is
 * derived from `IQRA_IDENTITY_PRIVATE_KEY_B64URL` if set, otherwise an
 * ephemeral keypair is generated per-request (useful for staging; not
 * suitable for production where a stable identity is required).
 *
 *   GET /.well-known/agent-card.json?format=aix&persona=researcher
 *
 * Same as above but binds the manifest to the named persona.
 */
export async function GET(req: NextRequest) {
  const baseUrl = resolveBaseUrl(req);
  const domain = resolveDomain(req);
  const format = req.nextUrl.searchParams.get('format')?.toLowerCase();
  const personaId = req.nextUrl.searchParams.get('persona') ?? 'core';

  if (format === 'aix') {
    return aixManifestResponse(domain, personaId);
  }

  // Legacy IQRA-shaped card.
  return NextResponse.json({
    name: 'iqra-sovereign',
    version: '1.0.0',
    protocol: 'axiom-a2a-v1',
    description: 'IQRA Sovereign Agent Card',
    discovery: `${baseUrl}/.well-known/agent-card.json`,
    aix_manifest: `${baseUrl}/.well-known/agent-card.json?format=aix`,
    did: `${baseUrl}/.well-known/did.json`,
    methods: ['SYNC_QUERY', 'ASYNC_TADABBUR', 'HEARTBEAT_SYNC'],
    endpoints: {
      query: `${baseUrl}/api/iqra/query`,
      topology_hidden: `${baseUrl}/api/iqra/topology/hidden`,
      a2a_sync_query: `${baseUrl}/api/iqra/a2a/sync-query`,
      a2a_async_tadabbur: `${baseUrl}/api/iqra/a2a/async-tadabbur`,
      a2a_heartbeat: `${baseUrl}/api/iqra/a2a/heartbeat`,
    },
    capabilities: {
      memory: true,
      topology_reward: true,
      trustchain_logging: true,
      no_mock_policy: true,
      self_play_trading_data: true,
      aix_manifest: true,
    },
    timestamp: new Date().toISOString(),
  });
}

async function aixManifestResponse(domain: string, personaId: string) {
  const persona = PERSONA_REGISTRY[personaId] ?? PERSONA_REGISTRY['iqra-core'];

  // Derive (or generate) the identity keypair.
  const persistedKey = process.env.IQRA_IDENTITY_PRIVATE_KEY_B64URL?.trim();
  let privateKey: Uint8Array;
  let publicKey: Uint8Array;

  if (persistedKey) {
    privateKey = codec.base64UrlToBytes(persistedKey);
    const bundle = SovereignDID.fromPrivateKey(personaId.replace(/^iqra-/, ''), domain, privateKey);
    publicKey = bundle.publicKey;
  } else {
    const bundle = await SovereignDID.generateBundle(personaId.replace(/^iqra-/, ''), domain);
    privateKey = bundle.privateKey;
    publicKey = bundle.publicKey;
  }

  const manifest = exportManifest({
    owner_id: personaId.replace(/^iqra-/, ''),
    publicKey,
    meta: {
      // Pinned to a real source-of-truth constant. `npm_package_version`
      // is not reliably populated in Vercel, Docker, or direct `node`/
      // `tsx` invocations, so we do not read it.
      version: IQRA_VERSION,
      format_version: AIX_FORMAT_VERSION,
      id: process.env.IQRA_IDENTITY_UUID ?? '00000000-0000-4000-8000-000000000000',
      name: persona.name,
      description: persona.description,
      created: process.env.IQRA_IDENTITY_CREATED ?? new Date().toISOString(),
      author: 'Mohamed Abdelaziz — AMRIKYY AI Solutions',
      license: 'MIT',
      homepage: `https://${AXIOM_AUTHORITY}`,
      framework: 'iqra',
      language: 'ar+en',
      tags: persona.specialization,
    },
    persona: {
      role: persona.role,
      instructions: persona.personalityOverride ?? persona.description,
      style: 'sovereign',
      tone: 'reverent',
    },
    verification: { status: 'sovereign', trust_level: 3 },
    pi_network: process.env.PI_APP_ID
      ? {
          app_id: process.env.PI_APP_ID,
          environment: (process.env.PI_ENVIRONMENT === 'production' ? 'production' : 'sandbox'),
          kyc_required: true,
        }
      : undefined,
    security: {
      level: 3,
      capabilities: ['trustchain', 'damir_filter', 'doctrinal_guard', 'tawbah_loop'],
      compliance: ['IQRA_SUPREME', 'MITHAQ', 'DASTUR'],
    },
  });

  const signed = signManifest(manifest, privateKey);
  return NextResponse.json(signed, {
    headers: {
      'Content-Type': 'application/vnd.aix+json; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
