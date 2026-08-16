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

// الوصول للمخرجات بطريقة مرنة
let contract;
try {
    contract = output.contracts['USDT.sol'][contractName];
    if (!contract) throw new Error('Contract not found in compilation output');
} catch (err) {
    console.error('Compilation failed:', err);
    console.log('Full output:', JSON.stringify(output, null, 2));
    process.exit(1);
}

const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

fs.writeFileSync('USDT_abi.json', JSON.stringify(abi, null, 2));
fs.writeFileSync('USDT_bytecode.txt', bytecode);
console.log('✅ Compilation finished. ABI and bytecode files created.');
