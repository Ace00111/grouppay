import fs from "node:fs";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

const privateKey = process.env.MONAD_DEPLOYER_PRIVATE_KEY;
if (!privateKey) throw new Error("Set MONAD_DEPLOYER_PRIVATE_KEY in the shell; never commit it.");
const artifact = JSON.parse(fs.readFileSync("contracts/artifacts/GroupPay.json", "utf8"));
const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadexplorer.com" } },
  testnet: true,
});
const account = privateKeyToAccount(privateKey);
const client = createWalletClient({ account, chain: monadTestnet, transport: http() });
const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const hash = await client.deployContract({ abi: artifact.abi, bytecode: `0x${artifact.bytecode}`, args: [] });
console.log(`Deployment submitted: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`GroupPay deployed at: ${receipt.contractAddress}`);
console.log(`Explorer: https://testnet.monadscan.com/address/${receipt.contractAddress}`);
