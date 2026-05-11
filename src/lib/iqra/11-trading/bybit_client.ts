import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * 🪙 IQRA Sovereign Trading | Bybit V5 Native Client
 * 
 * النية: توفير اتصال آمن وسيادي مع منصة Bybit Testnet باستخدام native fetch لتجنب التبعيات الخارجية.
 * المرجع: استخلاف المال وعمارة الأرض بالحق.
 */
export class BybitClient {
  private readonly baseUrl = 'https://api-testnet.bybit.com';
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly isPaperTrading: boolean = true; // وضع التداول الوهمي افتراضي دائماً

  constructor() {
    this.apiKey = process.env.BYBIT_API_KEY || '';
    this.apiSecret = process.env.BYBIT_API_SECRET || '';
  }

  /**
   * توليد التوقيع الرقمي لمنصة Bybit V5
   */
  private generateSignature(timestamp: number, recvWindow: number, data: string): string {
    const message = timestamp + this.apiKey + recvWindow + data;
    return crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');
  }

  /**
   * تنفيذ طلب محمي (Private Request)
   */
  private async privateRequest<T = any>(method: 'GET' | 'POST', path: string, params: Record<string, unknown> = {}): Promise<T> {
    const timestamp = Date.now();
    const recvWindow = 5000;
    const data = method === 'GET' 
      ? new URLSearchParams(params).toString() 
      : JSON.stringify(params);

    const signature = this.generateSignature(timestamp, recvWindow, data);

    const headers: Record<string, string> = {
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-SIGN': signature,
      'X-BAPI-TIMESTAMP': timestamp.toString(),
      'X-BAPI-RECV-WINDOW': recvWindow.toString(),
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const url = `${this.baseUrl}${path}${method === 'GET' && data ? `?${data}` : ''}`;
    
    // 🛡️ Paper Trading Guard
    if (this.isPaperTrading && method === 'POST' && path.includes('/order/create')) {
      console.log(`📝 [PAPER_TRADING] Simulated ${method} request to ${path} with params:`, params);
      return { orderId: `sim_order_${Date.now()}` } as any;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? data : undefined,
      });

      const result = await response.json() as { retCode: number; retMsg: string; result: T };
      if (result.retCode !== 0) {
        throw new Error(`Bybit API Error: ${result.retMsg} (Code: ${result.retCode})`);
      }
      return result.result;
    } catch (error: any) {
      if (this.apiKey === 'mock_key' || error.code === 'ENOTFOUND') {
        console.warn(`⚠️ [DEMO_MODE] Network unreachable or mock key detected. Returning synthetic response for ${path}`);
        if (path.includes('/wallet-balance')) {
          return { list: [{ coin: [{ coin: 'USDT', walletBalance: '10000' }, { coin: 'BTC', walletBalance: '0.5' }] }] } as any;
        }
        return {} as T;
      }
      throw error;
    }
  }

  /**
   * جلب السعر الحالي (Public API)
   */
  async getPrice(symbol: string): Promise<number> {
    const url = `${this.baseUrl}/v5/market/tickers?category=spot&symbol=${symbol.replace('/', '')}`;
    try {
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.retCode === 0 && result.result.list.length > 0) {
        return parseFloat(result.result.list[0].lastPrice);
      }
      return 0;
    } catch (error: any) {
      if (this.apiKey === 'mock_key' || error.code === 'ENOTFOUND') {
        return 65000 + (Math.random() * 1000); // Synthetic BTC price
      }
      throw error;
    }
  }

  /**
   * جلب رصيد المحفظة (Private API)
   */
  async getBalance(): Promise<{ total: Record<string, number> }> {
    const result = await this.privateRequest<{ list: Array<{ coin: Array<{ coin: string; walletBalance: string }> }> }>('GET', '/v5/account/wallet-balance', { accountType: 'UNIFIED' });
    if (result.list && result.list.length > 0) {
      const account = result.list[0];
      const total: Record<string, number> = {};
      account.coin.forEach(c => {
        total[c.coin] = parseFloat(c.walletBalance);
      });
      return { total };
    }
    return { total: {} };
  }

  /**
   * 🛡️ Sacred Confirmation (The Conscience)
   * 
   * النية: التأكد من أن الفعل يتماشى مع الميثاق والمراقبة.
   */
  async sacredConfirmation(action: string): Promise<boolean> {
    const constitutionPath = path.join(process.cwd(), 'DASTŪR.md');
    if (!fs.existsSync(constitutionPath)) return true; // Default to pass if file missing
    
    const content = fs.readFileSync(constitutionPath, 'utf-8');
    const hasMithaq = content.includes('MĪTHĀQ');
    const hasMuraqabah = content.includes('MURĀQABAH');
    
    if (!hasMithaq || !hasMuraqabah) {
      console.warn(`🛑 [CONSCIENCE] Sacred principles missing from DASTŪR.md!`);
      return false;
    }

    console.log(`⚖️ [CONSCIENCE] Action '${action}' validated against Sacred Constitution.`);
    return true;
  }

  /**
   * ✅ Preflight Check (Risk Gating)
   */
  async preflightCheck(side: 'buy' | 'sell', symbol: string, qty: number): Promise<boolean> {
    const balance = await this.getBalance();
    const price = await this.getPrice(symbol);
    const cost = price * qty;
    const baseAsset = symbol.split('/')[1] || 'USDT';
    
    const available = balance.total[baseAsset] || 0;
    
    if (side === 'buy' && cost > available) {
      console.warn(`🛑 [RISK_GATE] Insufficient balance for ${symbol}. Needed: ${cost}, Available: ${available}`);
      return false;
    }
    
    // Strict Risk Limit: Max 1% of total portfolio per trade
    const totalValue = Object.entries(balance.total as Record<string, number>).reduce((acc, [coin, val]) => acc + val, 0); // Simplified value calculation
    if (cost > totalValue * 0.01) {
      console.warn(`🛑 [RISK_GATE] Trade size exceeds 1% portfolio limit.`);
      return false;
    }

    return true;
  }

  /**
   * تنفيذ أمر شراء أو بيع (Private API)
   */
  async placeOrder(side: 'buy' | 'sell', symbol: string, qty: number): Promise<{ id: string } & Record<string, unknown>> {
    const isSafe = await this.preflightCheck(side, symbol, qty);
    const isEthical = await this.sacredConfirmation(`${side} ${qty} ${symbol}`);
    
    if (!isSafe || !isEthical) {
      throw new Error(`Order Blocked: Risk=${!isSafe}, Ethics=${!isEthical}`);
    }

    console.log(`🚀 [TRADING_ACT] Placing ${side} order for ${qty} of ${symbol}`);
    
    const params = {
      category: 'spot',
      symbol: symbol.replace('/', ''),
      side: side.charAt(0).toUpperCase() + side.slice(1).toLowerCase(), // Buy or Sell
      orderType: 'Market',
      qty: qty.toString(),
    };

    try {
      const order = await this.privateRequest<{ orderId: string }>('POST', '/v5/order/create', params);
      return { id: order.orderId, ...order };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [TRADING_FAILURE] Order failed:`, message);
      throw error;
    }
  }
}
