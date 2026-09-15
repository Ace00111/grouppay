import { syncGroupPayEvents } from "../server/indexer";

const fromBlock = BigInt(process.env.MONAD_INDEX_FROM_BLOCK || "0");
const toBlock = process.env.MONAD_INDEX_TO_BLOCK ? BigInt(process.env.MONAD_INDEX_TO_BLOCK) : undefined;
const result = await syncGroupPayEvents(fromBlock, toBlock);
console.log(JSON.stringify(result));
