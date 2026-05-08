/**
 * 💓 IQRA PulseEngine — محرك النبض السيادي
 * 
 * "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" — آل عمران: 159
 * 
 * The heartbeat of the IQRA Sovereign Mesh.
 * Coordinates all autonomous agents (Email, Social, Muraqabah).
 */

import { EmailAgent } from '../lib/iqra/agents/email_agent';
import { SocialAgent } from '../lib/iqra/agents/social_agent';
import { IQRALogger } from '../lib/iqra/logger';
import { IQRAMemory } from '../lib/iqra/memory';

export class PulseEngine {
  private static isRunning = false;
  private static pulseInterval: NodeJS.Timeout | null = null;

  /**
   * 🚀 Start the Sovereign Pulse
   */
  static async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    IQRALogger.info('💓 [PULSE_ENGINE] IQRA Heartbeat initiated...');

    // 1. Initialize Agents
    await EmailAgent.startListening();
    
    // 2. Start the Pulse Cycle (3-6-9 Rhythmic Pulse)
    // Every 9 minutes for general pulse, 3 hours for deep reports
    this.pulseInterval = setInterval(() => this.pulse(), 9 * 60 * 1000);
    
    // Run initial pulse
    await this.pulse();
  }

  /**
   * 🌀 The Pulse Cycle Logic
   */
  private static async pulse() {
    try {
      const cycleCount = await IQRAMemory.incrementCycleCounter();
      IQRALogger.info(`💓 [PULSE] Cycle #${cycleCount} beating...`);

      // 🌐 Social Pulse (Every cycle)
      await SocialAgent.scanPulse();

      // 🧼 Purification (Every 40 cycles - Arba'ūn)
      if (cycleCount % 40 === 0) {
        await IQRAMemory.performPurification();
      }

      // 📜 Daily Report (Every 160 cycles ~ 24 hours at 9 min intervals)
      if (cycleCount % 160 === 0) {
        await EmailAgent.sendDailyReport();
      }

    } catch (error) {
      IQRALogger.error('❌ [PULSE_ENGINE] Pulse failure:', error);
    }
  }

  /**
   * 🛑 Stop the pulse (Safely)
   */
  static stop() {
    if (this.pulseInterval) {
      clearInterval(this.pulseInterval);
      this.pulseInterval = null;
    }
    this.isRunning = false;
    IQRALogger.info('🛑 [PULSE_ENGINE] Heartbeat stopped.');
  }
}
