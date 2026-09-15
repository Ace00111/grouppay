import { createPublicClient, decodeEventLog, defineChain, http, type Address, type Hex } from "viem";
import { recordContractEvent } from "./db";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL || "https://rpc.testnet.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
  testnet: true,
});

const groupPayEvents = [
  {
    type: "event",
    name: "GroupCreated",
    inputs: [
      { indexed: true, name: "groupId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
  },
  {
    type: "event",
    name: "FundsReceived",
    inputs: [
      { indexed: true, name: "groupId", type: "uint256" },
      { indexed: true, name: "from", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "note", type: "string" },
    ],
  },
  {
    type: "event",
    name: "FundsSent",
    inputs: [
      { indexed: true, name: "groupId", type: "uint256" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "note", type: "string" },
    ],
  },
  {
    type: "event",
    name: "GroupClosed",
    inputs: [
      { indexed: true, name: "groupId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
  },
] as const;

/**
 * Pulls a bounded block range and writes each event idempotently.
 * A scheduler or worker can persist the last block and call this repeatedly.
 */
export async function syncGroupPayEvents(fromBlock: bigint, toBlock?: bigint) {
  const configuredAddress = process.env.GROUPPAY_CONTRACT_ADDRESS;
  if (!configuredAddress) return { synced: 0, skipped: true as const, reason: "GROUPPAY_CONTRACT_ADDRESS is not configured" };
  const contractAddress = configuredAddress as Address;
  const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
  const logs = await publicClient.getLogs({ address: contractAddress, fromBlock, toBlock });
  let synced = 0;
  for (const log of logs) {
    if (!log.transactionHash || log.blockNumber === null) continue;
    let decoded: { eventName: string; args: Record<string, unknown> };
    try {
      decoded = decodeEventLog({ abi: groupPayEvents, data: log.data as Hex, topics: log.topics }) as typeof decoded;
    } catch {
      continue;
    }
    const args = decoded.args;
    const groupId = typeof args.groupId === "bigint" ? Number(args.groupId) : null;
    await recordContractEvent({
      eventKey: `${log.transactionHash}:${log.logIndex}`,
      chainId: String(monadTestnet.id),
      contractAddress,
      eventName: decoded.eventName,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber.toString(),
      groupId,
      actorAddress: typeof args.creator === "string" ? args.creator : typeof args.from === "string" ? args.from : null,
      counterpartyAddress: typeof args.to === "string" ? args.to : null,
      amountBaseUnits: typeof args.amount === "bigint" ? args.amount.toString() : null,
      note: typeof args.name === "string" ? args.name : typeof args.note === "string" ? args.note : null,
    });
    synced += 1;
  }
  return { synced, skipped: false as const, fromBlock: fromBlock.toString(), toBlock: toBlock?.toString() };
}
