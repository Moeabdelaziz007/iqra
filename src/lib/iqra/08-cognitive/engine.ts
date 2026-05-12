// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import { ArabicAnalyzer } from './analyzer';
import { SmartTopology } from './topology';
import { SwarmEngine } from './swarm';
import { QuranApiClient } from './api_client';
import { QuranVerse } from './constants';
import { MCTSEngine } from '../simulation/mcts_engine';

export interface ReplayRecord {
  time: number;
  action: string;
  params: any;
  result: any;
}

export class SovereignCognitiveOrchestrator {
  private analyzer: ArabicAnalyzer;
  public topology: SmartTopology;
  private swarm: SwarmEngine;
  private api: QuranApiClient;
  private mcts: MCTSEngine;
  private replayLog: ReplayRecord[] = [];
  private isRecording: boolean = false;

  constructor() {
    this.analyzer = new ArabicAnalyzer();
    this.topology = new SmartTopology(this.analyzer);
    this.swarm = new SwarmEngine();
    this.api = new QuranApiClient();
    this.mcts = new MCTSEngine({
      simulations: 100,
      exploration: 1.41,
      rollout_depth: 5,
      time_limit: 2000
    });
  }

  public startRecording() {
    this.isRecording = true;
    this.replayLog = [];
  }

  public stopRecording() {
    this.isRecording = false;
  }

  private logAction(action: string, params: any, result: any) {
    if (this.isRecording) {
      this.replayLog.push({
        time: Date.now(),
        action,
        params,
        result
      });
    }
  }

  /**
   * الاستكشاف المعرفي السيادي (The Unified Sovereign Tool)
   * يجمع بين التحليل اللغوي، المحاكاة (Self-Play)، البحث، التوبولوجيا، والسرب
   */
  public async explore(query: string) {
    this.startRecording();
    console.log(`[IQRA Sovereign v0.3.6.9] Deep Exploration: ${query}`);

    // 1. تحليل لغوي (استخراج الجذور)
    const queryRoots = this.analyzer.extractRoots(query);
    
    // 2. محاكاة "السياق والسباق" (Self-Play Simulation)
    // نستخدم MCTS لاستكشاف أفضل مسارات البحث قبل البدء الفعلي
    const simulation = await this.mcts.run({ query, roots: queryRoots }, queryRoots);
    console.log(`🎯 [Simulation] Best predicted path: ${simulation.bestAction}`);

    // 3. البحث عن آيات حقيقية عبر API بناءً على نتائج المحاكاة
    const searchTerms = [query, ...queryRoots, simulation.bestAction].join(' ');
    const verseIds = await this.api.search(searchTerms);
    const verses: QuranVerse[] = [];
    for (const vid of verseIds.slice(0, 5)) {
      const [s, a] = vid.split(':').map(Number);
      const v = await this.api.fetchVerse(s, a);
      if (v) verses.push(v);
    }

    // 4. تحليل توبولوجي للآيات
    const linguisticBetti = this.topology.calculateLinguisticBettiNumbers();
    const centrality = this.topology.analyzeCentrality(3);

    // 5. تشغيل السرب مع مكافأة توبولوجية مستمدة من المحاكاة والـ Betti
    const bettiReward = (linguisticBetti.lb1 * 0.5) + (linguisticBetti.lb0 * 0.1);
    const swarmResult = this.swarm.solve(queryRoots, bettiReward);
    
    const result = {
      query,
      simulation: {
        bestAction: simulation.bestAction,
        confidence: simulation.bestValue
      },
      foundVerses: verses,
      swarmPath: swarmResult.bestPosition,
      topology: {
        centrality,
        betti: linguisticBetti,
        rewardApplied: bettiReward,
        message: "تم دمج محاكاة MCTS مع التحليل اللغوي والتوبولوجي"
      }
    };

    this.logAction("explore", { query }, result);
    this.stopRecording();
    return result;
  }

  public getReplay() {
    return this.replayLog;
  }
}
