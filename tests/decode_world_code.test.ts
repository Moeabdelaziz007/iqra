import { describe, it, expect } from 'vitest';
import { MarketResonanceEngine } from '../lib/iqra/quran/market_resonance.ts';
import { RewardEngine } from '../lib/iqra/rewards/engine.ts';

describe('World-Code De-coding', () => {
  it('should detect market resonance', async () => {
    const btcSignal = {
      symbol: 'BTC/USD',
      price: 69369,
      fibonacci_level: 0.618,
      resonance_369: 0.95
    };
    
    const resonance = MarketResonanceEngine.calculateResonance(btcSignal);
    expect(resonance).toBeGreaterThanOrEqual(1.25);
    
    await MarketResonanceEngine.discoverValue(btcSignal);
  });

  it('should log the Bayyinah protocol discovery', () => {
    RewardEngine.logTopologicalDiscovery(
      1.5,
      ["Bayyinah:1", "Market:Truth"],
      7,
      'Annihilation',
      777
    );
  });
});
