// استدعاء TronWeb
const TronWebModule = require('tronweb');
const TronWeb = TronWebModule.default || TronWebModule; // الحل مع النسخ الحديثة
const fs = require('fs');

const fullNode = 'https://api.trongrid.io';
const solidityNode = 'https://api.trongrid.io';
const eventServer = 'https://api.trongrid.io';

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('ERROR: يجب تعيين PRIVATE_KEY كمتغير بيئة قبل التشغيل');
  process.exit(1);
}

// إنشاء TronWeb instance بالطريقة الصحيحة
const tronWeb = TronWeb.create({
  fullHost: fullNode,
  privateKey: privateKey
});

(async () => {
  try {
    const account = tronWeb.defaultAddress.base58;
    console.log('Using address:', account);

    const balanceSun = await tronWeb.trx.getBalance(account);
    console.log('Balance (TRX):', balanceSun / 1e6);

    const abi = JSON.parse(fs.readFileSync('USDT_abi.json','utf8'));
    const bytecode = fs.readFileSync('USDT_bytecode.txt','utf8').trim();

    console.log('Deploying contract...');
    const contract = await tronWeb.contract().new({
      abi,
      bytecode,
      parameters: []
    });

    console.log('✅ Contract deployed at address:', contract.address);
  } catch (err) {
    console.error('Deployment error:', err);
  }
})();
