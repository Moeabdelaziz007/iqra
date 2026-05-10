/**
 * 📈 Market Resonance Analyzer
 * 
 * النية: تحليل أنماط الشموع السوقية بدلاً من الآيات القرآنية.
 * "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" — التغابن: 10
 * 
 * لا يستخدم TopologicalResonanceHunter (مصمم للنصوص العربية).
 * بدلاً من ذلك، يحسب إحصائيات الرنين من بيانات الشموع مباشرةً.
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface MarketResonance {
  score: number;           // 0-1 resonance score
  trend_strength: number;  // اتجاه السعر
  volatility: number;      // التقلب
  volume_anomaly: number; // شذوذ الحجم
  pattern: string;         // النمط المكتشف
}

export class MarketResonanceAnalyzer {
  
  /**
   * 🔬 تحليل سلسلة الشموع وإرجاع مقياس الرنين
   */
  analyze(candles: Candle[]): MarketResonance {
    if (candles.length < 3) {
      return {
        score: 0.5,
        trend_strength: 0,
        volatility: 0,
        volume_anomaly: 0,
        pattern: 'INSUFFICIENT_DATA'
      };
    }

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    // 1. حساب التقلب (Volatility = std dev of returns)
    const returns = this._computeReturns(closes);
    const volatility = this._stdDev(returns);
    
    // 2. قوة الاتجاه (Trend Strength via linear regression slope)
    const trendStrength = this._trendStrength(closes);
    
    // 3. شذوذ الحجم (Volume Z-score)
    const volumeAnomaly = this._volumeAnomaly(volumes);
    
    // 4. اكتشاف النمط
    const pattern = this._detectPattern(candles);
    
    // 5. حساب الرنين الإجمالي (موحد بين 0 و 1)
    // الرنين العالي = اتجاه قوي + تقلب معتدل + حجم طبيعي
    const score = this._computeResonanceScore(
      trendStrength,
      volatility,
      volumeAnomaly
    );

    return {
      score: Math.max(0, Math.min(1, score)),
      trend_strength: trendStrength,
      volatility: volatility,
      volume_anomaly: volumeAnomaly,
      pattern
    };
  }

  /**
   * 📊 تحويل CSV string إلى مصفوفة شموع
   */
  static parseCSV(csv: string): Candle[] {
    const lines = csv.split('|');
    return lines.map(line => {
      const [timestamp, open, high, low, close, volume] = line.split(',').map(Number);
      return { timestamp, open, high, low, close, volume };
    }).filter(c => !isNaN(c.close));
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private _computeReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private _stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sqDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private _trendStrength(prices: number[]): number {
    const n = prices.length;
    const xMean = (n - 1) / 2;
    const yMean = prices.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (prices[i] - yMean);
      den += (i - xMean) ** 2;
    }
    
    const slope = den === 0 ? 0 : num / den;
    // تطبيع إلى [-1, 1]
    return Math.tanh(slope * 100);
  }

  private _volumeAnomaly(volumes: number[]): number {
    const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const last = volumes[volumes.length - 1];
    return avg === 0 ? 0 : (last - avg) / avg;
  }

  private _detectPattern(candles: Candle[]): string {
    const last3 = candles.slice(-3);
    if (last3.length < 3) return 'UNKNOWN';
    
    const [a, b, c] = last3;
    
    // Doji: جسم صغير + ظلال طويلة
    if (Math.abs(c.close - c.open) / (c.high - c.low + 1e-9) < 0.1) {
      return 'DOJI_REVERSAL';
    }
    
    // Three white soldiers
    if (a.close > a.open && b.close > b.open && c.close > c.open &&
        c.close > b.close && b.close > a.close) {
      return 'THREE_WHITE_SOLDIERS';
    }
    
    // Three black crows
    if (a.close < a.open && b.close < b.open && c.close < c.open &&
        c.close < b.close && b.close < a.close) {
      return 'THREE_BLACK_CROWS';
    }
    
    // Engulfing
    if (b.close < b.open && c.close > c.open && c.close > b.open && c.open < b.close) {
      return 'BULLISH_ENGULFING';
    }
    
    return 'NO_CLEAR_PATTERN';
  }

  private _computeResonanceScore(
    trend: number,
    volatility: number,
    volumeAnomaly: number
  ): number {
    // رنين عالي = اتجاه واضح (|trend| → 1) + تقلب معتدل (0.01-0.05) + حجم طبيعي (|anomaly| < 2)
    const trendScore = Math.abs(trend);
    const volScore = volatility > 0.001 && volatility < 0.05 ? 1 : 0.3;
    const volNormScore = Math.max(0, 1 - Math.abs(volumeAnomaly) / 5);
    
    return (trendScore * 0.5 + volScore * 0.3 + volNormScore * 0.2);
  }
}
