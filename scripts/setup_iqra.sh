#!/bin/bash
# setup_iqra.sh – يُنفذ مرة واحدة لتهيئة بيئة Jules

echo "🌙 تهيئة بيئة IQRA لـ Jules..."

# تثبيت dependencies
npm install

# التحقق من وجود الملفات الأساسية
if [ ! -f "iqra-core/DASTŪR.md" ]; then
  echo "❌ دستور IQRA غير موجود – تأكد من المستودع الصحيح."
fi

# إنشاء مجلدات مؤقتة إذا لزم الأمر
mkdir -p logs temp

echo "✅ البيئة جاهزة – يمكن لـ Jules العمل الآن."
