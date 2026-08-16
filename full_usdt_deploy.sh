#!/bin/bash
echo ">>> بدء فحص البيئة وتحضير مشروع USDT على Termux"

# --- فحص Node.js و npm ---
if ! command -v node &>/dev/null; then
  echo "❌ Node.js غير مثبت"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  echo "❌ npm غير مثبت"
  exit 1
fi
echo "✅ npm $(npm -v)"

# --- فحص PRIVATE_KEY ---
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ متغير PRIVATE_KEY غير مضبوط"
  exit 1
fi
echo "✅ PRIVATE_KEY مضبوط"

# --- فحص solc ---
if ! command -v solcjs &>/dev/null; then
  echo ">>> تثبيت solc 0.8.20"
  npm install -g solc@0.8.20
fi
echo "✅ solc جاهز: $(solcjs --version 2>/dev/null)"

# --- فحص TronWeb ---
if ! npm list tronweb &>/dev/null; then
  echo ">>> تثبيت TronWeb"
  npm install tronweb
fi
echo "✅ TronWeb مثبت"

# --- الترجمة ---
echo ">>> ترجمة العقد"
node compile.js
if [ $? -ne 0 ]; then
  echo "❌ حدث خطأ أثناء الترجمة"
  exit 1
fi
echo "✅ الترجمة انتهت، ABI و Bytecode موجودة"

# --- النشر ---
echo ">>> نشر العقد على شبكة TRON"
node deploy_tronweb.mjs
if [ $? -ne 0 ]; then
  echo "❌ حدث خطأ أثناء النشر"
  exit 1
fi
echo "✅ العقد تم نشره بنجاح"
