import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("groupPay API", () => {
  it("returns dashboard data and stores a new group wallet", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const before = await caller.groupPay.snapshot();
    expect(before.wallets).toBeInstanceOf(Array);
    expect(before.transactions).toBeInstanceOf(Array);

    const created = await caller.groupPay.createGroup({
      name: "Vitest Planning Crew",
      category: "Friends",
    });

    expect(created).toMatchObject({ name: "Vitest Planning Crew", category: "Friends", status: "Active" });
    const after = await caller.groupPay.snapshot();
    expect(after.wallets.some((wallet) => wallet.name === "Vitest Planning Crew")).toBe(true);
  });

  it("records a transfer intent and a public wallet connection", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const transfer = await caller.groupPay.sendMoney({
      recipient: "@vitest",
      amountCents: 5000,
      note: "Shared lunch",
    });
    expect(transfer).toMatchObject({ title: "@vitest", amountCents: 5000, subtitle: "Shared lunch" });

    const connection = await caller.groupPay.connectWallet({
      provider: "metamask",
      address: "0x0000000000000000000000000000000000000001",
      chainId: "0x1",
    });
    expect(connection).toMatchObject({ provider: "metamask", address: "0x0000000000000000000000000000000000000001", chainId: "0x1" });
  });

  it("treats the group creator as the wallet admin for sends and receipts", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const group = await caller.groupPay.createGroup({ name: "Vitest Admin Wallet", category: "Team" });

    const sent = await caller.groupPay.sendMoney({
      recipient: "@member",
      amountCents: 2500,
      note: "Creator-authorized send",
      groupId: group.id,
    });
    expect(sent).toMatchObject({ groupId: group.id, amountCents: 2500 });

    const received = await caller.groupPay.receiveFunds({
      groupId: group.id,
      amountCents: 5000,
      note: "Member contribution",
    });
    expect(received).toMatchObject({ groupId: group.id, amountCents: 5000, status: "Completed" });
  });

  it("rejects malformed wallet addresses before persistence", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.groupPay.connectWallet({ provider: "metamask", address: "not-a-wallet" })).rejects.toThrow();
  });

  it("creates, submits, and confirms a Monad send intent", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const creator = "0x0000000000000000000000000000000000000001";
    const contract = "0x00000000000000000000000000000000000000aa";
    const recipient = "0x00000000000000000000000000000000000000bb";
    const group = await caller.groupPay.createGroup({
      name: "Monad Testnet Wallet",
      category: "Friends",
      contractGroupId: 7,
      contractAddress: contract,
      chainId: "10143",
      creatorAddress: creator,
    });

    const intent = await caller.groupPay.prepareSend({
      groupId: group.id,
      fromAddress: creator,
      recipientAddress: recipient,
      amountBaseUnits: "1000000000000000000",
      amountCents: 100,
      note: "Monad dinner",
      chainId: "10143",
    });
    expect(intent).toMatchObject({ lifecycleStatus: "awaiting_signature", amountBaseUnits: "1000000000000000000", toAddress: recipient });

    const txHash = `0x${"1".repeat(64)}`;
    const submitted = await caller.groupPay.recordSubmittedTransaction({ transactionId: intent.id, txHash });
    expect(submitted).toMatchObject({ lifecycleStatus: "submitted", txHash });

    const confirmed = await caller.groupPay.confirmTransaction({ transactionId: intent.id, txHash, blockNumber: "123" });
    expect(confirmed).toMatchObject({ lifecycleStatus: "confirmed", status: "Completed", blockNumber: "123" });
  });
});
