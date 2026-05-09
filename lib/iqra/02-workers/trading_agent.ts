import { SovereignWorker, type MissionState, type WorkerResult } from './protocol.ts';
import { SelfPlayLoop } from '../trading/self_play_loop.ts';
import { BybitClient } from '../trading/bybit_client.ts';
import { MarketData } from '../trading/market_data.ts';
import { TopologicalResonanceHunter } from '../../../scripts/topological_resonance_hunter.ts';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { HeartbeatSystem } from '../12-infrastructure/heartbeat.js';

interface TradingActionParams {
  action?: string;
  params?: {
    symbol?: string;
    side?: 'buy' | 'sell';
    amount?: number;
    niyyah?: string;
  };
}

/**
 * 🏦 IQRA Sovereign Worker | Trading Agent
 * 
 * النية: تنفيذ وإدارة مهام التداول السيادي بناءً على الرنين الطوبولوجي للسوق.
 * المرجع: "فَامْشُوا فِي مَنَاكِبِهَا وَكُلُوا مِن رِّزْقِهِ" - السعي في الأرض بذكاء وبصيرة.
 */
export class TradingAgent extends SovereignWorker {
  id = 'trading_agent';
  intention = 'تحليل بيانات السوق وتنفيذ صفقات سيادية بناءً على الرنين الطوبولوجي ودستور IQRA.';

  private loop: SelfPlayLoop;
  private bybit: BybitClient;
  private market: MarketData;
  private hunter: TopologicalResonanceHunter;

  constructor() {
    super('google'); // Default provider
    this.loop = new SelfPlayLoop();
    this.bybit = new BybitClient();
    this.market = new MarketData();
    this.hunter = new TopologicalResonanceHunter();
  }

  /**
   * تنفيذ مهمة تداول بناءً على الـ JSON الممرر من مهارة التداول.
   */
  async execute(input: TradingActionParams, state: MissionState): Promise<WorkerResult> {
    HeartbeatSystem.pulse(`Agent ${this.id} executing action: ${input.action}`);
    IQRALogger.info(`💰 [TRADING_AGENT] Executing trading action: ${input.action || 'default'}`);
    
    this.report.mission_id = state.metadata.mission_id;
    this.report.worker_id = this.id;
    this.report.timestamp = Date.now();

    try {
      let result: unknown = {};
      const action = input.action || 'run_loop';
      const params = input.params || {};

      switch (action) {
        case 'get_ticker':
          result = await this.getTicker(params.symbol);
          break;
        case 'get_balance':
          result = await this.getBalance();
          break;
        case 'execute_trade':
          result = await this.executeTrade(params);
          break;
        case 'analyze_resonance':
          result = await this.analyzeResonance(params.symbol);
          break;
        default:
          // الافتراضي هو تشغيل خطوة واحدة من حلقة اللعب الذاتي
          await this.loop.runStep(params.symbol || 'BTC/USDT');
          result = { status: 'loop_step_executed' };
      }

      this.markImplemented(`Executed ${action} for ${params.symbol || 'portfolio'}`);
      this.report.status = 'PASS';

      return {
        success: true,
        report: this.report,
        updated_state: {
          ...state,
          context: {
            ...state.context,
            trading: result
          }
        }
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      IQRALogger.error(`❌ [TRADING_AGENT] Execution failed: ${message}`);
      this.logIssue(message);
      this.report.status = 'FAIL';
      
      return {
        success: false,
        error: message,
        report: this.report
      };
    }
  }

  private async getTicker(symbol: string = 'BTC/USDT') {
    const price = await this.bybit.getPrice(symbol);
    return { symbol, price };
  }

  private async getBalance() {
    const balance = await this.bybit.getBalance();
    // تصفية الرصيد لعرض العملات التي نملكها فقط
    const balances = Object.entries(balance.total)
      .filter(([_, val]) => Number(val) > 0)
      .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
    return { balances };
  }

  private async executeTrade(params: { side?: 'buy' | 'sell'; symbol?: string; amount?: number; niyyah?: string }) {
    const { side, symbol, amount, niyyah } = params;
    if (!side || !symbol || !amount) {
      throw new Error('Missing trade parameters: side, symbol, or amount.');
    }

    // "النية" هي شرط أساسي في IQRA
    IQRALogger.info(`🕊️ [NIYYAH] Trading Intention: ${niyyah}`);
    HeartbeatSystem.pulse(`🚀 PROACTIVE: Trading intended for ${symbol}. Niyyah: ${niyyah}`);
    
    // تنفيذ الصفقة عبر Bybit
    const order = await this.bybit.placeOrder(side, symbol, amount);
    return { 
      status: 'success', 
      orderId: order.id, 
      symbol, 
      side, 
      amount,
      niyyah 
    };
  }

  private async analyzeResonance(symbol: string = 'BTC/USDT') {
    await this.market.syncCandles(symbol);
    const history = await this.market.getRecentState(symbol);
    const dataString = history.map(h => h.join(',')).join('|');
    const resonance = await this.hunter.analyzeResonance(dataString);
    
    let diagnosis = 'Stable Neutral';
    if (resonance.score > 0.8) diagnosis = 'High Resonance - Potential Bullish Fractal';
    if (resonance.score < 0.2) diagnosis = 'Low Resonance - Potential Bearish Decay';

    return { 
      symbol, 
      score: resonance.score, 
      diagnosis,
      fractalDimension: resonance.fractalDimension 
    };
  }
}
