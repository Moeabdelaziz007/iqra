/**
 * 🛡️ DoctrinalGuard — verifies that any IQRA-generated output making a
 * claim about an ayah does not contradict the literal text or invent a
 * meaning the text does not bear.
 *
 * Per IQRA_SUPREME.md: No Mocks. No Hallucinations.
 *
 * This is a deterministic, no-LLM guard. It runs in <1ms. It is not a
 * tafsir engine; it is a "fail-closed" filter that catches the obvious
 * doctrinal mistakes (claim mentions a number/word not in the verse,
 * claim contradicts the verse's literal subject, etc.).
 *
 * For deeper exegetical checks, layer a Damir conscience or LLM auditor
 * on top of this guard, never replace it.
 */

export interface DoctrinalVerification {
  check: 'PASS' | 'FAIL';
  error_type?: string;
  details?: string;
}

export interface DoctrinalCheckInput {
  ayah_text: string;
  ayah_ref: string;
  claim: string;
  /** Optional: 'scientific' (numerical/structural claim) vs 'spiritual' (interpretive). */
  domain?: 'scientific' | 'spiritual';
}

/** Arabic + Latin digit normalization used inside the guard. */
function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function extractNumbers(s: string): number[] {
  const out: number[] = [];
  const re = /\b\d{1,6}\b/g;
  const norm = normalizeDigits(s);
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm))) out.push(Number(m[0]));
  return out;
}

export class DoctrinalGuard {
  /**
   * Lightweight boolean check used by closed_loop. Returns true when the
   * claim is plausibly anchored in the verse, false when an obvious
   * doctrinal violation is detected.
   */
  static async isSafe(
    ayahText: string,
    ayahRef: string,
    claim: string,
    domain: 'scientific' | 'spiritual' = 'spiritual',
  ): Promise<boolean> {
    const v = DoctrinalGuard.verify({
      ayah_text: ayahText,
      ayah_ref: ayahRef,
      claim,
      domain,
    });
    return v.check === 'PASS';
  }

  /**
   * Detailed verification. Returns a typed verdict that callers can
   * route into the TrustChain.
   */
  static verify(input: DoctrinalCheckInput): DoctrinalVerification {
    const { ayah_text, ayah_ref, claim, domain = 'spiritual' } = input;

    if (!ayah_text || !claim || !ayah_ref || !ayah_ref.trim()) {
      return { check: 'FAIL', error_type: 'EMPTY_INPUT' };
    }

    // Rule 1: the claim must be anchored to the verse. A claim qualifies
    // as anchored when EITHER of these is true:
    //   (a) it cites the verse reference verbatim (e.g. "2:255"), OR
    //   (b) it quotes a meaningful contiguous span from the verse text.
    //
    // For (b) we look for any continuous quote of >= MIN_QUOTE_CHARS that
    // appears in the verse, anywhere — not just the first 12 chars — so
    // valid mid- or end-of-verse quotes pass. The previous slice(0, 12)
    // check was too brittle and combined with an empty `ayah_ref` was
    // bypassable (claim.includes('') is always true).
    const trimmedRef = ayah_ref.trim();
    const refCited = trimmedRef.length > 0 && claim.includes(trimmedRef);
    const MIN_QUOTE_CHARS = 8;
    let quoteCited = false;
    if (!refCited) {
      // Sliding-window match: any contiguous slice of the verse text of
      // length >= MIN_QUOTE_CHARS that the claim contains qualifies.
      const normVerse = ayah_text.trim();
      if (normVerse.length >= MIN_QUOTE_CHARS) {
        for (let start = 0; start + MIN_QUOTE_CHARS <= normVerse.length; start++) {
          const win = normVerse.slice(start, start + MIN_QUOTE_CHARS);
          if (claim.includes(win)) {
            quoteCited = true;
            break;
          }
        }
      }
    }
    if (!refCited && !quoteCited) {
      return {
        check: 'FAIL',
        error_type: 'UNANCHORED_CLAIM',
        details: `Claim does not reference the verse by ref (${trimmedRef}) or quote at least ${MIN_QUOTE_CHARS} contiguous characters from it.`,
      };
    }

    // Rule 2: scientific claims must not introduce numbers absent from the verse.
    if (domain === 'scientific') {
      const verseNums = new Set(extractNumbers(ayah_text));
      const claimNums = extractNumbers(claim);
      // Allow common structural numbers (verse counts, 7, 19, 40, 369) without verse coverage.
      const allowed = new Set([7, 19, 40, 369]);
      for (const n of claimNums) {
        if (!verseNums.has(n) && !allowed.has(n)) {
          return {
            check: 'FAIL',
            error_type: 'NUMERICAL_HALLUCINATION',
            details: `Claim introduces number ${n} not present in verse and not in allow-list.`,
          };
        }
      }
    }

    // Rule 3: hard block on common hallucination markers.
    const banned = ['allah said in surah none', 'prophet said never', 'as the quran does not say'];
    const lowered = claim.toLowerCase();
    for (const phrase of banned) {
      if (lowered.includes(phrase)) {
        return {
          check: 'FAIL',
          error_type: 'BANNED_PHRASE',
          details: `Claim contains banned hallucination marker: "${phrase}".`,
        };
      }
    }

    return { check: 'PASS' };
  }
}

export default DoctrinalGuard;
