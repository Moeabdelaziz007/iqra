#!/usr/bin/env tsx
/**
 * 🚀 IQRA Mission CLI — واجهة تشغيل المهام
 * الاستخدام: npx tsx src/scripts_v2/run_mission.ts [mission-scope.yml]
 * المرجع: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ" — العلق: 1
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { config } from 'dotenv';
import { runMission } from '#core/mission-runner';

config({ path: path.join(process.cwd(), '.env') });

const missionFile = process.argv[2] || 'src/lib/iqra/01-core/missions/config/mission-scope.yml';
const missionPath = path.resolve(missionFile);

if (!fs.existsSync(missionPath)) {
  console.error(`❌ Mission file not found: ${missionPath}`);
  process.exit(1);
}

console.log('\n╔══════════════════════════════════════════╗');
console.log('║   🕌 IQRA Mission Runner                 ║');
console.log('║   بسم الله الرحمن الرحيم                ║');
console.log('╚══════════════════════════════════════════╝\n');
console.log(`📋 Mission: ${missionPath}\n`);

const result = await runMission(missionPath);

console.log('\n╔══════════════════════════════════════════╗');
if (result.status === 'completed') {
  console.log('║   ✅ MISSION COMPLETE                    ║');
  console.log(`║   Reward:  ${result.total_reward?.toFixed(4).padEnd(30)}║`);
  console.log(`║   Level:   ${(result.discovery_level || '').padEnd(30)}║`);
  console.log(`║   Time:    ${(result.duration_ms + 'ms').padEnd(30)}║`);
} else {
  console.log('║   ❌ MISSION FAILED                      ║');
  console.log(`║   Error: ${(result.error || '').slice(0, 32).padEnd(32)}║`);
}
console.log('╚══════════════════════════════════════════╝\n');

console.log(`Steps completed: ${result.steps_completed.join(' → ')}`);
if (result.steps_failed.length > 0) {
  console.log(`Steps failed:    ${result.steps_failed.join(', ')}`);
}
console.log(`Working dir:     ${result.workingDir}`);
console.log(`Artifacts:       ${result.all_artifacts.length} files\n`);

process.exit(result.status === 'completed' ? 0 : 1);
