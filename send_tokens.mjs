// send_tokens.mjs
import TronWebModule from "tronweb";
import fs from "fs";
import path from "path";

const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: export PRIVATE_KEY first");
  process.exit(1);
}

// ضع هنا عنوان العقد الذي نشأته
const CONTRACT_ADDRESS = "TVmawZMTy6ecAJMwcXMjWz1UHpLzdcc1QZ";

// قراءة المعطيات من args
const to = process.argv[2];
const amountInput = process.argv[3]; // مقدار التوكن بصيغة عدد عادي مثل 10000000

if (!to || !amountInput) {
  console.error("Usage: node send_tokens.mjs <TO_ADDRESS> <AMOUNT>");
  process.exit(1);
}

// تهيئة TronWeb بشكل متوافق مع نسختك
let tronWeb;
if (TronWeb && TronWeb.TronWeb) {
  tronWeb = new TronWeb.TronWeb({
    fullHost: "https://api.trongrid.io",
    privateKey: PRIVATE_KEY
  });
} else if (typeof TronWeb === "function") {
  tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
    privateKey: PRIVATE_KEY
  });
} else if (TronWeb.createInstance) {
  tronWeb = TronWeb.createInstance({
    fullHost: "https://api.trongrid.io",
    privateKey: PRIVATE_KEY
  });
} else {
  console.error("ERROR: cannot initialize TronWeb with installed package");
  process.exit(1);
}

// تحميل ABI
const abiPath = path.join(process.cwd(), "USDT_abi.json");
if (!fs.existsSync(abiPath)) {
  console.error("ERROR: USDT_abi.json not found. Run compile step first.");
  process.exit(1);
}
const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

async function run() {
  try {
    const fromAddress = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
    console.log("Using from address:", fromAddress);

    // تأكد من رصيد العقد وتأكد أن المرسل لديه توكنات كافية
    const contract = await tronWeb.contract(abi, CONTRACT_ADDRESS);

    const decimals = parseInt(await contract.methods.decimals().call());
    const totalSupply = await contract.methods.totalSupply().call();
    console.log("Contract totalSupply (raw):", totalSupply.toString());

    // حساب المبلغ مع الـdecimals
    const amount = BigInt(amountInput);
    const factor = BigInt(10) ** BigInt(decimals);
    const amountWithDecimals = amount * factor;

    console.log(`Sending ${amount.toString()} (raw units) -> with decimals: ${amountWithDecimals.toString()}`);

    // اختبر وجود الدالة transfer إما كـ contract.methods.transfer أو contract.transfer
    let tx;
    if (contract.methods && contract.methods.transfer) {
      tx = await contract.methods.transfer(to, amountWithDecimals.toString()).send();
    } else if (contract.transfer) {
      tx = await contract.transfer(to, amountWithDecimals.toString());
      // بعض نسخ ترجع tx object مباشرة
    } else {
      throw new Error("transfer method not found on contract object");
    }

    console.log("Transaction result:", tx);
    console.log("Done. Check token balance after a few seconds.");
  } catch (err) {
    console.error("Send error:", err && err.message ? err.message : err);
    console.error(err);
  }
}

run();
