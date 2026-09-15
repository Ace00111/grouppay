import fs from "node:fs";
import solc from "solc";

const source = fs.readFileSync("contracts/GroupPay.sol", "utf8");
const input = {
  language: "Solidity",
  sources: { "GroupPay.sol": { content: source } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((item) => item.severity === "error");
if (errors.length) {
  console.error(errors.map((item) => item.formattedMessage).join("\n"));
  process.exit(1);
}
const contract = output.contracts?.["GroupPay.sol"]?.GroupPay;
if (!contract?.abi || !contract.evm.bytecode.object) throw new Error("Compiler did not produce GroupPay artifacts");
fs.mkdirSync("contracts/artifacts", { recursive: true });
fs.writeFileSync("contracts/artifacts/GroupPay.json", JSON.stringify({ abi: contract.abi, bytecode: contract.evm.bytecode.object }, null, 2));
console.log(`Compiled GroupPay.sol with ${contract.abi.length} ABI entries.`);
