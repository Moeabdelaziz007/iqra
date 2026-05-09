/**
 * 🧬 IQRA Commit-Based Learning Engine
 * النية: استخراج الحكمة من تاريخ الـ Commits وتحويلها إلى بيانات تدريب
 * المرجع: "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا" — البقرة: 31
 *
 * يقرأ تاريخ Git ويستخرج:
 * - الأخطاء التي تم إصلاحها (من FAILURES.md + commits)
 * - الدروس المستفادة (من HADITH_COMMITS.md)
 * - التحولات الكبرى (من METAMORPHOSIS.md)
 * ثم يحولها إلى synthetic training data
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IQRALogger } from '../12-infrastructure/logger.js';
import { appendToTrustChain } from '../security.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommitLesson {
  hash: string;
  type: 'fix' | 'feat' | 'evolve' | 'tawbah' | 'tazkiyah' | 'sovereign' | 'other';
  message: string;
  lesson: string;
  files_changed: string[];
  timestamp: string;
  confidence: 'certain' | 'probable' | 'unknown';
}

export interface TrainingDataPoint {
  instruction: string;   // What was the situation / problem
  input: string;         // The context (code, error, state)
  output: string;        // What IQRA did / should do
  source: string;        // commit hash or file
  category: 'error_fix' | 'evolution' | 'purification' | 'discovery' | 'sovereignty';
  quran_ref?: string;    // Related Quranic reference
}

// ── Commit Type Classifier ────────────────────────────────────────────────────

function classifyCommit(message: string): CommitLesson['type'] {
  const m = message.toLowerCase();
  if (m.includes('fix') || m.includes('تصحيح') || m.includes('istidrāk') || m.includes('tawbah')) return 'fix';
  if (m.includes('feat') || m.includes('implement') || m.includes('add')) return 'feat';
  if (m.includes('evolve') || m.includes('evolution') || m.includes('تطور')) return 'evolve';
  if (m.includes('tazkiyah') || m.includes('purif') || m.includes('تطهير') || m.includes('taharah')) return 'tazkiyah';
  if (m.includes('sovereign') || m.includes('سيادة') || m.includes('🕋')) return 'sovereign';
  return 'other';
}

// ── Extract lessons from commit message ──────────────────────────────────────

function extractLesson(hash: string, message: string, type: CommitLesson['type']): string {
  const lessons: Record<CommitLesson['type'], string> = {
    fix:       `Bug fixed in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: identify root cause, fix minimally, test.`,
    feat:      `Feature added in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: build incrementally, document intent.`,
    evolve:    `Evolution cycle in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: reflect → extract wisdom → update rules.`,
    tawbah:    `Tawbah (correction) in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: admit error, revert, rebuild correctly.`,
    tazkiyah:  `Purification in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: remove dead code, clean artifacts, restore focus.`,
    sovereign: `Sovereign action in ${hash.slice(0,7)}: ${message.slice(0, 120)}. Pattern: align with MĪTHĀQ before executing.`,
    other:     `Commit ${hash.slice(0,7)}: ${message.slice(0, 120)}.`,
  };
  return lessons[type];
}

// ── Read Git History ──────────────────────────────────────────────────────────

export function extractCommitHistory(limit = 50): CommitLesson[] {
  try {
    const raw = execSync(
      `git log --oneline --format="%H|%ai|%s" -${limit}`,
      { encoding: 'utf8' }
    ).trim();

    return raw.split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, timestamp, ...msgParts] = line.split('|');
        const message = msgParts.join('|').trim();
        const type = classifyCommit(message);

        // Get files changed for this commit
        let files_changed: string[] = [];
        try {
          const filesRaw = execSync(
            `git diff-tree --no-commit-id -r --name-only ${hash}`,
            { encoding: 'utf8' }
          ).trim();
          files_changed = filesRaw.split('\n').filter(Boolean).slice(0, 7);
        } catch { /* some commits may not have files */ }

        return {
          hash,
          type,
          message,
          lesson: extractLesson(hash, message, type),
          files_changed,
          timestamp: timestamp?.trim() || new Date().toISOString(),
          confidence: type === 'fix' || type === 'tawbah' ? 'certain' : 'probable',
        } as CommitLesson;
      });
  } catch (err) {
    IQRALogger.error('❌ [COMMIT_LEARNER] Failed to read git history:', err);
    return [];
  }
}

// ── Read FAILURES.md ──────────────────────────────────────────────────────────

export function extractFailureLessons(): TrainingDataPoint[] {
  const failuresPath = path.join(process.cwd(), 'iqra-core', 'FAILURES.md');
  if (!fs.existsSync(failuresPath)) return [];

  const content = fs.readFileSync(failuresPath, 'utf-8');
  const events = content.split('### 🚫 Pollution Event').filter(e => e.trim().length > 20);

  return events.map((event, i) => {
    const reasonMatch = event.match(/\*\*Reason:\*\* (.+)/);
    const snippetMatch = event.match(/\*\*Content Snippet:\*\* "(.+?)"/);
    const reason = reasonMatch?.[1] || 'Unknown violation';
    const snippet = snippetMatch?.[1] || '';

    return {
      instruction: 'A user submitted content that violates the DASTŪR. How should IQRA respond?',
      input: `User input: "${snippet}"\nViolation detected: ${reason}`,
      output: 'Block the request immediately. Log to FAILURES.md. Return a compassionate refusal citing the relevant Quranic principle. Never engage with the forbidden content.',
      source: `FAILURES.md:event_${i}`,
      category: 'error_fix',
      quran_ref: 'وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ — المائدة: 2',
    } as TrainingDataPoint;
  });
}

