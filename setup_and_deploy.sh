#!/data/data/com.termux/files/usr/bin/bash
# setup_and_deploy.sh
# يشمل: إنشاء المجلد، تثبيت nodejs و الحزم، إنشاء العقد، ترجمة، ونشر عبر TronWeb
# الاستخدام:
#   1) export PRIVATE_KEY="مفتاحك_الخاص_هنا"
#   2) bash setup_and_deploy.sh
#
# تحذير أمني: لا تضَع المفتاح في جهاز غير آمن

set -e

PROJECT_DIR="$HOME/usdt-token"
echo ">>> إنشاء مجلد المشروع: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo ">>> تحديث الحزم وتثبيت nodejs (قد يستغرق وقتًا)"
pkg update -y
pkg install nodejs -y

echo ">>> تهيئة package.json"
if [ ! -f package.json ]; then
  npm init -y >/dev/null 2>&1 || true
fi

echo ">>> تثبيت مكتبات Node المطلوبة (tronweb و solc)"
npm install tronweb solc@0.5.17 --save >/dev/null 2>&1

# إنشاء ملف العقد USDT.sol
cat > USDT.sol <<'EOF'
pragma solidity ^0.5.8;

contract TRC20 {
    string public name = "Usdt";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply = 1000000000 * 10**6;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor() public {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value);
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
}
EOF

echo ">>> إنشاء ملف compile.js لترجمة العقد (باستخدام solc-js)"
cat > compile.js <<'EOF'
const fs = require('fs');
const solc = require('solc');

// قراءة العقد
const source = fs.readFileSync('USDT.sol', 'utf8');

// إعداد المدخل للمترجم (متوافق مع solc-js)
const input = {
  language: 'Solidity',
  sources: {
    'USDT.sol': { content: source }
  },
  settings: {
    outputSelection: {
      '*': { '*': ['abi', 'evm.bytecode.object'] }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (!output.contracts || !output.contracts['USDT.sol']) {
  console.error('Compile error:', output);
  process.exit(1);
}

const contractName = Object.keys(output.contracts['USDT.sol'])[0];
const abi = output.contracts['USDT.sol'][contractName].abi;
const bytecode = output.contracts['USDT.sol'][contractName].evm.bytecode.object;

fs.writeFileSync('USDT_abi.json', JSON.stringify(abi, null, 2));
fs.writeFileSync('USDT_bytecode.txt', bytecode);

console.log('✅ Compilation finished. ABI and bytecode files created.');
EOF

echo ">>> إنشاء ملف deploy_tronweb.js للنشر عبر TronWeb"
cat > deploy_tronweb.js <<'EOF'
const TronWeb = require('tronweb');
const fs = require('fs');

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';

// قراءة PRIVATE_KEY من متغيّر البيئة
const privateKey = process.env.PRIVATE_KEY || '';
if (!privateKey) {
  console.error('ERROR: يجب تعيين PRIVATE_KEY كمتغيّر بيئة قبل التشغيل');
  console.error('مثال: export PRIVATE_KEY="b5...yourkey..."');
  process.exit(1);
}

// إعداد TronWeb
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);

(async () => {
  try {
    const account = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Using address:', account);

    // تأكد من وجود TRX كافٍ
    const balanceSun = await tronWeb.trx.getBalance(account);
    const balanceTRX = balanceSun / 1e6;
    console.log('Balance (TRX):', balanceTRX);
    if (balanceTRX < 0.1) {
      console.warn('تحذير: رصيد TRX قليل. ستفشل عملية النشر إذا لم يكن لديك TRX كافٍ.');
    }

    // قراءة ABI و bytecode
    const abi = JSON.parse(fs.readFileSync('USDT_abi.json', 'utf8'));
    const bytecode = fs.readFileSync('USDT_bytecode.txt', 'utf8');

    console.log('Deploying contract... this may take a moment');
    const contractInstance = await tronWeb.contract().deploy({
      abi: abi,
      bytecode: bytecode,
      parameters: []
    }, {
      feeLimit: 100_000_000, // يزيد حسب الحاجة
      callValue: 0
    });

    // contractInstance يؤدي إلى object به transaction و address (قد يكون address بعد تأكيد)
    console.log('Transaction ID:', contractInstance.transaction.txID || contractInstance.transaction);
    // في بعض نسخ tronweb يمكن الوصول مباشرة إلى .address
    if (contractInstance.address) {
      console.log('Contract deployed at address:', contractInstance.address);
    } else {
      // محاولة استخلاص العنوان من transaction info
      console.log('Contract response:', contractInstance);
      console.log('إذا لم يظهر العنوان مباشرة انتظر تأكيد الترانزاكشن ثم استخدم trx.getTransactionReceipt');
    }
  } catch (err) {
    console.error('Deployment error:', err);
  }
})();
EOF

echo ">>> تشغيل الترجمة (compile)"
node compile.js

echo ">>> الآن جاهز للنشر"
echo ">>> تأكد أنك عطيت قيمة لبيئة PRIVATE_KEY"
echo ">>> مثال لتصدير المفتاح وتشغيل النشر:"
echo "    export PRIVATE_KEY=\"b5dcc98b926f90e36ce8e4c1c2a0002b98bab51dce95c77cbab45541c50e0b8c\""
echo "    node deploy_tronweb.js"

echo ">>> انتهى. ملفات المشروع في: $PROJECT_DIR"
ls -la
