// check_token_balance.mjs
import TronWebModule from "tronweb";
import fs from "fs";

const contractAddress = "41d92fd6a361eaee8b1c23e4b2c2d039c4bbe9f61f";
const abiPath = "./USDT_abi.json";

if (!process.env.PRIVATE_KEY) {
  console.error("ERROR: تعيين PRIVATE_KEY أولاً مثل\nexport PRIVATE_KEY=\"...\"");
  process.exit(1);
}

if (!fs.existsSync(abiPath)) {
  console.error("ERROR: لم أجد USDT_abi.json في المجلد الحالي");
  process.exit(1);
}

const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
const privateKey = process.env.PRIVATE_KEY;

// دالة مساعدة لبناء instance مع config
const config = { fullHost: "https://api.trongrid.io", privateKey };

async function createTronWeb() {
  // جرب جميع الاحتمالات الشائعة بترتيب آمن
  try {
    // 1) tronweb exported as a constructor function (old style)
    if (typeof TronWebModule === "function") {
      return { tronWeb: new TronWebModule(config), used: "direct function" };
    }

    // 2) tronweb.default is constructor
    if (TronWebModule.default && typeof TronWebModule.default === "function") {
      return { tronWeb: new TronWebModule.default(config), used: "default function" };
    }

    // 3) tronweb.TronWeb is constructor (v6 pattern)
    if (TronWebModule.TronWeb && typeof TronWebModule.TronWeb === "function") {
      return { tronWeb: new TronWebModule.TronWeb(config), used: "TronWeb.TronWeb" };
    }

    // 4) createInstance as function (some builds)
    if (typeof TronWebModule.createInstance === "function") {
      return { tronWeb: TronWebModule.createInstance(config), used: "createInstance" };
    }
    if (TronWebModule.default && typeof TronWebModule.default.createInstance === "function") {
      return { tronWeb: TronWebModule.default.createInstance(config), used: "default.createInstance" };
    }

    // 5) last resort: if module has property that returns instance factory
    if (TronWebModule && TronWebModule.TronWeb && TronWebModule.TronWeb.createInstance) {
      return { tronWeb: TronWebModule.TronWeb.createInstance(config), used: "TronWeb.TronWeb.createInstance" };
    }

    throw new Error("لم أتمكن من إيجاد طريقة لتهيئة TronWeb في هذا التثبيت");
  } catch (err) {
    throw err;
  }
}

(async () => {
  try {
    const { tronWeb, used } = await createTronWeb();
    console.log("✅ تم إنشاء TronWeb بنجاح باستخدام:", used);

    // تأكد أن العنوان متوفر
    let myAddress;
    try {
      // بعض إصدارات تضع defaultAddress بعد تهيئة
      myAddress = tronWeb.defaultAddress && tronWeb.defaultAddress.base58;
      if (!myAddress) myAddress = tronWeb.address.fromPrivateKey(privateKey);
    } catch (err) {
      myAddress = tronWeb.address && tronWeb.address.fromPrivateKey
        ? tronWeb.address.fromPrivateKey(privateKey)
        : null;
    }
    if (!myAddress) {
      console.warn("تحذير: لم استطع استخراج العنوان من المفتاح آلياً");
    } else {
      console.log("Using address:", myAddress);
    }

    // ربط العقد
    const contract = await tronWeb.contract(abi, contractAddress);

    // جلب الرصيد الكلي
    const totalSupply = await contract.totalSupply().call();
    console.log("📦 الرصيد الكلي (totalSupply):", totalSupply.toString());

    // جلب رصيد العنوان (افتراضي: محفظتك)
    const addressToCheck = myAddress || (process.argv[2] || "");
    if (!addressToCheck) {
      console.log("✅ انتهى، لم تحدد عنوان لفحص الرصيد الإضافي (يمكنك تشغيل: node check_token_balance.mjs T... )");
      return;
    }
    const balance = await contract.balanceOf(addressToCheck).call();
    console.log(`💰 رصيد العنوان ${addressToCheck}: ${balance.toString()}`);
  } catch (err) {
    console.error("حدث خطأ:", err && err.message ? err.message : err);
    console.error(err);
    process.exit(1);
  }
})();
