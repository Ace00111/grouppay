import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  createGroupTransaction,
  createGroupWallet,
  getGroupTransactionById,
  getGroupWalletById,
  listGroupTransactions,
  listGroupWallets,
  saveWalletConnection,
  updateGroupTransaction,
} from "./db";

const categorySchema = z.enum(["Trip", "Friends", "Couple", "Team", "Roommates", "Custom"]);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Enter a valid EVM address.");
const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Enter a valid transaction hash.");
const monadChainSchema = z.union([z.literal("10143"), z.literal("0x279f")]);

const ownerIdFromContext = (userId?: number) => userId ?? 0;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  groupPay: router({
    /** Hydrates all screens from one backend request. */
    snapshot: publicProcedure.query(async ({ ctx }) => {
      const ownerId = ownerIdFromContext(ctx.user?.id);
      const [wallets, transactions] = await Promise.all([
        listGroupWallets(ownerId),
        listGroupTransactions(ownerId),
      ]);
      return { wallets, transactions };
    }),

    /** Creates a wallet and returns the inserted row for optimistic UI hydration. */
    createGroup: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(128),
          category: categorySchema,
          contractGroupId: z.number().int().nonnegative().optional(),
          contractAddress: addressSchema.optional(),
          chainId: monadChainSchema.optional(),
          creatorAddress: addressSchema.optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const wallet = await createGroupWallet(ownerIdFromContext(ctx.user?.id), {
          ownerId: ownerIdFromContext(ctx.user?.id),
          name: input.name,
          category: input.category,
          membersCount: 1,
          balanceCents: 0,
          totalContributedCents: 0,
          totalSpentCents: 0,
          status: "Active",
          currency: "USD",
          contractGroupId: input.contractGroupId,
          contractAddress: input.contractAddress,
          chainId: input.chainId,
          creatorAddress: input.creatorAddress,
        });
        return wallet;
      }),

    /** Records a transfer intent; signing/settlement remains a wallet-side concern. */
    sendMoney: publicProcedure
      .input(
        z.object({
          recipient: z.string().trim().min(2).max(128),
          amountCents: z.number().int().positive(),
          note: z.string().trim().max(255).default("Transfer"),
          groupId: z.number().int().positive().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        if (input.groupId) {
          const wallet = await getGroupWalletById(input.groupId);
          if (!wallet || wallet.ownerId !== ownerId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can send from this wallet." });
          }
        }
        return createGroupTransaction(ownerIdFromContext(ctx.user?.id), {
          ownerId: ownerIdFromContext(ctx.user?.id),
          groupId: input.groupId ?? null,
          title: input.recipient,
          subtitle: input.note || "Transfer",
          amountCents: input.amountCents,
          status: "Active",
        });
      }),

    /** Records a contribution received by a creator-owned group wallet. */
    receiveFunds: publicProcedure
      .input(
        z.object({
          groupId: z.number().int().positive(),
          amountCents: z.number().int().positive(),
          note: z.string().trim().max(255).default("Group contribution"),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        const wallet = await getGroupWalletById(input.groupId);
        if (!wallet || wallet.ownerId !== ownerId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can receive into this wallet." });
        }
        return createGroupTransaction(ownerId, {
          ownerId,
          groupId: input.groupId,
          title: "Group contribution",
          subtitle: input.note || "Group contribution",
          amountCents: input.amountCents,
          status: "Completed",
        });
      }),

    /** Creates a persisted intent before the connected wallet signs a deposit. */
    prepareDeposit: publicProcedure
      .input(z.object({
        groupId: z.number().int().positive(),
        fromAddress: addressSchema,
        amountBaseUnits: z.string().regex(/^\d+$/).min(1).max(78),
        amountCents: z.number().int().nonnegative().default(0),
        note: z.string().trim().max(255).default("Group contribution"),
        chainId: monadChainSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        const wallet = await getGroupWalletById(input.groupId);
        if (!wallet) throw new TRPCError({ code: "NOT_FOUND", message: "Group wallet not found." });
        if (wallet.chainId && wallet.chainId !== input.chainId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This group belongs to another network." });
        if (!wallet.contractAddress) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Deploy the GroupPay contract before preparing an onchain deposit." });
        return createGroupTransaction(ownerId, {
          ownerId,
          groupId: input.groupId,
          title: "Group contribution",
          subtitle: input.note || "Group contribution",
          amountCents: input.amountCents,
          amountBaseUnits: input.amountBaseUnits,
          status: "Pending",
          lifecycleStatus: "awaiting_signature",
          fromAddress: input.fromAddress,
          toAddress: wallet.contractAddress,
          tokenAddress: null,
        });
      }),

    /** Creates a creator-authorized outgoing transfer intent before wallet signing. */
    prepareSend: publicProcedure
      .input(z.object({
        groupId: z.number().int().positive(),
        fromAddress: addressSchema,
        recipientAddress: addressSchema,
        amountBaseUnits: z.string().regex(/^\d+$/).min(1).max(78),
        amountCents: z.number().int().positive().default(0),
        note: z.string().trim().max(255).default("Transfer"),
        chainId: monadChainSchema,
      }))
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        const wallet = await getGroupWalletById(input.groupId);
        if (!wallet || wallet.ownerId !== ownerId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can send from this wallet." });
        if (wallet.creatorAddress && wallet.creatorAddress.toLowerCase() !== input.fromAddress.toLowerCase()) throw new TRPCError({ code: "FORBIDDEN", message: "Connect the creator wallet to send from this group." });
        if (wallet.chainId && wallet.chainId !== input.chainId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Switch to the network used by this group." });
        if (!wallet.contractAddress) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Deploy the GroupPay contract before preparing an onchain send." });
        return createGroupTransaction(ownerId, {
          ownerId,
          groupId: input.groupId,
          title: input.recipientAddress,
          subtitle: input.note || "Transfer",
          amountCents: input.amountCents,
          amountBaseUnits: input.amountBaseUnits,
          status: "Pending",
          lifecycleStatus: "awaiting_signature",
          fromAddress: input.fromAddress,
          toAddress: input.recipientAddress,
          tokenAddress: null,
        });
      }),

    /** Associates a submitted wallet hash with an intent. */
    recordSubmittedTransaction: publicProcedure
      .input(z.object({ transactionId: z.number().int().positive(), txHash: txHashSchema }))
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        const transaction = await getGroupTransactionById(ownerId, input.transactionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction intent not found." });
        return updateGroupTransaction(ownerId, input.transactionId, { txHash: input.txHash, lifecycleStatus: "submitted", status: "Pending" });
      }),

    /** Marks a transaction confirmed after receipt/event verification. */
    confirmTransaction: publicProcedure
      .input(z.object({ transactionId: z.number().int().positive(), txHash: txHashSchema, blockNumber: z.string().regex(/^\d+$/).optional() }))
      .mutation(async ({ ctx, input }) => {
        const ownerId = ownerIdFromContext(ctx.user?.id);
        const transaction = await getGroupTransactionById(ownerId, input.transactionId);
        if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction intent not found." });
        return updateGroupTransaction(ownerId, input.transactionId, { txHash: input.txHash, blockNumber: input.blockNumber, lifecycleStatus: "confirmed", status: "Completed" });
      }),

    /** Registers public wallet metadata only; no private key or signing data is stored. */
  connectWallet: publicProcedure
      .input(
        z.object({
          provider: z.enum(["metamask", "walletconnect"]),
          address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
          chainId: z.string().max(32).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return saveWalletConnection(ownerIdFromContext(ctx.user?.id), {
          ...input,
          chainId: input.chainId ?? null,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
