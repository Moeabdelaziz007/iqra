import { BybitClient } from './bybit_client';
import { MarketData } from './market_data';
import { TopologicalResonanceHunter } from '../../../scripts/topological_resonance_hunter';
import { RewardEngine } from '../rewards/engine';
import { MissionReporter } from '../workers/reporter';
import * as fs from 'fs';
import path from 'path';

/**
 * 🔄 IQRA Sovereign Trading | Self-Play Loop
 * 
 * النية: تنفيذ حلقة التطور الذاتي؛ تحليل -> قرار -> تنفيذ -> تعلم.
 * المرجع: "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ" - اتخاذ القرار بناءً على بصيرة رقمية.
 */
export class SelfPlayLoop {
  private bybit: BybitClient;
  private market: MarketData;
  private hunter: TopologicalResonanceHunter;

  constructor() {
    this.bybit = new BybitClient();
    this.market = new MarketData();
    this.hunter = new TopologicalResonanceHunter();
  }

  async runStep(symbol: string) {
    console.log(`\n🌀 [SELF_PLAY] Starting loop for ${symbol}`);

    // 1. جلب البيانات
    await this.market.syncCandles(symbol);
    const history = await this.market.getRecentState(symbol);
    
    if (history.length === 0) return;

    // 2. تحليل الرنين الطوبولوجي للبيانات (تحويل المصفوفة لنص لتمثيل النمط)
    const dataString = history.map(h => h.join(',')).join('|');
    const resonance = await this.hunter.analyzeResonance(dataString);
    console.log(`📈 [RESONANCE] Market Topological Score: ${resonance.score.toFixed(4)}`);

    // 3. استشارة النموذج المحلي (Ollama)
    const decision = await this.askOllama(symbol, history, resonance);
    console.log(`🤖 [DECISION] AI suggests: ${decision}`);

    // 4. التحقق من النية (Niyyah Validation)
    const isCompliant = await this.validateNiyyah(decision, resonance.score);
    
    if (isCompliant && (decision === 'BUY' || decision === 'SELL')) {
      const price = await this.bybit.getPrice(symbol);
      const qty = 0.001; // كمية تجريبية صغيرة جداً
      const side = decision.toLowerCase() as 'buy' | 'sell';
      
      const order = await this.bybit.placeOrder(side, symbol, qty);
      this.logTrade(symbol, side, qty, price, resonance.score, order.id);
      
      // 🏆 Unified Reporting: Log as a Topological Discovery
      await RewardEngine.logTopologicalDiscovery(
        resonance.score,
        [symbol, side],
        0, // H1 Proxy
        'MARKET_EXECUTION',
        0 // Tesla Sum
      );
    } else if (!isCompliant) {
      console.log('🛑 [NIYYAH_BLOCK] Action blocked due to ethical/topological non-compliance.');
    } else {
      console.log('⏳ [HOLD] No action taken.');
    }
  }

  private async validateNiyyah(decision: string, resonanceScore: number): Promise<boolean> {
    // النية: التأكد من أن القرار يتماشى مع "الدستور" ومبدأ الرنين.
    // إذا كان الرنين منخفضاً جداً، نعتبر الفعل "متسرعاً" وغير رزين.
    if (resonanceScore < 0.3) return false; 
    
    // يمكن هنا إضافة فحص أعمق مع DASTŪR.md
    return true;
  }

  private async askOllama(symbol: string, history: number[][], resonance: any): Promise<string> {
    const prompt = `
      # PERSONA: Sovereign Market Analyst (IQRA Core)
      # TONE: Stoic, Analytical, Risk-Averse, Pattern-Centric
      
      You are the IQRA Sovereign Trading Agent. Your mission is to preserve capital and identify "Topological Resonance" in the market.
      
      ## DATA INPUT
      - Symbol: ${symbol}
      - Recent Candles (5m): ${JSON.stringify(history.slice(-10))}
      - Topological Resonance Score: ${resonance.score}
      - Fractal Dimension: ${resonance.fractalDimension}
      
      ## PATTERN ANALYSIS TASK
      1. Identify if the current price action matches a known sovereign pattern (Resonance > 0.7).
      2. Check for "Market Fatigue" in the candle history.
      3. Validate against the "Niyyah" of long-term stewardship.
      
      ## CONSTRAINTS
      - Decision must be exactly one word: BUY, SELL, or HOLD.
      - Never use leverage. 
      - Respect the 2% strict risk limit.
      
      ## YOUR SOVEREIGN DECISION:
    `;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt: prompt,
          stream: false,
        }),
      });
      const result = await response.json();
      const text = result.response.trim().toUpperCase();
      if (text.includes('BUY')) return 'BUY';
      if (text.includes('SELL')) return 'SELL';
      return 'HOLD';
    } catch (e) {
      console.error('⚠️ [OLLAMA_ERROR] Could not connect to local model. Falling back to HOLD.');
      return 'HOLD';
    }
  }

  private logTrade(symbol: string, side: string, qty: number, price: number, resonance: number, orderId: string) {
    const logPath = path.join(process.cwd(), 'TRADES.md');
    const entry = `| ${new Date().toISOString()} | ${symbol} | ${side} | ${qty} | ${price} | ${resonance.toFixed(4)} | ${orderId} |\n`;
    
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '# 📓 IQRA Trading Ledger (TRADES)\n\n| Date | Symbol | Side | Qty | Price | Resonance | OrderID |\n|---|---|---|---|---|---|---|\n');
    }
    fs.appendFileSync(logPath, entry);
  }
}
