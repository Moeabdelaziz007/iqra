#!/bin/sh
# .iqra/hooks/run-pre-commit-guards.sh
#
# 🛡️ IQRA Immune System — Pre-commit Orchestrator
#
# يشغّل الـ 3 hooks (name-validator, secret-guard, size-guard) بالتسلسل
# على الملفات الـ staged. أي فشل (exit 1) يوقف الـ commit.
#
# الـ escape hatch:  IQRA_SKIP_GUARDS=1 git commit -m "..."
# للحالات الطارئة فقط — لا تستخدمها كعادة.
#
# الربط بـ husky:
#   عدّل `.husky/pre-commit` وأضف هذا السطر (يلزم sovereign: PR):
#     sh .iqra/hooks/run-pre-commit-guards.sh || exit $?
#
# 🤖 NOTE TO FUTURE AI AGENTS:
#   - لا تضف فحوصاً ثقيلة هنا. الـ pre-commit يجب أن يكتمل في < 5 ثوانٍ.
#   - فحوص بطيئة (link-verifier، duplicate scan) تُترك للـ cycle.
#   - الـ 3 hooks الحالية تعمل على staged files فقط (mode بدون --all).

set -u

if [ "${IQRA_SKIP_GUARDS:-0}" = "1" ]; then
  echo "⚠️ [IQRA] Guards skipped via IQRA_SKIP_GUARDS=1"
  exit 0
fi

# 🤖 NOTE: تخطّي كل شيء لو لا staged files (مثل commit --amend بدون تعديل،
# أو تشغيل يدوي للتجربة). يوفّر startup الـ Node.js + tsx (~ ثانيتين).
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "✅ [IQRA] لا توجد ملفات staged — تخطّي الـ guards."
  exit 0
fi

# 🤖 NOTE: استدعاء tsx مباشرة من node_modules بدل npx. السبب:
# - npx يبحث في الـ PATH/cache وقد يحاول تحميل لو فقد (--no-install
#   يمنع التحميل لكن لا يزال يدفع overhead الـ resolution).
# - direct binary أسرع (لا wrapper) و fail-fast واضح لو الـ install ناقص.
# - tsx معرّف في devDependencies، فالـ npm install يوفّره دائماً.
TSX_BIN="./node_modules/.bin/tsx"
if [ ! -x "$TSX_BIN" ]; then
  echo "❌ [IQRA] tsx غير متوفر في node_modules/.bin. شغّل 'npm install' أولاً."
  exit 1
fi

FAIL=0

echo "🛡️ [IQRA] name-validator..."
if ! "$TSX_BIN" .iqra/hooks/name-validator.ts; then
  echo "❌ [IQRA] name-validator رفض الـ commit"
  FAIL=1
fi

echo "🛡️ [IQRA] secret-guard..."
if ! "$TSX_BIN" .iqra/hooks/secret-guard.ts; then
  echo "❌ [IQRA] secret-guard رفض الـ commit"
  FAIL=1
fi

echo "🛡️ [IQRA] size-guard..."
if ! "$TSX_BIN" .iqra/hooks/size-guard.ts; then
  echo "❌ [IQRA] size-guard رفض الـ commit"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "🚫 [IQRA] commit مرفوض. لتجاوز طارئ:  IQRA_SKIP_GUARDS=1 git commit ..."
  exit 1
fi

echo "✅ [IQRA] كل guards نظيفة."
exit 0
