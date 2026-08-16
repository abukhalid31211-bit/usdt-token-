#!/usr/bin/env node
import TronWeb from 'tronweb';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// =====================
// إعدادات أساسية
// =====================
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
    console.error("❌ يجب تصدير PRIVATE_KEY أولاً");
    process.exit(1);
}

const targetAddress = process.argv[2]; // العنوان الذي تريد إرسال التوكن له
const tokenAmount = parseFloat(process.argv[3]); // كمية التوكن المراد إرسالها

if (!targetAddress || isNaN(tokenAmount)) {
    console.error("استخدام: node full_usdt_process.mjs [العنوان] [الكمية]");
    process.exit(1);
}

const projectDir = process.cwd();
const contractFile = path.join(projectDir, 'USDT.sol');
const abiFile = path.join(projectDir, 'USDT_abi.json');
const bytecodeFile = path.join(projectDir, 'USDT_bytecode.txt');

// =====================
// فحص البيئة
// =====================
try {
    execSync('node -v', { stdio: 'inherit' });
    execSync('npm -v', { stdio: 'inherit' });
    execSync('npm list tronweb || npm install tronweb', { stdio: 'inherit' });
    execSync('npm list solc || npm install solc@0.8.20', { stdio: 'inherit' });
} catch (err) {
    console.error("❌ فشل فحص البيئة:", err.message);
    process.exit(1);
}

// =====================
// ترجمة العقد
// =====================
console.log(">>> ترجمة العقد...");
if (!fs.existsSync(contractFile)) {
    console.error("❌ لم يتم العثور على ملف USDT.sol");
    process.exit(1);
}

import solc from 'solc';

const source = fs.readFileSync(contractFile, 'utf8');
const input = {
    language: 'Solidity',
    sources: {
        'USDT.sol': { content: source }
    },
    settings: { outputSelection: { '*': { '*': ['*'] } } }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contractName = Object.keys(output.contracts['USDT.sol'])[0];
const abi = output.contracts['USDT.sol'][contractName].abi;
const bytecode = output.contracts['USDT.sol'][contractName].evm.bytecode.object;

fs.writeFileSync(abiFile, JSON.stringify(abi, null, 2));
fs.writeFileSync(bytecodeFile, bytecode);

console.log("✅ الترجمة انتهت. ABI و Bytecode تم إنشاؤهما.");

// =====================
// إعداد TronWeb
// =====================
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // Mainnet
    privateKey: PRIVATE_KEY
});

// =====================
// نشر العقد
// =====================
async function deployContract() {
    console.log(">>> نشر العقد على شبكة TRON...");
    try {
        const contract = await tronWeb.contract().deploy({
            abi,
            bytecode,
            parameters: [] // إذا العقد يحتاج constructor parameters ضعها هنا
        });

        const deployed = await contract.deployed();
        console.log("✅ العقد نُشر بنجاح على العنوان:", deployed.address);
        return deployed.address;
    } catch (err) {
        console.error("❌ خطأ أثناء نشر العقد:", err.message);
        process.exit(1);
    }
}

// =====================
// إرسال التوكنات
// =====================
async function sendTokens(contractAddress) {
    console.log(`>>> إرسال ${tokenAmount} توكن إلى ${targetAddress} ...`);
    try {
        const contract = await tronWeb.contract(abi, contractAddress);
        const decimals = await contract.methods.decimals().call();
        const amountWithDecimals = tokenAmount * (10 ** decimals);

        const tx = await contract.methods.transfer(targetAddress, amountWithDecimals).send();
        console.log(`✅ تم إرسال ${tokenAmount} توكن إلى ${targetAddress}`);
        console.log("Transaction ID:", tx);
    } catch (err) {
        console.error("❌ خطأ أثناء إرسال التوكن:", err.message);
    }
}

// =====================
// قراءة الرصيد بعد الإرسال
// =====================
async function checkBalance(contractAddress) {
    try {
        const contract = await tronWeb.contract(abi, contractAddress);
        const balance = await contract.methods.balanceOf(targetAddress).call();
        const decimals = await contract.methods.decimals().call();
        console.log(`💰 الرصيد الحالي للعنوان ${targetAddress}: ${balance / (10 ** decimals)} توكن`);
    } catch (err) {
        console.error("❌ خطأ أثناء قراءة الرصيد:", err.message);
    }
}

// =====================
// التنفيذ الكامل
// =====================
(async () => {
    const deployedAddress = await deployContract();
    await sendTokens(deployedAddress);
    await checkBalance(deployedAddress);
})();
