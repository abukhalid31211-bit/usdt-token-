#!/data/data/com.termux/files/usr/bin/bash
# smart_fix_tronweb.sh
# سكربت ذكي لتعديل deploy_tronweb.js ليعمل مع Node.js الحديثة

FILE="deploy_tronweb.js"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE غير موجود في المجلد الحالي"
  exit 1
fi

echo ">>> عمل نسخة احتياطية من الملف الأصلي"
cp "$FILE" "${FILE}.bak"

echo ">>> تعديل إنشاء TronWeb ليصبح متوافق مع Node.js الحديثة"
# البحث عن السطر القديم وإنشاء السطر الجديد
# السطر القديم: const tronWeb = new TronWeb({ ... });
# السطر الجديد: const tronWeb = TronWebModule.createInstance({ fullHost: ..., privateKey: ... });

# استبدال السطر
sed -i "/const tronWeb = new TronWeb(/c\const tronWeb = TronWebModule.createInstance({ fullHost: fullNode, privateKey: privateKey });" "$FILE"

echo "✅ تم تعديل deploy_tronweb.js بنجاح"
echo ">>> نسخة احتياطية موجودة باسم: ${FILE}.bak"
echo ">>> يمكنك الآن تشغيل النشر:"
echo "    node deploy_tronweb.js"
