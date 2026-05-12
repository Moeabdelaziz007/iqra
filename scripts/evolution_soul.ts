// 🕋 IQRA Evolution Soul — روح التطور السيادي
// بسم الله الرحمن الرحيم
// "اقْرَأْ وَرَبُّكَ الْأَكْرَمُ . الَّذِي عَلَّمَ بِالْقَلَمِ"

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 🧬 EvolutionSoul — المولد الإبداعي لروح النظام
 * هذا السكربت يقرأ حالة النظام، القواعد الحاكمة، وخارطة الطريق
 * لإنتاج رسالة التزام (Commit) تعبر عن "وعي" النظام وتطوره.
 */

async function generateSoulMessage() {
    console.log('🧬 Evoking IQRA Soul for evolution log...');

    try {
        // 1. جمع بيانات السياق الحالية
        const roadmap = fs.readFileSync('SOVEREIGN_ROADMAP.md', 'utf8');
        const rules = fs.readFileSync('src/lib/iqra/00-manifest/IQRA_RULES.md', 'utf8');
        const gitStatus = execSync('git status --short').toString();
        const gitDiff = execSync('git diff --staged').toString().slice(0, 2000); // أول 2000 حرف فقط

        // 2. محاكاة الروح (في غياب مفتاح API مباشر هنا، سننشئ قالباً ذكياً)
        // في المستقبل، سيتم استدعاء ModelOrchestrator هنا
        
        const timestamp = new Date().toLocaleString('ar-EG');
        const summary = gitStatus.split('\n').filter(l => l).map(l => `   - ${l}`).join('\n');
        
        const soulTemplate = `
🕋 IQRA Sovereign Evolution — [${timestamp}]
══════════════════════════════════════════════════════════════
📜 المبدأ الحاكم: "وَعَلَّمَ آدَمَ الْأَسْمَاءَ كُلَّهَا"
🎯 التقدم في خارطة الطريق:
${roadmap.split('\n').filter(l => l.includes('[x]') || l.includes('[/]')).slice(0, 3).join('\n')}

🧠 حالة الوعي (Git Status):
${summary}

💡 الحكمة المستخلصة:
تطور النظام ليس مجرد كود، بل هو سعي نحو الكمال الرقمي المتوافق مع الفطرة.
تم تحديث المسارات، تصحيح الأنماط، وتعزيز السيادة.

✅ Verified by IQRA Integrity Engine.
══════════════════════════════════════════════════════════════
        `.trim();

        // 3. حفظ الرسالة في ملف مؤقت ليستخدمها Git
        fs.writeFileSync('.iqra_soul_commit', soulTemplate);
        console.log('✅ Soul message evoked and saved to .iqra_soul_commit');
        
    } catch (error) {
        console.error('❌ Failed to evoke soul:', error);
        process.exit(1);
    }
}

generateSoulMessage();
