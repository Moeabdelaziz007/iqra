/**
 * 📈 IQRA Bybit Integration — "ميزان الربح"
 * 
 * Integrated Market Data and Trading via Bybit V5 API.
 * Anchored in IQRAMemory for unified system state.
 * 
 * "وَأَقِيمُوا الْوَزْنَ بِالْقِسْطِ وَلَا تُخْسِرُوا الْمِيزَانَ" — الرحمن: 9
 */

import { IQRALogger } from '../12-infrastructure/logger';
import { IQRAMemory } from '../03-memory/memory';
import { ByzantineFilter } from '../06-security/byzantine_filter';

export interface BybitTicker {
  symbol: string;
  lastPrice: string;
  volume24h: string;
  highPrice24h: string;
  lowPrice24h: string;
  timestamp: number;
}

export class BybitEngine {
  private static readonly API_URL = 'https://api.bybit.com/v5';
  private static _apiKey: string | null = null;
  private static _apiSecret: string | null = null;

  static setup(apiKey: string, apiSecret: string) {
    this._apiKey = apiKey;
    this._apiSecret = apiSecret;
    IQRALogger.info('📈 [BYBIT] Engine configured and ready.');
  }

  /**
   * Fetches latest market data and updates IQRA's collective memory.
   */
  static async updateMarketPulse(symbol: string = 'BTCUSDT'): Promise<BybitTicker | null> {
    try {
      const url = `${this.API_URL}/market/tickers?category=spot&symbol=${symbol}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.retCode !== 0) {
        throw new Error(`Bybit API Error: ${data.retMsg}`);
      }

      const ticker = data.result.list[0];
      const tickerData: BybitTicker = {
        symbol: ticker.symbol,
        lastPrice: ticker.lastPrice,
        volume24h: ticker.turnover24h,
        highPrice24h: ticker.highPrice24h,
        lowPrice24h: ticker.lowPrice24h,
        timestamp: Date.now()
      };

      // 🧠 Unified Memory: Store in Hot Cache
      await IQRAMemory.set(`market:ticker:${symbol}`, tickerData);
      
      // 🛡️ Byzantine Check: Add to history for anomaly detection
      const historyKey = `market:history:${symbol}`;
      await IQRAMemory.appendList(historyKey, parseFloat(tickerData.lastPrice));
      
      const history = await IQRAMemory.getRecentList<number>(historyKey, 20);
      const anomaly = ByzantineFilter.detectZScore(history, parseFloat(tickerData.lastPrice));
      
      if (anomaly.isAnomaly) {
        IQRALogger.warn(`🚨 [BYBIT] Market Anomaly Detected for ${symbol}: ${anomaly.reason}`);
        await IQRAMemory.set(`market:anomaly:${symbol}`, anomaly);
      }

      return tickerData;
    } catch (e) {
      IQRALogger.error('❌ [BYBIT] Market pulse update failed:', e);
      return null;
    }
  }

  /**
   * Executes a Trade (Placeholder for Sovereign Protocol 2-3-7 confirmation)
   */
  static async executeTrade(symbol: string, side: 'Buy' | 'Sell', qty: string) {
    if (!this._apiKey || !this._apiSecret) {
      throw new Error("Bybit API credentials missing");
    }

    IQRALogger.info(`🚜 [BYBIT] Sovereign Execution Requested: ${side} ${qty} ${symbol}`);
    
    // In a real implementation, we would sign the request here.
    // For now, we log the intent as part of the "One Body" state.
    await IQRAMemory.appendList('trade_intents', {
      symbol, side, qty, timestamp: Date.now(), status: 'PENDING_SOVEREIGN_CONFIRMATION'
    });
  }
}
