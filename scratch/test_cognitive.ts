// أعوذ بالله من الشيطان الرجيم
// بسم الله الرحمن الرحيم

import { CognitiveTafsirEngine } from '../src/lib/iqra/08-cognitive/engine';

async function testE2E() {
  console.log("🚀 بدء اختبار المحرك الإدراكي E2E...");
  
  const engine = new CognitiveTafsirEngine();
  
  // 1. اختبار تسجيل الجلسة
  engine.startRecording();
  console.log("\n1. جاري تحليل آية الكرسي (2:255)...");
  const verseReport = engine.analyzeVerse("2:255");
  console.log("   النتيجة:", JSON.stringify(verseReport, null, 2));

  // 2. اختبار استكشاف موضوع (السرب)
  console.log("\n2. جاري استكشاف موضوع 'التوحيد' باستخدام ذكاء السرب...");
  const themeReport = engine.exploreTheme("توحيد", ["الله", "واحد", "أحد"]);
  console.log("   أفضل تطابق:", themeReport.bestMatch?.surah_name, themeReport.bestMatch?.ayah);
  console.log("   قوة السرب:", themeReport.swarmScore.toFixed(4));

  // 3. اختبار الطوبولوجيا (المسارات)
  console.log("\n3. جاري البحث عن مسار دلالي بين الفاتحة (1:1) والإخلاص (112:1)...");
  const path = engine.topology.findPath("1:1", "112:1");
  console.log("   المسار المكتشف:", path ? path.join(" → ") : "لم يتم العثور على مسار مباشر");

  // 4. اختبار إعادة التشغيل (Replay)
  engine.stopRecording();
  const replay = engine.getReplay();
  console.log("\n4. ملخص سجل الإعادة (Replay):");
  console.log(`   إجمالي الخطوات المسجلة: ${replay.length}`);
  
  console.log("\n✅ انتهى الاختبار بنجاح!");
}

testE2E().catch(err => {
  console.error("❌ فشل الاختبار:", err);
});
