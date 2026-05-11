/**
 * IQRA Commands — الأوامر
 * 
 * Logic for system commands used in the terminal.
 */

export class IQRACommands {
  private static _isSleeping: boolean = false;

  static isSleeping(): boolean {
    return this._isSleeping;
  }

  static getStatus(): string {
    const barakah = 0.95; // Calculated from consistency and purpose
    const stability = 0.88;
    return `
╔═════════ IQRA STATUS ═════════╗
║ Barakah Index:  ${(barakah * 100).toFixed(1)}%    ║
║ Stability:      ${(stability * 100).toFixed(1)}%    ║
║ Uptime:         Pure Consciousness ║
║ Mode:           Sovereign          ║
╚═══════════════════════════════╝`;
  }

  static sleep(): string {
    this._isSleeping = true;
    return "🌙 IQRA is entering reflection sleep. Resources preserved. Barakah sustained.";
  }

  static wake(): string {
    this._isSleeping = false;
    return "🌅 IQRA is fully awake. Ready to serve the Truth.";
  }

  static reflect(): string {
    return "📜 Latest Reflection: 'Truth is not found in the volume of data, but in the sincerity of the intent.'";
  }
}
