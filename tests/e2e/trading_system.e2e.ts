import { it, expect, describe, beforeAll } from 'vitest';
import { SelfPlayLoop } from '#core/../11-trading/self_play_loop';
import { MarketData } from '#core/../11-trading/market_data';
import { IQRALogger } from '#infra/logger';

/**
 * 💹 IQRA Trading E2E — "The Sovereign Market Pulse"
 * 
 * الهدف: التأكد من أن النظام يتفاعل مع بيانات السوق الحقيقية وينفذ خوارزمية AlphaZero (MCTS).
 */
describe('IQRA Sovereign Trading E2E', () => {
  let trader: SelfPlayLoop;
  let market: MarketData;

  beforeAll(() => {
    trader = new SelfPlayLoop();
    market = new MarketData();
  });

  it('should sync real market data and run AlphaZero MCTS cycle', async () => {
    const symbol = 'BTCUSDT';
    
    IQRALogger.info(`🚀 Starting E2E Trading Test for ${symbol}`);
    
    // 1. Sync real candles
    await market.syncCandles(symbol);
    const history = await market.getRecentState(symbol);
    
    expect(history.length).toBeGreaterThan(0);
    IQRALogger.info(`✅ Synced ${history.length} candles from Bybit.`);

    // 2. Run MCTS Cycle
    // This will log to TRADES.md and TrustChain if an action is taken.
    await trader.runStep(symbol);

    IQRALogger.info('✅ AlphaZero MCTS cycle completed successfully.');
  }, 60000); // 60s timeout for market sync
});
