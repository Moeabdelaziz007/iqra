import { NextRequest, NextResponse } from 'next/server';
import { resolveBaseUrl, resolveSignedDomain } from '../../_utils/http';
import { SovereignDID } from '#security/did';
import {
  exportManifest,
  signManifest,
  IQRA_VERSION,
  AIX_FORMAT_VERSION,
  codec,
} from '#aix/index';
import { getPersona, projectPersonaForAIX, resolveAIXMetaId } from '#utils/personas';

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
  const format = req.nextUrl.searchParams.get('format')?.toLowerCase();
  const personaId = req.nextUrl.searchParams.get('persona') ?? 'core';

  if (format === 'aix') {
    // SIGNED manifests must NEVER derive their URLs from the request
    // Host header. A peer that forges Host could otherwise obtain a
    // signed manifest advertising attacker-chosen URLs and undermine
    // discovery integrity for every downstream consumer. Use the
    // pinned signing domain (env > axiomid.app) instead.
    return aixManifestResponse(resolveSignedDomain(), personaId);
  }

  // Legacy IQRA-shaped card is unsigned, so it is safe to mirror the
  // request domain for self-discovery on dev / preview deployments.
  // (Used only via baseUrl, which is already proto-aware.)
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

async function aixManifestResponse(domain: string, rawPersonaId: string) {
  // Persona resolution + AIX projection are both centralized in
  // #utils/personas so the CLI export and this endpoint cannot drift.
  const persona = getPersona(rawPersonaId);
  const projection = projectPersonaForAIX(persona, domain);

  // Derive (or generate) the identity keypair.
  const persistedKey = process.env.IQRA_IDENTITY_PRIVATE_KEY_B64URL?.trim();
  let privateKey: Uint8Array;
  let publicKey: Uint8Array;

  if (persistedKey) {
    privateKey = codec.base64UrlToBytes(persistedKey);
    const bundle = SovereignDID.fromPrivateKey(projection.bareId, domain, privateKey);
    publicKey = bundle.publicKey;
  } else {
    const bundle = await SovereignDID.generateBundle(projection.bareId, domain);
    privateKey = bundle.privateKey;
    publicKey = bundle.publicKey;
  }

  // Env override > persona.uuid. resolveAIXMetaId enforces the v4
  // pattern so a malformed IQRA_IDENTITY_UUID never reaches the
  // signed payload.
  const metaId = resolveAIXMetaId(persona);

  const manifest = exportManifest({
    owner_id: projection.bareId,
    publicKey,
    meta: {
      // Pinned source-of-truth constants. `npm_package_version` is not
      // reliably populated on Vercel / Docker / direct invocations.
      version: IQRA_VERSION,
      format_version: AIX_FORMAT_VERSION,
      id: metaId,
      name: persona.name,
      description: persona.description,
      created: process.env.IQRA_IDENTITY_CREATED ?? new Date().toISOString(),
      author: 'Mohamed Abdelaziz — AMRIKYY AI Solutions',
      license: 'MIT',
      homepage: projection.homepage,
      repository: 'https://github.com/Moeabdelaziz007/iqra',
      framework: 'iqra',
      language: 'ar+en',
      runtime_version: IQRA_VERSION,
      tags: projection.tags,
    },
    persona: {
      role: persona.role,
      style: 'sovereign',
      tone: 'reverent',
      instructions: projection.instructions,
      constraints: projection.constraints,
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
      capabilities: projection.securityCapabilities,
      compliance: projection.securityCompliance,
    },
  });

  // Attach the richer optional sections from the same projection so
  // peers reading the manifest get concrete endpoint URLs + tool
  // inventory identical to what the CLI emits.
  manifest.apis = projection.apis;
  if (projection.skills) manifest.skills = { tools: projection.skills };

  const signed = signManifest(manifest, privateKey);
  return NextResponse.json(signed, {
    headers: {
      'Content-Type': 'application/vnd.aix+json; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
