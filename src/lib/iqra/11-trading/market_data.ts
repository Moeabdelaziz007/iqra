import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * 📊 IQRA Sovereign Trading | Market Data
 * 
 * النية: جمع وحفظ بيانات السوق في "الذاكرة الساخنة" (Hot Memory) للتحليل السريع.
 * المرجع: "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ" - رصد أنماط الرزق في حركة الأسعار.
 */
export class MarketData {
  private redis: Redis;
  private readonly baseUrl = 'https://api-testnet.bybit.com';

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * جلب شموع 5 دقائق وحفظها في Upstash.
   */
  async syncCandles(symbol: string): Promise<void> {
    console.log(`📡 [MARKET_SYNC] Fetching 5m candles for ${symbol}`);
    
    // تحويل الرمز من BTC/USDT إلى BTCUSDT
    const apiSymbol = symbol.replace('/', '');
    const url = `${this.baseUrl}/v5/market/kline?category=spot&symbol=${apiSymbol}&interval=5&limit=100`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.retCode !== 0) {
      throw new Error(`Market Data Sync Failed: ${result.retMsg}`);
    }

    // Bybit V5 Kline format: [startTime, open, high, low, close, volume, turnover]
    // ننسقها لتتوافق مع OHLCV الكلاسيكي: [time, open, high, low, close, volume]
    const candles = result.result.list.map((k: any) => [
      parseInt(k[0]), // time
      parseFloat(k[1]), // open
      parseFloat(k[2]), // high
      parseFloat(k[3]), // low
      parseFloat(k[4]), // close
      parseFloat(k[5])  // volume
    ]).reverse(); // Bybit returns newest first, we want chronological order

    // حفظ البيانات في Redis مع انتهاء صلاحية بعد 7 أيام
    const key = `market:candles:${symbol}`;
    await this.redis.set(key, JSON.stringify(candles), { ex: 60 * 60 * 24 * 7 });
    console.log(`✅ [MARKET_SYNC] Saved ${candles.length} candles to Hot Memory.`);
  }

  /**
   * جلب الحالة الأخيرة للسوق لاتخاذ القرار.
   */
  async getRecentState(symbol: string, lookback: number = 50): Promise<number[][]> {
    const key = `market:candles:${symbol}`;
    const data = await this.redis.get(key) as string | null;
    if (!data) return [];
    
    const allCandles = typeof data === 'string' ? JSON.parse(data) : data;
    return allCandles.slice(-lookback);
  }
}
