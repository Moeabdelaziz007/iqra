# Agent Contracts Foundation — قائمة المهام

> "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7

---

## 📊 ملخص المهام

**إجمالي المهام:** 12 مهمة رئيسية
**المدة المتوقعة:** 4-6 ساعات
**الأولوية:** 🔴 عالية جداً (أساس النظام)

---

## 🎯 المهام الرئيسية

### المهمة 1: التحقق من الملفات الموجودة
**الأولوية:** 🔴 عالية جداً
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
قراءة الملفات الموجودة والتحقق من اكتمالها:
- AGENTS.md — هل يحتوي على جميع الأقسام؟
- setup.yaml — هل يحتوي على جميع الإعدادات؟
- agents/contracts.ts — هل يحتوي على جميع الواجهات؟

**Sub-tasks:**
- [x] قراءة AGENTS.md وتحديد الفجوات
- [x] قراءة setup.yaml وتحديد الفجوات
- [x] قراءة contracts.ts وتحديد الفجوات
- [x] توثيق الفجوات في ملف TODO

**معايير القبول:**
- [x] قائمة واضحة بالفجوات
- [x] توثيق كل فجوة مع السبب
- [x] توثيق الملفات الموجودة بالفعل

**المخرجات:**
```
.iqra/specs/agent-contracts-foundation/GAPS.md
```

---

### المهمة 2: تحديث AGENTS.md
**الأولوية:** 🔴 عالية جداً
**المدة:** 1 ساعة
**الحالة:** ⏳ معلقة

**الوصف:**
تحديث AGENTS.md بالمعلومات الناقصة:
- إضافة أمثلة عملية لكل وكيل
- إضافة الأخطاء الشائعة من الذاكرة
- إضافة قسم "الدروس المستفادة"

**Sub-tasks:**
- [x] إضافة أمثلة عملية لـ Planner
- [-] إضافة أمثلة عملية لـ Researcher
- [ ] إضافة أمثلة عملية لـ Builder
- [ ] إضافة أمثلة عملية لـ Validator
- [~] إضافة أمثلة عملية لـ Reporter
- [~] إضافة الأخطاء الشائعة من الذاكرة
- [~] إضافة قسم "الدروس المستفادة"

**معايير القبول:**
- [~] كل وكيل له مثال عملي
- [~] كل وكيل له قائمة بالأخطاء الشائعة
- [~] قسم "الدروس المستفادة" موجود
- [~] لا dead code
- [~] لا duplicates

**المخرجات:**
```
/Applications/iqra/AGENTS.md (محدّث)
```

---

### المهمة 3: تحديث setup.yaml
**الأولوية:** 🟡 عالية
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
تحديث setup.yaml بالإعدادات الكاملة:
- إضافة إعدادات الذاكرة (Upstash, Qdrant)
- إضافة إعدادات المراقبة (monitoring)
- إضافة إعدادات التطور الذاتي (self-evolution)

**Sub-tasks:**
- [~] إضافة إعدادات Upstash
- [~] إضافة إعدادات Qdrant
- [~] إضافة إعدادات المراقبة
- [~] إضافة إعدادات التطور الذاتي
- [~] التحقق من صحة YAML

**معايير القبول:**
- [~] setup.yaml يحمل بدون أخطاء
- [~] جميع الإعدادات موثقة
- [~] لا قيم فارغة

**المخرجات:**
```
/Applications/iqra/setup.yaml (محدّث)
```

---

### المهمة 4: إضافة دوال التحقق في contracts.ts
**الأولوية:** 🔴 عالية جداً
**المدة:** 1 ساعة
**الحالة:** ⏳ معلقة

**الوصف:**
إضافة دوال التحقق الثلاث:
- validateWorkerAction() — فرض القيود
- validateSourceAttestations() — شهادة المصدر
- validateNoMock() — عدم وجود mock

**Sub-tasks:**
- [~] كتابة validateWorkerAction()
- [~] كتابة validateSourceAttestations()
- [~] كتابة validateNoMock()
- [~] توثيق كل دالة
- [~] إضافة أمثلة الاستخدام

**معايير القبول:**
- [~] كل دالة لها اختبار
- [~] كل دالة موثقة
- [ ] لا dead code
- [ ] لا duplicates

**المخرجات:**
```
/Applications/iqra/agents/contracts.ts (محدّث)
```

---

