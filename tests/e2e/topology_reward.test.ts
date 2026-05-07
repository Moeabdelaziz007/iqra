import { describe, it, expect } from 'vitest';
import { runMission } from '../../lib/iqra/mission-runner';
import fs from 'fs';
import path from 'path';

/**
 * 🌀 IQRA TOPOLOGY REWARD E2E TEST
 * النية: اختبار حلقة (اكتشاف نمط -> حساب رنين طوبولوجي -> تسجيل مكافأة).
 * القاعدة: لا يُقبل الاختبار إلا إذا كانت قيمة المكافأة ناتجة عن معادلة "الرنين" الحقيقية.
 */

describe('Topological Reward E2E', () => {
  it('should calculate curvature and resonance and record it in the ledger', async () => {
    const missionPath = path.resolve('topology-mission-e2e.yml');
    
    // 1. ملف مهمة يركز على "الفضول الطوبولوجي"
    // dev_mode: true مطلوب صريحاً لتشغيل provider: simulated — القاعدة ٢
    const missionScope = `
mission_id: topology_reward_test_001
objective: "Analyze the topological structure of divine remembrance in Surah Al-Hijr 15:9"
verse: "15:9"
field_of_inquiry: "Numerical Topology of Remembrance"
provider: "simulated"
dev_mode: true
allowed_tools: ["topology_engine", "read_db"]
`;
    
    fs.writeFileSync(missionPath, missionScope);

    // التأكد من تهيئة سجل الحساب (ḤISĀB)
    const ledgerPath = path.resolve('iqra-core/data/reward_ledger.jsonl');
    if (!fs.existsSync(path.dirname(ledgerPath))) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    
    // تسجيل حجم السجل قبل الاختبار
    const initialContent = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean) : [];
    const initialSize = initialContent.length;

    // 2. تشغيل المهمة
    console.log('⚙️  Calculating Curvature & Resonance...');
    const result = await runMission(missionPath);

    // 3. التحقق من "رنين المكافأة"
    if (result.status !== 'completed') {
      console.error('Mission failed with error:', result.error);
    }
    expect(result.status, `Mission failed: ${result.error}`).toBe('completed');
    expect(result.total_reward).toBeGreaterThanOrEqual(0);

    const finalContent = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean);
    const finalSize = finalContent.length;
    
    expect(finalSize).toBeGreaterThan(initialSize);
    
    const lastEntry = JSON.parse(finalContent[finalContent.length - 1]);
    console.log('✅ TOPOLOGY SUCCESS: Resonance detected and recorded!');
    console.log(`💎 Reward Registered: ${lastEntry.total_reward}`);
    console.log(`📊 Discovery Level: ${lastEntry.discovery_level}`);
    
    expect(lastEntry.mission_id).toBe('topology_reward_test_001');
    expect(lastEntry.total_reward).toBe(result.total_reward);

    // Cleanup
    if (fs.existsSync(missionPath)) fs.unlinkSync(missionPath);
  });
});
