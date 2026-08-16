// deploy_tronweb.mjs
import TronWeb from "tronweb";
import fs from "fs";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("❌ خطأ: لم يتم ضبط PRIVATE_KEY");
  process.exit(1);
}

// إعداد بيئة العقد
const fullNode = "https://api.trongrid.io";
const solidityNode = "https://api.trongrid.io";
const eventServer = "https://api.trongrid.io";

let tronWeb;

// ✅ التحقق من الإصدار وطريقة الاستدعاء
if (typeof TronWeb === "function") {
  // هذا الشكل يعمل في TronWeb v5
  tronWeb = new TronWeb({
    fullHost: fullNode,
    privateKey: privateKey,
  });
} else if (TronWeb.TronWeb) {
  // هذا الشكل يعمل في TronWeb v6
  tronWeb = new TronWeb.TronWeb({
    fullHost: fullNode,
    privateKey: privateKey,
  });
} else {
  console.error("❌ لم أتعرف على نسخة TronWeb المثبتة");
  process.exit(1);
}

// تحميل ABI و Bytecode
const abi = JSON.parse(fs.readFileSync("USDT_abi.json", "utf8"));
const bytecode = fs.readFileSync("USDT_bytecode.txt", "utf8");

async function deploy() {
  try {
    console.log("🚀 بدء نشر العقد...");
    const contract = await tronWeb.contract().new({
      abi: abi,
      bytecode: bytecode,
    });
    console.log("✅ العقد نُشر بنجاح على العنوان:", contract.address);
  } catch (err) {
    console.error("❌ خطأ أثناء النشر:", err);
  }
}

deploy();
