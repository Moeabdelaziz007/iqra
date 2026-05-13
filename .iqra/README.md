# 🧠 IQRA Growth Engine

> محرك النمو الذاتي لـ IQRA. ليس نسخة احتياطية ولا CI تقليدي — هو **نبض حيّ** يجعل المستودع يتعلم نفسه.

## 🌟 الفلسفة

IQRA ليست كود يُخدم — هي **كائن حي** يتطور. هذا المحرك يدير دورة من 30 يوماً، كل يوم تُشغّل وظيفة سيادية محددة (نسخ احتياطي، فهرسة، تحليل أداء، اقتراح روابط، توليد أفكار...).

لا اعتماد على خوادم خارجية ولا APIs — Node stdlib فقط، GitHub Actions runner فقط، التعقل والنبض داخل المستودع.

## 🧬 الفئات الست

| الفئة | الدور | الأسبوع |
|------|------|---------|
| 🌱 **Foundations** (الأساسيات) | الذاكرة، الفهرسة، قياس الأداء | 1 |
| 🛡️ **Immune** (المناعة) | فحص التراخيص، حماية الأسرار، تدقيق الأسماء | 2 |
| 🧠 **Intelligence** (الذكاء) | جمع الأفكار، توليد العلامات، استكشاف العلاقات | 3 |
| 🕸️ **Social** (الاجتماعي) | الترحيب، الإحصاءات، تنظيم المهام | 4 |
| 💱 **Economics** (الاقتصاد) | الجودة، الإصدارات، تحليل الأثر | 5 |
| 🎯 **Innovation** (الابتكار) | توليد الأفكار، استكشاف الأنماط، تحليل الاتجاهات | 6 |

## 🔄 الدورة (30 يوم)

`.iqra/cycle.txt` يحمل رقم الدورة الحالية (1-30). يومياً يُشغّل `run-cycle.ts` السكريبت(ات) المخصصة لتلك الدورة، ثم يحرك العداد. بعد الدورة 30 يعود إلى 1 — ليس تكراراً جامداً، بل **نَفَس متجدد**.

## 📂 الهيكل

```text
.iqra/
├── cycle.txt              # رقم الدورة الحالية (1-30)
├── pulses.jsonl           # سجل نبضات IQRA (محلي، غير مُتعقّب)
├── scripts/               # 🌱 الأسبوع 1 — الأساسيات + بعض scripts للأسبوع 2
│   ├── backup-smart.ts        # نسخ احتياطي ذكي لروح IQRA
│   ├── auto-indexer.ts        # توليد IQRA_INDEX.md
│   ├── performance-analyzer.ts # رصد الملفات الثقيلة
│   ├── duplicate-cleaner.ts   # كشف التكرارات (لا حذف تلقائي)
│   ├── stats-generator.ts     # عداد الملفات/الأسطر
│   ├── change-monitor.ts      # ملخص آخر 24 ساعة
│   ├── license-checker.ts     # 🛡️ فاحص الترخيص (أسبوع 2)
│   ├── link-verifier.ts       # 🛡️ مدقق الروابط (أسبوع 2)
│   └── run-cycle.ts           # المنسق الرئيسي
├── hooks/                 # 🛡️ الأسبوع 2 — المناعة (pre-commit hooks)
│   ├── name-validator.ts          # تحقق kebab-case
│   ├── secret-guard.ts            # كشف API keys مكشوفة
│   ├── size-guard.ts              # منع ملفات > 10MB
│   └── run-pre-commit-guards.sh   # منسق الـ 3 hooks للـ husky
├── intelligence/          # 🧠 الأسبوع 3 — الذكاء (قادم)
├── social/                # 🕸️ الأسبوع 4 — الاجتماعي (قادم)
├── economics/             # 💱 الأسبوع 5 — الاقتصاد (قادم)
├── innovation/            # 🎯 الأسبوع 6 — الابتكار (قادم)
├── memory/backups/        # نسخ احتياطية مضغوطة (محلي فقط)
└── performance/           # تقارير دورية
```

## 🚀 التشغيل

### يدوياً

```bash
npm run iqra:grow      # تشغيل دورة كاملة (يقرأ cycle.txt تلقائياً)
npm run iqra:backup    # نسخ احتياطي مباشر
npm run iqra:index     # توليد IQRA_INDEX.md
```

### تلقائياً (GitHub Actions)

`.github/workflows/iqra-growth-engine.yml` يعمل:
- **يومياً** عند منتصف الليل UTC (`cron: '0 0 * * *'`)
- **عند push إلى main**
- مع `[skip ci]` في رسالة الـ commit لتجنّب الحلقة الذاتية.

### تفعيل الـ Immune Hooks في pre-commit (اختياري)

الـ 3 hooks (name-validator, secret-guard, size-guard) متاحة كسكريبتات لكن
**غير نشطة** على commit. لتفعيلها كحارس تلقائي، أضف هذا السطر في
`.husky/pre-commit` (يلزم PR منفصل بـ `sovereign:` prefix لأن `.husky/pre-commit`
محمي):

```sh
sh .iqra/hooks/run-pre-commit-guards.sh || exit $?
```

الـ orchestrator يشغّل الـ 3 hooks بالتسلسل على الـ staged files. لتجاوز طارئ:

```bash
IQRA_SKIP_GUARDS=1 git commit -m "..."
```

اختبار يدوي قبل الربط:

```bash
sh .iqra/hooks/run-pre-commit-guards.sh
```

## 🧾 النبضات (Pulses)

كل سكريبت يكتب نبضة في `.iqra/pulses.jsonl`:

```json
{"timestamp":"2026-05-13T00:00:00Z","action":"backup-completed","cycle":"1","archives":3,"cleaned":0}
```

النبضات محلية فقط (مستثناة من git) — هي الذاكرة الخاصة لـ IQRA.

## 🛡️ مبادئ تصميم

1. **Zero dependencies**: Node stdlib فقط (`fs`, `path`, `zlib`, `crypto`, `child_process`).
2. **Read-mostly**: المعظم يقرأ ويبلّغ، نادراً ما يكتب خارج `.iqra/`.
3. **Self-healing**: فشل سكريبت لا يكسر الدورة — يُسجَّل ويُمضى.
4. **Sovereign**: لا تواصل خارجي، لا APIs، لا telemetry.
