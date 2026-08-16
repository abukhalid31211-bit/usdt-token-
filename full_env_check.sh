#!/bin/bash
echo ">>> Checking Termux environment for USDT deployment"

# 1️⃣ Node.js
if command -v node &>/dev/null; then
    echo "✅ Node.js version: $(node -v)"
else
    echo "❌ Node.js is not installed"
fi

# 2️⃣ npm
if command -v npm &>/dev/null; then
    echo "✅ npm version: $(npm -v)"
else
    echo "❌ npm is not installed"
fi

# 3️⃣ solc
if npm list -g solc &>/dev/null; then
    echo "✅ solc installed: $(solcjs --version 2>/dev/null)"
else
    echo "❌ solc not installed"
fi

# 4️⃣ TronWeb
if npm list tronweb &>/dev/null; then
    echo "✅ tronweb installed"
else
    echo "❌ tronweb not installed"
fi

# 5️⃣ PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set"
else
    echo "✅ PRIVATE_KEY is set"
fi

echo ">>> Environment check complete"
