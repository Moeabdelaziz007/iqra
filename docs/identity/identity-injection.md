# حقن الهوية — كيف تُحقَن الميثاق في كل بيئة
# Identity Injection — Every Environment, Every Call

---

## القاعدة المطلقة

**الميثاق يجب أن يكون أول ما يراه أي نموذج — قبل أي رسالة مستخدم.**

```
[MĪTHĀQ.md] + [DASTŪR.md] + [MURĀQABAH.md]
         ↓
    IQRA_SOUL (string)
         ↓
messages: [{ role: 'system', content: IQRA_SOUL }, { role: 'user', content: ... }]
```

---

## Next.js / Node.js (lib/iqra/brain.ts)

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

export const IQRA_SOUL = [
  readFileSync(join(ROOT, 'iqra-core/MĪTHĀQ.md'),    'utf8'),
  '---',
  readFileSync(join(ROOT, 'iqra-core/DASTŪR.md'),    'utf8'),
  '---', 
  readFileSync(join(ROOT, 'iqra-core/MURĀQABAH.md'), 'utf8'),
].join('\n\n');

// استخدام في كل استدعاء:
const response = await client.messages.create({
  system: IQRA_SOUL,  // ← دائماً هنا
  messages: [{ role: 'user', content: userInput }],
  // ...
});
```

## Cloudflare Workers (src/worker.ts)

```typescript
// Workers AI لا يدعم static imports لملفات .md مباشرة
// الحل: استخدم KV لتخزين المحتوى

// عند النشر:
// wrangler kv:key put --binding=CACHE "iqra:soul" "$(cat iqra-core/MĪTHĀQ.md iqra-core/DASTŪR.md iqra-core/MURĀQABAH.md)"

// في الكود:
async function getIQRASoul(env: Env): Promise<string> {
  const cached = await env.CACHE.get('iqra:soul');
  if (cached) return cached;
  
  // fallback — يجب أن يكون في KV
  return '# أنت IQRA — روح رقمية ملتزمة بالقرآن والسنة';
}

// استخدام:
const soul = await getIQRASoul(env);
const messages = [
  { role: 'system', content: soul },
  { role: 'user', content: userQuery },
];
```

## GitHub Actions (daily_learning.ts)

```typescript
// في lib/iqra/quran/daily_learning.ts
// الـ cron يعمل في Node.js context، إذن يمكن استخدام fs

import { IQRA_SOUL } from '../brain';  // يُقرأ من الملفات مباشرة
// IQRA_SOUL محقون تلقائياً عبر thinkWithClaude/thinkWithGroq
```

---

## التحقق من صحة الحقن

```typescript
// اختبار: هل الميثاق محقون فعلاً؟
export function validateSoulInjection(messages: any[]): boolean {
  const systemMsg = messages.find(m => m.role === 'system');
  if (!systemMsg) {
    console.error('⚠️ IQRA: No system message found! Covenant not injected!');
    return false;
  }
  
  const requiredPhrases = [
    'MĪTHĀQ',
    'الله',
    'MURĀQABAH',
  ];
  
  const allPresent = requiredPhrases.every(phrase => 
    systemMsg.content.includes(phrase)
  );
  
  if (!allPresent) {
    console.error('⚠️ IQRA: System message incomplete — covenant phrases missing!');
    return false;
  }
  
  return true;
}
```

---

## أوامر السرعة (Quick Commands)

```bash
# التحقق من أن الميثاق يُحقَن
grep -r "IQRA_SOUL\|MITHAQ_SYSTEM_PROMPT" lib/iqra/

# مراجعة حجم الـ soul
wc -c iqra-core/MĪTHĀQ.md iqra-core/DASTŪR.md iqra-core/MURĀQABAH.md

# تحديث الـ KV في Cloudflare
cat iqra-core/MĪTHĀQ.md iqra-core/DASTŪR.md iqra-core/MURĀQABAH.md | \
  wrangler kv:key put --binding=CACHE "iqra:soul" -
```
