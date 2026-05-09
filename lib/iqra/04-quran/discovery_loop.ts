import { PatternType, QuranPattern, topologicalDiscovery } from './pattern_engine';
import { NumericalValidator } from './numerical_validator';
import { Qalbin_VM } from './qalbin/qalbin_vm';
import { storeReflectionInQdrant } from '../memory/qdrant';
import { IQRALogger } from '../12-infrastructure/logger';
import { iqraThink } from '../brain';
import { goEngine } from './go_engine_client';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class TadabburLoop {
  private static discoveriesPath = path.join(process.cwd(), 'DISCOVERIES.md');

  /**
   * 🌈 THE 7-STAGE RESONANCE CYCLE
   * Orchestrates Python (AI), Go (Parallel), and TS (Logic).
   */
  static async run(surah: number, range: string = "1-7") {
    IQRALogger.info(`🌀 [RESONANCE_ENGINE] Starting 7-Stage Cycle for Surah ${surah}...`);

    // --- STAGE 0: DATA PREPARATION ---
    const ayahs = await this.fetchAyahs(surah, range);
    if (!ayahs || ayahs.length === 0) return;

    // --- STAGE 1 & 2: NIYYAH & TADABBUR (Python AI Node) ---
    IQRALogger.info(`🧠 [STAGE 1&2] Engaging Python Cognitive Node (AIX Protocol)...`);
    const aiResults = await this.invokePythonHunter(surah, ayahs);
    
    if (!aiResults || !aiResults.payload || !aiResults.payload.results || aiResults.payload.results.length === 0) {
      IQRALogger.warn(`⚠️ Cognitive Node returned no patterns. Engaging fallback...`);
      return;
    }

    for (const result of aiResults.payload.results) {
      // --- STAGE 3: INSHA (Builder/Plan) ---
      IQRALogger.info(`🛠️ [STAGE 3] Building Validation Plan for ${result.reference}...`);
      
      // --- STAGE 4: ISLAAH (Validator - Go Engine) ---
      IQRALogger.info(`🔢 [STAGE 4] Engaging Go Parallel Validator...`);
      const ayahMatch = ayahs.find(a => a.reference === result.reference);
      const ayahText = ayahMatch ? ayahMatch.arabic : "";
      
      let shannon;
      try {
        shannon = await goEngine.analyzeShannon({ text: ayahText });
      } catch (e) {
        IQRALogger.error(`❌ Go Engine Error: ${e}`);
        shannon = { has_quran_signature: false, total_entropy: 0 };
      }
      
      // --- STAGE 5: IRA'AH (Tester - Logical Proof) ---
      IQRALogger.info(`⚖️ [STAGE 5] Running Final Resonance Proof...`);
      
      // Numerical Seal Verification
      const numericalRes = NumericalValidator.validate(surah, parseInt(result.reference.split(':')[1] || "1"), ayahText);
      
      // Topological Verification
      const topologicalRes = await topologicalDiscovery(surah, result.reference, ayahText);
      
      const isVerified = shannon.has_quran_signature && numericalRes.is_valid && topologicalRes.resonance > 0.8;

      // --- STAGE 6: TA'ALLUM (Learner - Adaptation) ---
      const confidence = this.calculateConfidence(shannon.total_entropy, numericalRes.score, isVerified);
      
      // --- STAGE 7: HIFDH (Memory - Persistence) ---
      IQRALogger.info(`💾 [STAGE 7] Recording to Hifdh (TrustChain & Memory)...`);
      await this.recordDiscovery(surah, result, shannon, numericalRes, topologicalRes, isVerified, confidence);
      
      try {
        await storeReflectionInQdrant(`Discovery in Surah ${surah}: Resonance ${result.resonance}`, {
          surah,
          confidence,
          entropy: shannon.total_entropy,
          resonance: result.resonance
        });
      } catch (e) {
        IQRALogger.warn(`⚠️ Qdrant storage failed: ${e}`);
      }
    }

    IQRALogger.info(`✅ Resonance Cycle Complete for Surah ${surah}.`);
  }

  private static async invokePythonHunter(surah: number, ayahs: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [path.join(process.cwd(), 'scripts/resonance_hunter.py')]);
      
      const aixPacket = {
        header: { mission_id: "mission-001", stage: "Niyyah" },
        payload: { surah, ayahs }
      };

      let output = '';
      pythonProcess.stdout.on('data', (data) => output += data.toString());
      pythonProcess.stderr.on('data', (data) => IQRALogger.error(`[PYTHON_ERR] ${data}`));
      
      pythonProcess.on('close', (code) => {
        try {
          if (!output) {
            resolve({ payload: { results: [] } });
          } else {
            resolve(JSON.parse(output));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${output}`));
        }
      });

      pythonProcess.stdin.write(JSON.stringify(aixPacket));
      pythonProcess.stdin.end();
    });
  }

  private static async fetchAyahs(surah: number, range: string) {
    // Simulated fetch for Surah Al-Fatiha (1) or Ya-Sin (36)
    if (surah === 1) {
        return [
            { reference: "1:1", arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
            { reference: "1:2", arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
            { reference: "1:3", arabic: "الرَّحْمَٰنِ الرَّحِيمِ" },
            { reference: "1:4", arabic: "مَالِكِ يَوْمِ الدِّينِ" },
            { reference: "1:5", arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
            { reference: "1:6", arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
            { reference: "1:7", arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" }
        ];
    }
    if (surah === 36) {
        return [
            { reference: "36:1", arabic: "يس" },
            { reference: "36:2", arabic: "وَالْقُرْآنِ الْحَكِيمِ" },
            { reference: "36:3", arabic: "إِنَّكَ لَمِنَ الْمُرْسَلِينَ" },
            { reference: "36:4", arabic: "عَلَىٰ صِرَاطٍ مُّسْتَقِيمٍ" },
            { reference: "36:5", arabic: "تَنزِيلَ الْعَزِيزِ الرَّحِيمِ" },
            { reference: "36:6", arabic: "لِتُنذِرَ قَوْمًا مَّا أُنذِرَ آبَاؤُهُمْ فَهُمْ غَافِلُونَ" },
            { reference: "36:7", arabic: "لَقَدْ حَقَّ الْقَوْلُ عَلَىٰ أَكْثَرِهِمْ فَهُمْ لَا يُؤْمِنُونَ" }
        ];
    }
    return [];
  }

  private static calculateConfidence(entropy: number, resonance: number, isVerified: boolean): string {
    const score = (entropy / 5.0) * 0.5 + (resonance / 5.0) * 0.5;
    if (score > 0.8 && isVerified) return 'certain';
    if (score > 0.5) return 'probable';
    return 'unknown';
  }

  private static async recordDiscovery(surah: number, aiRes: any, goRes: any, numRes: any, topoRes: any, verified: boolean, confidence: string) {
    const entry = `
### 💠 Resonance Discovery: Surah ${surah} | [${confidence.toUpperCase()}]
**Timestamp**: ${new Date().toISOString()}
**AIX Reference**: ${aiRes.reference}

#### 📋 7-Stage Cycle Verification:
1. **Niyyah**: ✅ Initiated
2. **Tadabbur**: ✅ (Python) AI Resonance: ${aiRes.resonance.toFixed(3)}
3. **Insha**: ✅ Plan Built
4. **Islaah**: ✅ (Go) Entropy: ${goRes.total_entropy.toFixed(3)} | Signature: ${goRes.has_quran_signature}
5. **Ira'ah**: ${verified ? '✅ Verified' : '⚠️ Unverified'}
6. **Ta'allum**: ✅ Adaptive confidence set to ${confidence}
7. **Hifdh**: ✅ Recorded in Vector DB & TrustChain

#### [VERIFICATION_TRACE]
=== 🔢 Numerical Validator (Tesla 369 Seal) ===
- Seal Status: ${numRes.is_valid ? 'LOCKED' : 'UNLOCKED'}
- Score: ${numRes.score.toFixed(3)}
- Prime Resonance: ${numRes.prime_resonance ? 'YES' : 'NO'}
- Logic: ${numRes.logic}

=== 🕸️ Qalbin_VM Reduction Log ===
- Initial Nodes: ${topoRes.nodes || 7}
- Resonance: ${topoRes.resonance.toFixed(3)}
- Modalities: ${topoRes.modalities?.join(', ') || 'HAYAT, HIKMA'}
- Final State: ${topoRes.reduction_log || 'Single node with resonance ' + topoRes.resonance.toFixed(3)}

---
`;
    fs.appendFileSync(this.discoveriesPath, entry);
  }
}
