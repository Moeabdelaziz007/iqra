# L2 ↔ L3 Integration: IQRA Runtime ↔ AIX Agent Skills Marketplace

This is the contract between IQRA (L2 runtime) and the
`aix-agent-skills` repository (L3 marketplace). The implementation
lives in `src/lib/iqra/14-aix/marketplace_loader.ts` and re-uses the
existing read-only discovery in `src/lib/iqra/08-cognitive/skills/loader.ts`.

## Sovereign Stack position

```
L1 Protocol           aix-format         — AIX schema, JCS, signing
L2 Runtime            iqra               — sovereign OS, cognitive loop
L3 Marketplace        aix-agent-skills   — kebab-case skill catalogue
```

**Code dependency direction is one-way: L3 → L2 → L1.** L2 never
imports TypeScript code from L3. The marketplace contract below is a
*data* dependency — L2 reads markdown bytes and detached signatures
from L3 — not a code dependency.

## Discovery

`MarketplaceLoader` delegates discovery to `SkillLoader`. Resolution
order, first hit wins:

1. `IQRA_MARKETPLACE_PATH` env var
2. `./aix-agent-skills/` under `process.cwd()`
3. `../aix-agent-skills/` (sibling-directory dev layout)
4. `./node_modules/@aix/agent-skills/` (eventual npm package)

## Manifest schema

L3 publishes one `skills.json` at the marketplace root:

```json
{
  "name": "aix-agent-skills",
  "skills": [
    {
      "name": "agent-memory",
      "description": "Redis-backed agent memory and context persistence",
      "file": "skills/agent-memory.md",
      "tier": "BASIC_TOOL"
    }
  ]
}
```

The legacy `Record<string, string>` form is still accepted. Skill
names MUST be kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`); L3's CI
enforces this and L2 trusts it.

## Signing protocol v1

| Algorithm        | Choice                                                 |
|------------------|--------------------------------------------------------|
| Hash             | SHA-256                                                |
| Signature        | Ed25519 (RFC 8032)                                     |
| JSON canonical   | RFC 8785 / JCS via `14-aix/canonical.ts`               |
| Encoding         | base64url, no padding                                  |

For every signable artifact, a detached `.sig` file lives alongside
the content:

| Artifact            | Path                    | Signature path           | Hashed bytes |
|---------------------|-------------------------|--------------------------|-------------|
| Manifest            | `skills.json`           | `skills.json.sig`        | JCS-canonical JSON bytes |
| Skill definition    | `skills/<name>.md`      | `skills/<name>.md.sig`   | raw UTF-8 bytes |

`.sig` files contain only the base64url-encoded 64-byte signature —
no JSON envelope. The verifier strips whitespace before decoding.

`skills.json` is canonicalized because JSON has whitespace and key-order
variability. Markdown is hashed byte-exact because that *is* the contract.

## Consumer side (L2)

```ts
import { MarketplaceLoader } from '#aix/marketplace_loader';

const loader = MarketplaceLoader.fromEnv();
const skill = await loader.loadSkill('agent-memory');
if (skill?.signed) {
  // verified Ed25519 signature against IQRA_MARKETPLACE_PUBKEY
}
```

`SkillRecord.signed` is `true` only when a `.sig` existed AND its
Ed25519 verification succeeded.

## Signature policy

| Policy        | Unsigned        | Invalid signature |
|---------------|-----------------|-------------------|
| `off`         | accept          | accept            |
| `permissive`  | accept + warn   | accept + warn     |
| `strict`      | reject (`null`) | reject            |

Default: `permissive`. Production deployments should set:

```bash
export IQRA_MARKETPLACE_PUBKEY=<base64url public key>
export IQRA_MARKETPLACE_POLICY=strict
```

Strict mode without a configured public key rejects every load and
warns at construction time.

## Configuration

| Variable                          | Default      | Purpose |
|-----------------------------------|--------------|---------|
| `IQRA_MARKETPLACE_PATH`           | (discovered) | Pin marketplace root |
| `IQRA_MARKETPLACE_PUBKEY`         | (unset)      | base64url 32-byte Ed25519 public key |
| `IQRA_MARKETPLACE_POLICY`         | `permissive` | `off` / `permissive` / `strict` |
| `IQRA_MARKETPLACE_CACHE_TTL_MS`   | `60000`      | Per-skill in-memory cache TTL; `0` disables |

Constructor options on `MarketplaceLoader` override env vars; env
vars are read at construction time only.

## Guarantees

- **No mocks**: every signature is real Ed25519 over real bytes.
- **No code from L3**: the loader reads filesystem content; it never
  `require()`s or `import`s from `aix-agent-skills`.
- **Bounded cache**: every cached entry has an explicit TTL.
- **Strict mode is fail-closed**: missing signature ⇒ `null`. Callers
  MUST handle the absence.

## Out of scope

- **Signing workflow in L3**: L3 currently does not publish `.sig`
  files. Adding `sign-release.yml` and committing a public key is a
  separate L3 PR. Until then, `permissive` is the only useful policy.
- **Schema-validation of skill markdown**: enforcing the
  Purpose/Constitutional/Operational/Failure sections belongs to L3's
  `rules/skills.md` CI gate.
- **Cross-instance cache**: the in-memory cache is per-process; a
  shared Redis-backed implementation can replace it later without
  changing the API.

## Reference

- AIX Format L1: <https://github.com/Moeabdelaziz007/aix-format>
- AIX Marketplace L3: <https://github.com/Moeabdelaziz007/aix-agent-skills>
- Ed25519 — RFC 8032 · JCS — RFC 8785
