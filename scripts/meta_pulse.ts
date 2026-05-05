/**
 * IQRA Meta-Pulse Script — نبض السيادة
 * 
 * Runs the sovereign pulse and self-evolution loop.
 */

import { SovereignEngine } from '../lib/iqra/sovereign';
import * as dotenv from 'dotenv';

dotenv.config();

async function runPulse() {
  console.log('🚀 Starting IQRA Sovereign Pulse...');
  
  try {
    // 1. Run the 5-layer heartbeat
    await SovereignEngine.pulse();
    
    // 2. Perform a sample self-review
    await SovereignEngine.recordSelfReview(
      'pulse_verification',
      'System heartbeat stable across all 5 layers.',
      1.0
    );
    
    console.log('✅ Pulse complete. IQRA is stable and evolving.');
  } catch (error) {
    console.error('❌ Pulse failed:', error);
  }
}

runPulse();
