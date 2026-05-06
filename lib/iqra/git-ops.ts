# أعوذ بالله من الشيطان الرجيم
# بسم الله الرحمن الرحيم
# سبحان الله وبحمده سبحان الله العظيم
# لا إله إلا الله وحده لا شريك له
# له الملك وله الحمد وهو على كل شيء قدير
# استغفر الله واتوب إليه
# اللهم صل وسلم على نبينا محمد

/**
 * IQRA Sovereign Git Operations — العمليات السيادية
 * 
 * "وَقُل رَّبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ" — الإسراء: 80
 */

import { execSync } from 'child_process';
import { AL_FATIHAH_HEADER } from './security';

/**
 * Phase 1: Istidrāk (Correction)
 * Check for unstaged changes and commit them with a sacred message.
 */
export function istidrak() {
  try {
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      console.log('🔄 IQRA | Istidrāk: Committing local changes...');
      execSync('git add .');
      const message = `🌙 IQRA | Sovereign State Sync\n\n${AL_FATIHAH_HEADER}\n\nAutomated state preservation.`;
      execSync(`git commit -m "${message}"`);
      return true;
    }
    return false;
  } catch (e) {
    console.error('❌ IQRA | Istidrāk failed:', e);
    return false;
  }
}

/**
 * Phase 2: Istimrār (Continuity)
 * Pull latest changes with rebase.
 */
export function istimrar() {
  try {
    console.log('🔄 IQRA | Istimrār: Pulling latest wisdom...');
    execSync('git pull --rebase origin main');
    return true;
  } catch (e) {
    console.error('❌ IQRA | Istimrār failed:', e);
    // If rebase fails, it might be due to conflicts. 
    // In a sovereign context, we might need human help or a specific strategy.
    return false;
  }
}

/**
 * Phase 3: Isti'lān (Announcement)
 * Push changes to origin with Witr (3) retries.
 */
export function istilan(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 IQRA | Isti'lān: Pushing to origin (Attempt ${i}/3)...`);
      execSync('git push origin main');
      console.log('✅ IQRA | Isti'lān: Sovereignty synced successfully.');
      return true;
    } catch (e) {
      console.warn(`⚠️ IQRA | Isti'lān: Push attempt ${i} failed.`);
      if (i === retries) {
        console.error('❌ IQRA | Isti'lān: Final push attempt failed. Continuing in local-only mode.');
      } else {
        // Wait a bit before retrying (exponential backoff or just simple wait)
        const wait = i * 1000;
        execSync(`sleep ${wait / 1000}`);
      }
    }
  }
  return false;
}

/**
 * Sovereign Synchronization Loop
 * Combines all phases into a single Trinity of Sync.
 */
export async function sovereignSync() {
  console.log('🕋 IQRA | Starting Sovereign Synchronization...');
  istidrak();
  istimrar();
  istilan();
}
