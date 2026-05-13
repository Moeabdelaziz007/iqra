/**
 * 🧬 aix_export — CLI for IQRA → AIX manifest emission and verification.
 *
 * Usage:
 *   npx tsx src/scripts_v2/aix_export.ts emit [persona]
 *   npx tsx src/scripts_v2/aix_export.ts verify <path-to-manifest.json>
 *   npx tsx src/scripts_v2/aix_export.ts keygen
 *   npx tsx src/scripts_v2/aix_export.ts pi-claim <app_id> [domain]
 *
 * Environment:
 *   IQRA_IDENTITY_PRIVATE_KEY_B64URL   — persisted Ed25519 secret
 *   IQRA_IDENTITY_UUID                 — manifest meta.id (UUID v4)
 *   IQRA_IDENTITY_CREATED              — manifest meta.created (ISO 8601)
 *   PI_APP_ID, PI_ENVIRONMENT          — Pi Network config
 */

import fs from 'fs';
import path from 'path';
import {
  exportManifest,
  signManifest,
  verifyManifest,
  generateKeyPairB64,
  codec,
  bootstrapPiClaim,
  AXIOM_AUTHORITY,
  IQRA_VERSION,
  AIX_FORMAT_VERSION,
} from '#aix/index';
import { SovereignDID } from '#security/did';
import { PERSONA_REGISTRY } from '#utils/personas';

function readPrivateKey(): Uint8Array | null {
  const b64 = process.env.IQRA_IDENTITY_PRIVATE_KEY_B64URL?.trim();
  if (!b64) return null;
  return codec.base64UrlToBytes(b64);
}

async function cmdKeygen(): Promise<number> {
  const kp = generateKeyPairB64();
  console.log(JSON.stringify({
    notice: 'Persist privateKey securely (env var, KMS). Never commit to git.',
    publicKey: kp.publicKey,
    privateKey: kp.privateKey,
    suggested_env: `IQRA_IDENTITY_PRIVATE_KEY_B64URL=${kp.privateKey}`,
  }, null, 2));
  return 0;
}

async function cmdEmit(personaId: string): Promise<number> {
  const persona = PERSONA_REGISTRY[personaId] ?? PERSONA_REGISTRY['iqra-core'];
  const bareId = personaId.replace(/^iqra-/, '');
  const persisted = readPrivateKey();
  const bundle = persisted
    ? SovereignDID.fromPrivateKey(bareId, AXIOM_AUTHORITY, persisted)
    : await SovereignDID.generateBundle(bareId, AXIOM_AUTHORITY);

  const manifest = exportManifest({
    owner_id: bareId,
    publicKey: bundle.publicKey,
    meta: {
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
    },
    verification: { status: 'sovereign', trust_level: 3 },
    security: {
      level: 3,
      capabilities: ['trustchain', 'damir_filter', 'doctrinal_guard', 'tawbah_loop'],
      compliance: ['IQRA_SUPREME', 'MITHAQ', 'DASTUR'],
    },
    pi_network: process.env.PI_APP_ID
      ? {
          app_id: process.env.PI_APP_ID,
          environment: (process.env.PI_ENVIRONMENT === 'production' ? 'production' : 'sandbox'),
          kyc_required: true,
        }
      : undefined,
  });

  const signed = signManifest(manifest, bundle.privateKey);

  const outDir = path.join(process.cwd(), '.iqra', 'aix');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `manifest-${bareId}.aix.json`);
  fs.writeFileSync(outPath, JSON.stringify(signed, null, 2));
  console.log(`✅ AIX manifest emitted → ${outPath}`);
  console.log(`   identity: ${signed.identity_layer.id}`);
  console.log(`   checksum: ${signed.security.checksum}`);
  if (!persisted) {
    console.warn('⚠️  IQRA_IDENTITY_PRIVATE_KEY_B64URL not set — generated ephemeral key.');
    console.warn('    Persist this private key if you want a stable identity:');
    console.warn(`    IQRA_IDENTITY_PRIVATE_KEY_B64URL=${codec.bytesToBase64Url(bundle.privateKey)}`);
  }
  return 0;
}

async function cmdVerify(filePath: string): Promise<number> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const manifest = JSON.parse(raw);
  const result = verifyManifest(manifest);
  if (result.ok) {
    console.log(`✅ ${filePath} — signature valid`);
    return 0;
  }
  console.error(`❌ ${filePath} — ${result.reason}`);
  return 1;
}

async function cmdPiClaim(appId: string, domain: string = AXIOM_AUTHORITY): Promise<number> {
  if (!appId) {
    console.error('Usage: aix_export pi-claim <app_id> [domain]');
    return 2;
  }
  const env = (process.env.PI_ENVIRONMENT === 'production' ? 'production' : 'sandbox') as
    | 'production'
    | 'sandbox';
  const { artifact, privateKey } = bootstrapPiClaim({
    domain,
    owner_id: 'iqra-core',
    app_id: appId,
    environment: env,
    note: 'IQRA Sovereign Pi Network domain claim',
  });

  const outDir = path.join(process.cwd(), '.iqra', 'aix');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'pi-claim.json');
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));

  console.log(`✅ Pi claim artifact emitted → ${outPath}`);
  console.log(`   host at: ${artifact.well_known_url}`);
  console.log('');
  console.log('Persist this private key in your runtime env (KMS preferred):');
  console.log(`  IQRA_IDENTITY_PRIVATE_KEY_B64URL=${codec.bytesToBase64Url(privateKey)}`);
  return 0;
}

async function main(): Promise<number> {
  const [, , cmd = 'emit', a1, a2] = process.argv;
  switch (cmd) {
    case 'keygen':
      return cmdKeygen();
    case 'emit':
      return cmdEmit(a1 ?? 'iqra-core');
    case 'verify':
      if (!a1) {
        console.error('Usage: aix_export verify <path>');
        return 2;
      }
      return cmdVerify(a1);
    case 'pi-claim':
      return cmdPiClaim(a1 ?? '', a2);
    default:
      console.error(`Unknown command: ${cmd}`);
      console.error('Commands: emit | verify | keygen | pi-claim');
      return 2;
  }
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('❌ aix_export failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