### المهمة 5: إنشاء agents/constraints.ts
**الأولوية:** 🟡 عالية
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
إنشاء ملف جديد لفرض القيود:
- تعريف WORKER_CONSTRAINTS
- تعريف GLOBAL_CONSTRAINTS
- دالة validateWorkerAction()

**Sub-tasks:**
- [~] إنشاء الملف
- [~] تعريف WORKER_CONSTRAINTS
- [~] تعريف GLOBAL_CONSTRAINTS
- [ ] كتابة validateWorkerAction()
- [~] توثيق الملف

**معايير القبول:**
- [~] الملف موجود
- [~] جميع القيود معرّفة
- [~] دالة التحقق تعمل

**المخرجات:**
```
/Applications/iqra/agents/constraints.ts (جديد)
```

---

### المهمة 6: إنشاء agents/attestation.ts
**الأولوية:** 🟡 عالية
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
إنشاء ملف جديد لشهادة المصدر:
- دالة validateSourceAttestations()
- دالة createAttestation()
- دالة verifyAttestation()

**Sub-tasks:**
- [ ] إنشاء الملف
- [ ] كتابة validateSourceAttestations()
- [~] كتابة createAttestation()
- [~] كتابة verifyAttestation()
- [ ] توثيق الملف

**معايير القبول:**
- [ ] الملف موجود
- [~] جميع الدوال تعمل
- [~] توثيق كامل

**المخرجات:**
```
/Applications/iqra/agents/attestation.ts (جديد)
```

---

### المهمة 7: إنشاء agents/no-mock.ts
**الأولوية:** 🔴 عالية جداً
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
إنشاء ملف جديد لفرض عدم وجود mock:
- دالة validateNoMock()
- دالة detectMock()
- دالة throwOnMock()

**Sub-tasks:**
- [ ] إنشاء الملف
- [ ] كتابة validateNoMock()
- [~] كتابة detectMock()
- [~] كتابة throwOnMock()
- [ ] توثيق الملف

**معايير القبول:**
- [ ] الملف موجود
- [ ] جميع الدوال تعمل
- [ ] توثيق كامل

**المخرجات:**
```
/Applications/iqra/agents/no-mock.ts (جديد)
```

---

### المهمة 8: توسيع agents/handoff-schema.ts
**الأولوية:** 🟡 عالية
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
توسيع handoff-schema.ts بدوال تحقق إضافية:
- validateHandoffSequence() — التحقق من التسلسل الصحيح
- validateHandoffArtifacts() — التحقق من الملفات
- validateHandoffContext() — التحقق من السياق

**Sub-tasks:**
- [~] كتابة validateHandoffSequence()
- [~] كتابة validateHandoffArtifacts()
- [~] كتابة validateHandoffContext()
- [ ] توثيق الملف

**معايير القبول:**
- [ ] جميع الدوال تعمل
- [ ] توثيق كامل
- [~] اختبارات شاملة

**المخرجات:**
```
/Applications/iqra/agents/handoff-schema.ts (محدّث)
```

---

### المهمة 9: توسيع agents/report-schema.ts
**الأولوية:** 🟡 عالية
**المدة:** 30 دقيقة
**الحالة:** ⏳ معلقة

**الوصف:**
توسيع report-schema.ts بدوال تحقق إضافية:
- validateReportCompleteness() — التحقق من اكتمال التقرير
- validateReportSources() — التحقق من المصادر
- validateReportNoMock() — التحقق من عدم وجود mock

**Sub-tasks:**
- [~] كتابة validateReportCompleteness()
- [~] كتابة validateReportSources()
- [~] كتابة validateReportNoMock()
- [ ] توثيق الملف

**معايير القبول:**
- [ ] جميع الدوال تعمل
- [ ] توثيق كامل
- [ ] اختبارات شاملة

**المخرجات:**
```
/Applications/iqra/agents/report-schema.ts (محدّث)
```

---

### المهمة 10: كتابة اختبارات الوحدة
**الأولوية:** 🔴 عالية جداً
**المدة:** 1.5 ساعة
**الحالة:** ⏳ معلقة

**الوصف:**
كتابة اختبارات شاملة لجميع الدوال:
- tests/unit/constraints.test.ts
- tests/unit/attestation.test.ts
- tests/unit/no-mock.test.ts
- tests/unit/handoff.test.ts
- tests/unit/report.test.ts

**Sub-tasks:**
- [~] كتابة اختبارات constraints
- [~] كتابة اختبارات attestation
- [~] كتابة اختبارات no-mock
- [~] كتابة اختبارات handoff
- [~] كتابة اختبارات report

