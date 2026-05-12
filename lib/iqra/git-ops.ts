import { execSync } from 'child_process';
import { reportFailure } from './tawbah';

/**
 * النية: مزامنة الحالة العالمية عبر دفع التغييرات إلى المستودع البعيد
 * المرجع: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ" — الطلاق: 3
 *
 * Pushes changes to origin with Witr (3) retry logic.
 */
export function istilan(retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`🔄 [أخوَّة] | Isti'lān: Pushing to sovereignty (Attempt ${i}/3)...`);
      execSync('git push origin main', { timeout: 30000 });
      console.log('✅ [أخوَّة] | Isti_lan: Global state synchronized.');
      return true;
    } catch (e: any) {
      console.warn(`⚠️ [أخوَّة] | Isti'lān: Push attempt ${i} failed.`);
      reportFailure('git-istilan', e.message);
      if (i === retries) {
        console.error('❌ [أخوَّة] | Isti\'lān: Final attempt exhausted. Sovereignty remains local.');
      } else {
        // Witr-based backoff
        const delay = Math.pow(i, 2) * 1000;
        execSync(`sleep ${delay / 1000}`);
      }
    }
  }
  return false;
}
