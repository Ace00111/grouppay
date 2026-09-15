import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the bundled Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Group wallets use integer cents so money stays exact at the API boundary. */
export const groupWallets = mysqlTable("group_wallets", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().default(0),
  name: varchar("name", { length: 128 }).notNull(),
  category: mysqlEnum("category", [
    "Trip",
    "Friends",
    "Couple",
    "Team",
    "Roommates",
    "Custom",
  ]).notNull(),
  membersCount: int("membersCount").notNull().default(1),
  balanceCents: int("balanceCents").notNull().default(0),
  balanceBaseUnits: varchar("balanceBaseUnits", { length: 78 }).notNull().default("0"),
  totalContributedCents: int("totalContributedCents").notNull().default(0),
  totalSpentCents: int("totalSpentCents").notNull().default(0),
  status: mysqlEnum("status", ["Active", "Settled"]).notNull().default("Active"),
  currency: varchar("currency", { length: 12 }).notNull().default("USD"),
  contractGroupId: int("contractGroupId"),
  contractAddress: varchar("contractAddress", { length: 128 }),
  chainId: varchar("chainId", { length: 32 }),
  creatorAddress: varchar("creatorAddress", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const groupTransactions = mysqlTable("group_transactions", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().default(0),
  groupId: int("groupId"),
  title: varchar("title", { length: 128 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }).notNull(),
  amountCents: int("amountCents").notNull().default(0),
  amountBaseUnits: varchar("amountBaseUnits", { length: 78 }).notNull().default("0"),
  status: mysqlEnum("status", ["Active", "Completed", "Pending"]).notNull().default("Active"),
  lifecycleStatus: mysqlEnum("lifecycleStatus", ["draft", "awaiting_signature", "submitted", "confirmed", "failed"]).notNull().default("draft"),
  txHash: varchar("txHash", { length: 128 }),
  blockNumber: varchar("blockNumber", { length: 32 }),
  fromAddress: varchar("fromAddress", { length: 128 }),
  toAddress: varchar("toAddress", { length: 128 }),
  tokenAddress: varchar("tokenAddress", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const walletConnections = mysqlTable("wallet_connections", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().default(0),
  provider: varchar("provider", { length: 32 }).notNull(),
  address: varchar("address", { length: 128 }).notNull(),
  chainId: varchar("chainId", { length: 32 }),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
});

/** Raw GroupPay contract events form the durable indexer checkpoint/read model. */
export const contractEvents = mysqlTable("contract_events", {
  id: int("id").autoincrement().primaryKey(),
  eventKey: varchar("eventKey", { length: 220 }).notNull().unique(),
  chainId: varchar("chainId", { length: 32 }).notNull(),
  contractAddress: varchar("contractAddress", { length: 128 }).notNull(),
  eventName: varchar("eventName", { length: 64 }).notNull(),
  txHash: varchar("txHash", { length: 128 }).notNull(),
  blockNumber: varchar("blockNumber", { length: 32 }).notNull(),
  groupId: int("groupId"),
  actorAddress: varchar("actorAddress", { length: 128 }),
  counterpartyAddress: varchar("counterpartyAddress", { length: 128 }),
  amountBaseUnits: varchar("amountBaseUnits", { length: 78 }),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GroupWallet = typeof groupWallets.$inferSelect;
export type GroupTransaction = typeof groupTransactions.$inferSelect;
export type WalletConnection = typeof walletConnections.$inferSelect;
export type ContractEvent = typeof contractEvents.$inferSelect;