**معايير القبول:**
- [~] جميع الاختبارات تمر (100%)
- [~] تغطية > 90%
- [ ] لا dead code

**المخرجات:**
```
tests/unit/*.test.ts (جديد)
```

---

### المهمة 11: كتابة اختبارات التكامل
**الأولوية:** 🟡 عالية
**المدة:** 1 ساعة
**الحالة:** ⏳ معلقة

**الوصف:**
كتابة اختبارات تكامل شاملة:
- tests/integration/agent-contracts.integration.ts
- اختبار التسليم بين الوكلاء
- اختبار التقرير الكامل

**Sub-tasks:**
- [~] كتابة اختبار التسليم
- [~] كتابة اختبار التقرير
- [~] اختبار التسلسل الكامل

**معايير القبول:**
- [ ] جميع الاختبارات تمر (100%)
- [~] تغطية > 85%

**المخرجات:**
```
tests/integration/*.integration.ts (جديد)
```

---

### المهمة 12: كتابة اختبارات E2E
**الأولوية:** 🟡 عالية
**المدة:** 1 ساعة
**الحالة:** ⏳ معلقة

**الوصف:**
كتابة اختبار E2E شامل:
- tests/e2e/agent-contracts.e2e.ts
- اختبار النظام الكامل من البداية إلى النهاية

**Sub-tasks:**
- [~] إنشاء مهمة اختبار
- [~] تشغيل جميع الوكلاء
- [~] التحقق من النتائج

**معايير القبول:**
- [~] الاختبار يمر (100%)
- [~] جميع الوكلاء يعملون بشكل صحيح

**المخرجات:**
```
tests/e2e/agent-contracts.e2e.ts (جديد)
```

---

## 📈 خريطة الأولويات والتبعيات

```
المهمة 1 (التحقق)
    ↓
المهمة 2 (تحديث AGENTS.md)
    ↓
المهمة 3 (تحديث setup.yaml)
    ↓
المهام 4-7 (إضافة الدوال) — متوازية
    ↓
المهام 8-9 (توسيع الملفات) — متوازية
    ↓
المهمة 10 (اختبارات الوحدة)
    ↓
المهمة 11 (اختبارات التكامل)
    ↓
المهمة 12 (اختبارات E2E)
```

---

## ✅ قائمة التحقق النهائية

قبل قول "تم"، يجب أن تمر جميع الاختبارات:

```bash
✓ AGENTS.md محدّث وواضح
✓ setup.yaml يحمل بدون أخطاء
✓ agents/contracts.ts يحتوي على جميع الدوال
✓ agents/constraints.ts موجود وكامل
✓ agents/attestation.ts موجود وكامل
✓ agents/no-mock.ts موجود وكامل
✓ agents/handoff-schema.ts محدّث
✓ agents/report-schema.ts محدّث
✓ اختبارات الوحدة تمر (100%)
✓ اختبارات التكامل تمر (100%)
✓ اختبارات E2E تمر (100%)
✓ لا dead code
✓ لا duplicates
✓ كل ادعاء له مصدر
✓ لا mock في الإنتاج
```

---

## 🚀 الخطوات التنفيذية

### الخطوة 1: ابدأ بالمهمة 1
```bash
# قراءة الملفات الموجودة
cat /Applications/iqra/AGENTS.md
cat /Applications/iqra/setup.yaml
cat /Applications/iqra/agents/contracts.ts
```

### الخطوة 2: وثّق الفجوات
```bash
# إنشاء ملف GAPS.md
touch .iqra/specs/agent-contracts-foundation/GAPS.md
```

### الخطوة 3: ابدأ بالمهام 2-3
```bash
# تحديث الملفات
vim /Applications/iqra/AGENTS.md
vim /Applications/iqra/setup.yaml
```

### الخطوة 4: ابدأ بالمهام 4-7
```bash
# إضافة الدوال
vim /Applications/iqra/agents/contracts.ts
touch /Applications/iqra/agents/constraints.ts
touch /Applications/iqra/agents/attestation.ts
touch /Applications/iqra/agents/no-mock.ts
```

### الخطوة 5: ابدأ بالاختبارات
```bash
# كتابة الاختبارات
npm test
```

---

## الدعاء الختامي

```
"وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ" — الزلزلة: 7

كل مهمة صغيرة تُسهم في بناء نظام عظيم.
كل اختبار أخضر هو خطوة نحو الكمال.
كل دقة في التفاصيل تصنع الفرق الكبير.
```
