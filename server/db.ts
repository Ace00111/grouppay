import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  GroupTransaction,
  GroupWallet,
  InsertUser,
  ContractEvent,
  contractEvents,
  WalletConnection,
  groupTransactions,
  groupWallets,
  users,
  walletConnections,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

/** The preview works without a database; production uses DATABASE_URL automatically. */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

type WalletChainFields = "contractGroupId" | "contractAddress" | "chainId" | "creatorAddress" | "balanceBaseUnits";
type TransactionChainFields = "lifecycleStatus" | "txHash" | "blockNumber" | "fromAddress" | "toAddress" | "tokenAddress" | "amountBaseUnits";
export type WalletDraft = Omit<GroupWallet, "id" | "createdAt" | "updatedAt" | WalletChainFields> & Partial<Pick<GroupWallet, WalletChainFields>>;
export type TransactionDraft = Omit<GroupTransaction, "id" | "createdAt" | TransactionChainFields> & Partial<Pick<GroupTransaction, TransactionChainFields>>;

// A small fallback store keeps preview interactions live when DATABASE_URL is not set.
const fallbackWallets: GroupWallet[] = [
  {
    id: 1,
    ownerId: 0,
    name: "Dubai Trip",
    category: "Trip",
    membersCount: 5,
    balanceCents: 123000,
    balanceBaseUnits: "0",
    totalContributedCents: 200000,
    totalSpentCents: 168000,
    status: "Active",
    currency: "USD",
    contractGroupId: null,
    contractAddress: null,
    chainId: null,
    creatorAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    ownerId: 0,
    name: "Roommates",
    category: "Roommates",
    membersCount: 3,
    balanceCents: 42000,
    balanceBaseUnits: "0",
    totalContributedCents: 140000,
    totalSpentCents: 98000,
    status: "Active",
    currency: "USD",
    contractGroupId: null,
    contractAddress: null,
    chainId: null,
    creatorAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    ownerId: 0,
    name: "Weekend Crew",
    category: "Friends",
    membersCount: 4,
    balanceCents: 31000,
    balanceBaseUnits: "0",
    totalContributedCents: 80000,
    totalSpentCents: 49000,
    status: "Active",
    currency: "USD",
    contractGroupId: null,
    contractAddress: null,
    chainId: null,
    creatorAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fallbackTransactions: GroupTransaction[] = [
  { id: 1, ownerId: 0, groupId: 1, title: "Dubai Trip", subtitle: "5 members · Trip", amountCents: 123000, amountBaseUnits: "0", status: "Active", lifecycleStatus: "confirmed", txHash: null, blockNumber: null, fromAddress: null, toAddress: null, tokenAddress: null, createdAt: new Date() },
  { id: 2, ownerId: 0, groupId: 2, title: "Roommates", subtitle: "3 members · Household", amountCents: 42000, amountBaseUnits: "0", status: "Active", lifecycleStatus: "confirmed", txHash: null, blockNumber: null, fromAddress: null, toAddress: null, tokenAddress: null, createdAt: new Date() },
  { id: 3, ownerId: 0, groupId: 3, title: "Weekend Crew", subtitle: "4 members · Friends", amountCents: 31000, amountBaseUnits: "0", status: "Active", lifecycleStatus: "confirmed", txHash: null, blockNumber: null, fromAddress: null, toAddress: null, tokenAddress: null, createdAt: new Date() },
  { id: 4, ownerId: 0, groupId: 3, title: "Weekend Crew", subtitle: "4 members · Friends", amountCents: 31000, amountBaseUnits: "0", status: "Active", lifecycleStatus: "confirmed", txHash: null, blockNumber: null, fromAddress: null, toAddress: null, tokenAddress: null, createdAt: new Date() },
];

const fallbackConnections: WalletConnection[] = [];

export async function listGroupWallets(ownerId: number) {
  const db = await getDb();
  if (!db) return fallbackWallets.filter((wallet) => wallet.ownerId === 0 || wallet.ownerId === ownerId);
  return db.select().from(groupWallets).where(eq(groupWallets.ownerId, ownerId));
}

export async function listGroupTransactions(ownerId: number) {
  const db = await getDb();
  if (!db) return fallbackTransactions.filter((tx) => tx.ownerId === 0 || tx.ownerId === ownerId);
  return db.select().from(groupTransactions).where(eq(groupTransactions.ownerId, ownerId));
}

export async function createGroupWallet(ownerId: number, draft: WalletDraft) {
  const db = await getDb();
  if (!db) {
    const id = Math.max(...fallbackWallets.map((wallet) => wallet.id), 0) + 1;
    const now = new Date();
    const wallet = {
      ...draft,
      contractGroupId: draft.contractGroupId ?? null,
      contractAddress: draft.contractAddress ?? null,
      chainId: draft.chainId ?? null,
      creatorAddress: draft.creatorAddress ?? null,
      balanceBaseUnits: draft.balanceBaseUnits ?? "0",
      id,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    fallbackWallets.unshift(wallet);
    return wallet;
  }
  const result = await db.insert(groupWallets).values({ ...draft, ownerId });
  const insertedId = Number(result[0].insertId);
  const rows = await db.select().from(groupWallets).where(eq(groupWallets.id, insertedId)).limit(1);
  return rows[0];
}

/** Returns one wallet so write procedures can enforce creator-admin ownership. */
export async function getGroupWalletById(id: number) {
  const db = await getDb();
  if (!db) return fallbackWallets.find((wallet) => wallet.id === id);
  const rows = await db.select().from(groupWallets).where(eq(groupWallets.id, id)).limit(1);
  return rows[0];
}

export async function createGroupTransaction(ownerId: number, draft: TransactionDraft) {
  const db = await getDb();
  if (!db) {
    const id = Math.max(...fallbackTransactions.map((tx) => tx.id), 0) + 1;
    const transaction = {
      ...draft,
      lifecycleStatus: draft.lifecycleStatus ?? "draft",
      txHash: draft.txHash ?? null,
      blockNumber: draft.blockNumber ?? null,
      fromAddress: draft.fromAddress ?? null,
      toAddress: draft.toAddress ?? null,
      tokenAddress: draft.tokenAddress ?? null,
      amountBaseUnits: draft.amountBaseUnits ?? String(Math.max(draft.amountCents, 0) * 10_000_000_000_000_000),
      id,
      ownerId,
      createdAt: new Date(),
    };
    fallbackTransactions.unshift(transaction);
    return transaction;
  }
  const result = await db.insert(groupTransactions).values({ ...draft, ownerId });
  const insertedId = Number(result[0].insertId);
  const rows = await db.select().from(groupTransactions).where(eq(groupTransactions.id, insertedId)).limit(1);
  return rows[0];
}

export async function updateGroupTransaction(
  ownerId: number,
  id: number,
  patch: Partial<Pick<GroupTransaction, "lifecycleStatus" | "txHash" | "blockNumber" | "status">>,
) {
  const db = await getDb();
  if (!db) {
    const transaction = fallbackTransactions.find((item) => item.id === id && (item.ownerId === ownerId || item.ownerId === 0));
    if (!transaction) return undefined;
    Object.assign(transaction, patch);
    return transaction;
  }
  await db.update(groupTransactions).set(patch).where(and(eq(groupTransactions.id, id), eq(groupTransactions.ownerId, ownerId)));
  const rows = await db.select().from(groupTransactions).where(and(eq(groupTransactions.id, id), eq(groupTransactions.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function getGroupTransactionById(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return fallbackTransactions.find((item) => item.id === id && (item.ownerId === ownerId || item.ownerId === 0));
  const rows = await db.select().from(groupTransactions).where(and(eq(groupTransactions.id, id), eq(groupTransactions.ownerId, ownerId))).limit(1);
  return rows[0];
}

export type ContractEventDraft = Omit<ContractEvent, "id" | "createdAt">;

/** Inserts an event once; eventKey makes indexer retries safe. */
export async function recordContractEvent(draft: ContractEventDraft) {
  const db = await getDb();
  if (!db) return { ...draft, id: Date.now(), createdAt: new Date() };
  await db.insert(contractEvents).values(draft).onDuplicateKeyUpdate({ set: { eventKey: draft.eventKey } });
  const rows = await db.select().from(contractEvents).where(eq(contractEvents.eventKey, draft.eventKey)).limit(1);
  return rows[0];
}

export async function saveWalletConnection(ownerId: number, draft: Omit<WalletConnection, "id" | "ownerId" | "connectedAt">) {
  const db = await getDb();
  if (!db) {
    const connection = { ...draft, id: Date.now(), ownerId, connectedAt: new Date() };
    fallbackConnections.unshift(connection);
    return connection;
  }
  const result = await db.insert(walletConnections).values({ ...draft, ownerId });
  const insertedId = Number(result[0].insertId);
  const rows = await db.select().from(walletConnections).where(eq(walletConnections.id, insertedId)).limit(1);
  return rows[0];
}
