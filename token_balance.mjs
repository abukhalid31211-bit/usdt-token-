// token_balance.mjs
// سكربت ذكي يدعم عدة طرق استدعاء لـ tronweb (v4/v5/v6...) ويعرض totalSupply + balanceOf
import * as TronWebModule from "tronweb";
import fs from "fs";
import path from "path";

const ABI_FILE = path.join(process.cwd(), "USDT_abi.json"); // تأكد موجود
const CONTRACT = "TVmawZMTy6ecAJMwcXMjWz1UHpLzdcc1QZ"; // غيّر إذا لزم (Base58)
const RPC = "https://api.trongrid.io"; // Mainnet (غيّر إلى Shasta إذا كنت على Testnet)

if (!process.env.PRIVATE_KEY) {
  console.error("ERROR: export PRIVATE_KEY first (مثال: export PRIVATE_KEY=\"...\" )");
  process.exit(1);
}
if (!fs.existsSync(ABI_FILE)) {
  console.error("ERROR: ABI file not found:", ABI_FILE);
  process.exit(1);
}
const ABI = JSON.parse(fs.readFileSync(ABI_FILE, "utf8"));
const PK = process.env.PRIVATE_KEY;
const addressArg = process.argv[2]; // optional target address (base58). if omitted use PK-derived address

// Helper: try many init methods
function initTronWeb() {
  // TronWebModule may be namespace import; try common shapes
  const M = TronWebModule.default || TronWebModule; // handle default export or namespace
  const tries = [];

  // build config
  const cfgObj = { fullHost: RPC, privateKey: PK };

  // candidate 1: constructor function / class directly (TronWeb or default)
  try {
    if (typeof M === "function") {
      tries.push({ name: "DirectFunction", factory: () => new M(cfgObj) });
    }
  } catch (e) {}

  // candidate 2: M.TronWeb (class) e.g. TronWeb.TronWeb
  try {
    if (M && typeof M.TronWeb === "function") {
      tries.push({ name: "M.TronWeb", factory: () => new M.TronWeb({ fullHost: RPC, privateKey: PK }) });
    }
  } catch (e) {}

  // candidate 3: M.createInstance or M.TronWeb.createInstance
  try {
    if (M && typeof M.createInstance === "function") {
      tries.push({ name: "createInstance", factory: () => M.createInstance(cfgObj) });
    } else if (M && M.TronWeb && typeof M.TronWeb.createInstance === "function") {
      tries.push({ name: "TronWeb.createInstance", factory: () => M.TronWeb.createInstance(cfgObj) });
    }
  } catch (e) {}

  // candidate 4: default property that is class
  try {
    if (TronWebModule && TronWebModule.default && typeof TronWebModule.default === "function") {
      tries.push({ name: "defaultFunction", factory: () => new TronWebModule.default(cfgObj) });
    }
  } catch (e) {}

  // candidate 5: last resort: try calling M() if it's callable and returns instance
  try {
    if (typeof M === "function") {
      tries.push({ name: "callableFactory", factory: () => M(cfgObj) });
    }
  } catch (e) {}

  // execute tries until success
  for (const t of tries) {
    try {
      const inst = t.factory();
      // basic smoke test: has trx.getBalance function or contract()
      if (inst && inst.trx && typeof inst.trx.getBalance === "function" && typeof inst.contract === "function") {
        return { tronWeb: inst, used: t.name };
      }
    } catch (err) {
      // skip and try next
    }
  }

  throw new Error("Unable to initialize TronWeb with installed package. Tried: " + tries.map(x => x.name).join(", "));
}

(async () => {
  try {
    const { tronWeb, used } = initTronWeb();
    console.log("✅ Initialized TronWeb using:", used);

    // compute address to check
    let targetAddress = addressArg || null;
    try {
      if (!targetAddress) {
        // try defaultAddress, else derive from PK
        targetAddress = (tronWeb.defaultAddress && tronWeb.defaultAddress.base58) || tronWeb.address.fromPrivateKey(PK);
      }
    } catch (e) {
      console.warn("⚠︎ could not auto-derive address; supply it as argument");
      if (!targetAddress) {
        console.error("Usage: node token_balance.mjs <ADDRESS_BASE58>");
        process.exit(1);
      }
    }

    console.log("Using address:", targetAddress);
    // attach contract (TronWeb accept contract(abi, address) or contract(abi).at(address) depending on version)
    let contract;
    try {
      // prefer tronWeb.contract(abi, address)
      contract = await tronWeb.contract(ABI, CONTRACT);
    } catch (e1) {
      try {
        const tmp = await tronWeb.contract(ABI);
        contract = await tmp.at(CONTRACT);
      } catch (e2) {
        throw new Error("Failed to get contract instance: " + (e2.message || e2));
      }
    }

    // read totalSupply, decimals, balanceOf
    const [rawSupply, rawDecimals] = await Promise.all([contract.totalSupply().call(), contract.decimals().call()]);
    const decimals = parseInt(rawDecimals.toString ? rawDecimals.toString() : rawDecimals);
    const totalSupply = BigInt(rawSupply.toString ? rawSupply.toString() : rawSupply);

    console.log("totalSupply (raw):", totalSupply.toString());
    console.log("decimals:", decimals);
    // pretty print total supply
    const prettyTotal = Number(totalSupply) / (10 ** decimals);
    console.log(`Total supply: ${prettyTotal}`);

    // balanceOf
    const rawBal = await contract.balanceOf(targetAddress).call();
    const bal = BigInt(rawBal.toString ? rawBal.toString() : rawBal);
    const prettyBal = Number(bal) / (10 ** decimals);
    console.log(`Balance of ${targetAddress}: ${prettyBal}`);

  } catch (err) {
    console.error("ERROR:", err.message || err);
    // verbose for debugging
    // console.error(err);
    process.exit(1);
  }
})();
