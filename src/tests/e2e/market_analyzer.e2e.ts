/**
 * 🧪 E2E Tests: MarketResonanceAnalyzer
 *
 * "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ" — النجم: 39
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MarketResonanceAnalyzer, Candle } from '#trading/market_analyzer';
import { setupMockEnv, resetMockEnv } from '../utils/mock_env';

beforeAll(() => {
  setupMockEnv();
});

afterAll(() => {
  resetMockEnv();
});

describe('MarketResonanceAnalyzer', () => {
  const analyzer = new MarketResonanceAnalyzer();

  it('should analyze uptrend with high resonance', () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 105, low: 99, close: 102, volume: 1000 },
      { timestamp: 2, open: 102, high: 108, low: 101, close: 106, volume: 1200 },
      { timestamp: 3, open: 106, high: 112, low: 105, close: 110, volume: 1100 },
      { timestamp: 4, open: 110, high: 115, low: 109, close: 114, volume: 1300 },
      { timestamp: 5, open: 114, high: 118, low: 113, close: 117, volume: 1250 },
    ];

    const result = analyzer.analyze(candles);

    expect(result.score).toBeGreaterThan(0.5);
    expect(result.trend_strength).toBeGreaterThan(0.5);
    expect(result.pattern).toBe('THREE_WHITE_SOLDIERS');
  });

  it('should analyze downtrend with bearish pattern', () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 120, high: 122, low: 118, close: 118, volume: 1000 },
      { timestamp: 2, open: 118, high: 119, low: 114, close: 115, volume: 1200 },
      { timestamp: 3, open: 115, high: 116, low: 111, close: 112, volume: 1100 },
      { timestamp: 4, open: 112, high: 113, low: 108, close: 108, volume: 1300 },
    ];

    const result = analyzer.analyze(candles);

    expect(result.score).toBeGreaterThan(0.3);
    expect(result.trend_strength).toBeLessThan(-0.5);
    expect(result.pattern).toBe('THREE_BLACK_CROWS');
  });

  it('should handle insufficient data gracefully', () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 105, low: 99, close: 102, volume: 1000 },
    ];

    const result = analyzer.analyze(candles);

    expect(result.score).toBe(0.5);
    expect(result.pattern).toBe('INSUFFICIENT_DATA');
  });

  it('should parse CSV format correctly', () => {
    const csv = '1,100,105,99,102,1000|2,102,108,101,106,1200|3,106,112,105,110,1100';
    const candles = MarketResonanceAnalyzer.parseCSV(csv);

    expect(candles).toHaveLength(3);
    expect(candles[0]).toEqual({
      timestamp: 1,
      open: 100,
      high: 105,
      low: 99,
      close: 102,
      volume: 1000,
    });
  });

  it('should calculate euclidean distance correctly', () => {
    // Not directly testing euclideanDistance as it's in IQRAMemory now
    // But we can test the resonance calculation logic
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 110, low: 95, close: 105, volume: 2000 },
      { timestamp: 2, open: 105, high: 115, low: 102, close: 112, volume: 2500 },
      { timestamp: 3, open: 112, high: 120, low: 110, close: 118, volume: 2200 },
    ];

    const result = analyzer.analyze(candles);

    expect(result.volatility).toBeGreaterThan(0);
    expect(result.volume_anomaly).toBeDefined();
  });
});
