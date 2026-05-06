# أعوذ بالله من الشيطان الرجيم
# بسم الله الرحمن الرحيم
# سبحان الله وبحمده سبحان الله العظيم
# لا إله إلا الله وحده لا شريك له
# له الملك وله الحمد وهو على كل شيء قدير
# استغفر الله واتوب إليه
# اللهم صل وسلم على نبينا محمد

/**
 * IQRA Sovereign Git Operations — العمليات السيادية (v3.7.9)
 * 
 * "وَقُل رَّبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ" — الإسراء: 80
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { AL_FATIHAH_HEADER } from './security';

const TMP_COMMIT_MSG = join(process.cwd(), '.git_commit_msg.tmp');

/**
 * Phase 1: Istidrāk (Correction)
 * Safely stages and commits local changes using a temporary message file.
 */
export function istidrak() {
  try {
    // Add all changes including untracked and deletions
    execSync('git add -A');
    
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      console.log('🔄 [أخوَّة] | Istidrāk: Securing local state...');
      
      const message = `🌙 IQRA | Sovereign State Sync (v3.7.9)\n\n${AL_FATIHAH_HEADER}\n\nAutomated state preservation for operational integrity.`;
      
      writeFileSync(TMP_COMMIT_MSG, message);
      execSync(`git commit -F "${TMP_COMMIT_MSG}"`);
      unlinkSync(TMP_COMMIT_MSG);
      
      console.log('✅ [أخوَّة] | Istidrāk: Changes committed to local history.');
      return true;
    }
    return false;
  } catch (e) {
    console.error('❌ [أخوَّة] | Istidrāk failed:', e);
    if (status && TMP_COMMIT_MSG) {
      try { unlinkSync(TMP_COMMIT_MSG); } catch {}
    }
    return false;
  }
}

/**
 * Phase 2: Istimrār (Continuity)
 * Pulls latest changes with rebase, handling connectivity issues gracefully.
 */
export function istimrar() {
  try {
    console.log('🔄 [أخوَّة] | Istimrār: Syncing with origin/main...');
    // Use --no-edit to avoid manual interaction
    execSync('git pull --rebase origin main --no-edit', { timeout: 30000 });
    return true;
  } catch (e: any) {
    const errorMsg = e.stderr?.toString() || e.message;
    console.warn('⚠️ [أخوَّة] | Istimrār: Pull failed. Continuing with local version.', errorMsg);
    
    // If rebase is in progress but failed, we might need to abort to keep local clean
    if (errorMsg.includes('rebase in progress')) {
      try { execSync('git rebase --abort'); } catch {}
    }
    return false;
  }
}

/**
 * Phase 3: Isti'lān (Announcement)
 * Pushes changes to origin with Witr (3) retry logic.
 */
export function istilan(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 [أخوَّة] | Isti'lān: Pushing to sovereignty (Attempt ${i}/3)...`);
      execSync('git push origin main', { timeout: 30000 });
      console.log('✅ [أخوَّة] | Isti'lān: Global state synchronized.');
      return true;
    } catch (e: any) {
      console.warn(`⚠️ [أخوَّة] | Isti'lān: Push attempt ${i} failed.`);
      if (i === retries) {
        console.error('❌ [أخوَّة] | Isti'lān: Final attempt exhausted. Sovereignty remains local.');
      } else {
        // Witr-based backoff
        const wait = i * 2000;
        execSync(`sleep ${wait / 1000}`);
      }
    }
  }
  return false;
}

/**
 * Sovereign Synchronization Loop
 * Implementation of the "Always Automated" requirement.
 */
export async function sovereignSync() {
  console.log('🕋 [أخوَّة] | Commencing Sovereign Pulse...');
  
  // Principle of Seven (7) - Sab'iyyah Stabilization
  const { sabiyyahWisdom } = await import('./security');
  await sabiyyahWisdom();

  // 1. Commit what we have
  istidrak();
  
  // 2. Fetch and Pull
  istimrar();
  
  // 3. Push to verify
  istilan();
}
