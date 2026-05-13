/**
 * 🔁 InverseDesign — minimal "inverse mirror" skill used by tawbah_loop.
 *
 * Given a failure signature (test name, error class, location), proposes
 * a small, deterministic counter-action: revert, rerun-with-trace, or
 * widen-context. Does NOT call any LLM. Stays inside the synchronous
 * sovereign path so the tawbah loop can act fast.
 */

export type TawbahAction =
  | { kind: 'revert'; targetRef?: string; reason: string }
  | { kind: 'rerun_with_trace'; reason: string }
  | { kind: 'widen_context'; addPaths: string[]; reason: string }
  | { kind: 'halt'; reason: string };

export interface FailureSignature {
  testName?: string;
  errorClass?: string;
  filePath?: string;
  message?: string;
}

export class InverseDesign {
  /**
   * Propose a counter-action for a failure signature. Pure function:
   * deterministic for the same input, no side effects.
   */
  static propose(sig: FailureSignature): TawbahAction {
    const msg = (sig.message ?? '').toLowerCase();
    const err = (sig.errorClass ?? '').toLowerCase();

    if (err === 'sovereignerror' || msg.includes('haram') || msg.includes('mock data')) {
      return { kind: 'halt', reason: 'Constitutional violation; halting per MĪTHĀQ.' };
    }

    if (msg.includes('timeout') || msg.includes('etimedout')) {
      return { kind: 'rerun_with_trace', reason: 'Transient timeout; rerun with full trace.' };
    }

    if (msg.includes('cannot find module') || msg.includes('is not defined')) {
      return {
        kind: 'widen_context',
        addPaths: sig.filePath ? [sig.filePath] : [],
        reason: 'Missing symbol; widen context to include caller graph.',
      };
    }

    return { kind: 'revert', reason: 'Default: revert to last clean state.' };
  }

  /**
   * Used by TawbahLoop: synthesize a minimal "binder" code suggestion
   * from a free-form error log. Deterministic (no LLM). Returns a small
   * TypeScript snippet that the caller can place into a PR for human
   * review. Never auto-applied.
   */
  static async designBinder(errorLog: string): Promise<string> {
    const log = String(errorLog || '');
    const sig: FailureSignature = {
      message: log,
      errorClass: (log.match(/\b([A-Z][A-Za-z]+Error)\b/) || [, ''])[1] || undefined,
      filePath: (log.match(/(?:at |in )([^\s:]+\.ts)/) || [, ''])[1] || undefined,
    };
    const action = this.propose(sig);

    // Deterministic header (no wall-clock timestamp). Two runs of the
    // binder on identical input produce byte-identical output, which
    // matters when the binder text is canonicalized + signed downstream.
    const header = `// IQRA Tawbah binder — deterministic design\n// Action: ${action.kind} — ${action.reason}\n`;

    switch (action.kind) {
      case 'halt':
        return `${header}\nthrow new Error('Sovereign halt: ${action.reason.replace(/'/g, "\\'")}');\n`;
      case 'rerun_with_trace':
        return `${header}\nexport async function rerunWithTrace<T>(fn: () => Promise<T>): Promise<T> {\n  try { return await fn(); }\n  catch (e) { console.error('[TAWBAH:rerun]', e); throw e; }\n}\n`;
      case 'widen_context': {
        const paths = action.addPaths.length ? action.addPaths.join(', ') : '(none)';
        return `${header}\n// Suggested: widen the caller graph to include: ${paths}\nexport const WIDEN_CONTEXT = ${JSON.stringify(action.addPaths)};\n`;
      }
      case 'revert':
      default:
        return `${header}\n// Suggested: revert to last clean ref via GitSkill.revertTo(<ref>)\nexport const SUGGEST_REVERT = true;\n`;
    }
  }
}

export default InverseDesign;
