#!/data/data/com.termux/files/usr/bin/bash
# full_deploy_usdt.sh
# سكربت شامل: إنشاء، ترجمة، وتعديل ونشر عقد USDT TRC20

# --- إعداد المشروع ---
PROJECT_DIR=~/usdt-token
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR || exit 1

# --- تحقق من Node و npm ---
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js غير مثبت. ثبت nodejs في Termux"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm غير مثبت"
  exit 1
fi

# --- تثبيت مكتبات Node المطلوبة ---
echo ">>> تثبيت tronweb و solc-js"
npm init -y >/dev/null 2>&1
npm install tronweb solc fs >/dev/null 2>&1

# --- إنشاء ملف العقد USDT.sol ---
cat > USDT.sol <<'EOF'
pragma solidity ^0.8.0;

contract USDT {
    string public name = "USDT";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply = 1000000000 * (10 ** 6);
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    event Transfer(address indexed from, address indexed to, uint256 value);

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "رصيد غير كافٍ");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
}
EOF

# --- إنشاء سكربت compile.js ---
cat > compile.js <<'EOF'
const solc = require('solc');
const fs = require('fs');

const source = fs.readFileSync('USDT.sol', 'utf8');
const input = {
    language: 'Solidity',
    sources: { 'USDT.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi','evm.bytecode'] } } }
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contractName = 'USDT';
const abi = output.contracts['USDT.sol'][contractName].abi;
const bytecode = output.contracts['USDT.sol'][contractName].evm.bytecode.object;

fs.writeFileSync('USDT_abi.json', JSON.stringify(abi, null, 2));
fs.writeFileSync('USDT_bytecode.txt', bytecode);
console.log('✅ Compilation finished. ABI and bytecode files created.');
EOF

# --- ترجمة العقد ---
node compile.js

# --- إنشاء سكربت نشر deploy_tronweb.js ---
cat > deploy_tronweb.js <<'EOF'
const TronWebModule = require('tronweb');
const TronWeb = TronWebModule.default || TronWebModule;
const fs = require('fs');

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';

const privateKey = process.env.PRIVATE_KEY || '';
if (!privateKey) {
  console.error('ERROR: يجب تعيين PRIVATE_KEY كمتغير بيئة قبل التشغيل');
  process.exit(1);
}

// الطريقة الصحيحة لإنشاء TronWeb instance
const tronWeb = TronWebModule.createInstance({
  fullHost: fullNode,
  privateKey: privateKey
});

(async () => {
  try {
    const account = tronWeb.address.fromPrivateKey(privateKey);
    console.log('Using address:', account);

    const balanceSun = await tronWeb.trx.getBalance(account);
    const balanceTRX = (balanceSun || 0)/1e6;
    console.log('Balance (TRX):', balanceTRX);

    const abi = JSON.parse(fs.readFileSync('USDT_abi.json','utf8'));
    const bytecode = fs.readFileSync('USDT_bytecode.txt','utf8').trim();

    console.log('Deploying contract...');
    const tx = await tronWeb.contract().deploy({abi, bytecode, parameters: []}, {feeLimit:100_000_000, callValue:0});

    if (tx && tx.transaction && tx.transaction.txID) console.log('Transaction ID:', tx.transaction.txID);
    else if (tx && tx.txid) console.log('Transaction ID:', tx.txid);
    else console.log('Transaction response:', tx);

    if (tx && tx.address) console.log('Contract deployed at address:', tx.address);
    else console.log('لم يُرجع العنوان فوراً، انتظر تأكيد الترانزاكشن ثم استعلم عنه');
  } catch(err) {
    console.error('Deployment error:', err);
  }
})();
EOF

chmod +x deploy_tronweb.js

echo "✅ كل شيء جاهز، لتشغيل النشر فقط:"
echo "export PRIVATE_KEY=\"ضع_مفتاحك هنا\""
echo "node deploy_tronweb.js"
