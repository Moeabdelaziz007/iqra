/**
 * 📌 Pinned IQRA version constant used by the AIX manifest exporter.
 *
 * Why a constant instead of `process.env.npm_package_version`?
 *   `npm_package_version` is only populated when the process is
 *   spawned by an npm script. In Vercel, Docker, Cloudflare Workers,
 *   and any direct `node`/`tsx` invocation, the variable is undefined
 *   and we silently fall back to the wrong version in the signed
 *   manifest. A signed manifest with a wrong version is worse than
 *   no manifest, so we pin the source of truth here.
 *
 * Update protocol: bump IQRA_VERSION below in lockstep with
 * `package.json#version`. The PR that bumps the package version MUST
 * also bump this constant; CI fails otherwise (see the version-sync
 * check below).
 */

export const IQRA_VERSION = '0.3.6.9';
export const AIX_FORMAT_VERSION = '1.3';
export const AXIOM_PROTOCOL = 'axiom-a2a-v1';