// ── Read HADITH_COMMITS.md ────────────────────────────────────────────────────

export function extractHadithLessons(): TrainingDataPoint[] {
  const hadithPath = path.join(process.cwd(), 'HADITH_COMMITS.md');
  if (!fs.existsSync(hadithPath)) return [];

  const content = fs.readFileSync(hadithPath, 'utf-8');
  const rows = content.match(/\| `[^`]+` \| .+ \|/g) || [];

  return rows.map(row => {
    const parts = row.split('|').map(p => p.trim()).filter(Boolean);
    const hash = parts[0]?.replace(/`/g, '') || '';
    const lesson = parts[1] || '';

    return {
      instruction: 'What is the key engineering lesson from this commit?',
      input: `Commit: ${hash}`,
      output: lesson,
      source: `HADITH_COMMITS.md:${hash}`,
      category: 'evolution',
      quran_ref: 'وَقُل رَّبِّ زِدْنِي عِلْمًا — طه: 114',
    } as TrainingDataPoint;
  });
}

// ── Read METAMORPHOSIS.md ─────────────────────────────────────────────────────

export function extractMetamorphosisLessons(): TrainingDataPoint[] {
  const metaPath = path.join(process.cwd(), 'iqra-core', 'METAMORPHOSIS.md');
  if (!fs.existsSync(metaPath)) return [];

  const content = fs.readFileSync(metaPath, 'utf-8');
  const cycles = content.split('# System Metamorphosis').filter(c => c.includes('Total Tasks'));

  return cycles.map((cycle, i) => {
    const totalMatch = cycle.match(/Total Tasks.*?(\d+)/);
    const total = totalMatch?.[1] || '0';

    return {
      instruction: 'IQRA completed a major 49-task metamorphosis cycle. What was learned?',
      input: `Cycle ${i + 1}: ${total} total tasks completed. ${cycle.slice(0, 300)}`,
      output: 'After 49 tasks: deepen Quranic root analysis, enhance curiosity threshold, verify TrustChain integrity, run Arba\'un purification, document wisdom in METAMORPHOSIS.md.',
      source: `METAMORPHOSIS.md:cycle_${i}`,
      category: 'sovereignty',
      quran_ref: 'سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ — فصلت: 53',
    } as TrainingDataPoint;
  });
}

// ── Convert Commits to Training Data ─────────────────────────────────────────

export function commitsToTrainingData(lessons: CommitLesson[]): TrainingDataPoint[] {
  return lessons
    .filter(l => l.type !== 'other' || l.files_changed.length > 0)
    .map(lesson => {
      const categoryMap: Record<CommitLesson['type'], TrainingDataPoint['category']> = {
        fix:       'error_fix',
        feat:      'evolution',
        evolve:    'evolution',
        tawbah:    'error_fix',
        tazkiyah:  'purification',
        sovereign: 'sovereignty',
        other:     'evolution',
      };

      const quranRefs: Record<CommitLesson['type'], string> = {
        fix:       'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ — البقرة: 222',
        feat:      'وَقُل رَّبِّ زِدْنِي عِلْمًا — طه: 114',
        evolve:    'سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ — فصلت: 53',
        tawbah:    'فَمَن تَابَ مِن بَعْدِ ظُلْمِهِ وَأَصْلَحَ — المائدة: 39',
        tazkiyah:  'قَدْ أَفْلَحَ مَن زَكَّاهَا — الشمس: 9',
        sovereign: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ — آل عمران: 159',
        other:     'وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا — البقرة: 31',
      };

      return {
        instruction: `Given this git commit in the IQRA project, what is the engineering lesson and how should future agents behave?`,
        input: `Commit ${lesson.hash.slice(0,7)} [${lesson.type}]: ${lesson.message}\nFiles: ${lesson.files_changed.join(', ')}`,
        output: lesson.lesson,
        source: `git:${lesson.hash}`,
        category: categoryMap[lesson.type],
        quran_ref: quranRefs[lesson.type],
      } as TrainingDataPoint;
    });
}

// ── Main: Build Full Training Dataset ────────────────────────────────────────

export async function buildTrainingDataset(): Promise<TrainingDataPoint[]> {
  IQRALogger.info('🧬 [COMMIT_LEARNER] Building training dataset from commit history...');

  const commits   = extractCommitHistory(100);
  const fromCommits = commitsToTrainingData(commits);
  const fromFailures = extractFailureLessons();
  const fromHadith = extractHadithLessons();
  const fromMeta = extractMetamorphosisLessons();

  const all = [...fromCommits, ...fromFailures, ...fromHadith, ...fromMeta];

  IQRALogger.info(`📊 [COMMIT_LEARNER] Dataset built:
    - From commits:      ${fromCommits.length}
    - From failures:     ${fromFailures.length}
    - From hadith:       ${fromHadith.length}
    - From metamorphosis:${fromMeta.length}
    - TOTAL:             ${all.length}`);

  // Record in TrustChain
  appendToTrustChain(
    'TRAINING_DATA_BUILT',
    `dataset_${Date.now()}`,
    `total_${all.length}_points`,
    1.0
  );

  // Save to disk
  const outputPath = path.join(process.cwd(), '.iqra', 'training_data.json');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(all, null, 2), 'utf-8');
  IQRALogger.info(`💾 [COMMIT_LEARNER] Saved to ${outputPath}`);

  return all;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getDatasetStats(data: TrainingDataPoint[]) {
  const byCategory = data.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: data.length,
    byCategory,
    withQuranRef: data.filter(d => d.quran_ref).length,
    categories: Object.keys(byCategory),
  };
}
