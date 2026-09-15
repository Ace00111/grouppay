# GroupPay on Monad: Backend and Smart-Contract Build Plan

## Executive summary

GroupPay should be positioned for the **Consumer Products & Payments** track. The current product already expresses the right user problem: a shared wallet for trips, roommates, teams, and group expenses. The hackathon version should make the core money movement verifiably onchain while keeping the interface understandable to non-crypto users.

The recommended architecture is a **creator-owned group wallet contract deployed on Monad**, with a small server-side application layer for indexing, profiles, notifications, and read-optimized history. The group creator becomes the wallet administrator. The administrator can receive contributions and initiate outgoing transfers. Every important money movement is authorized by the creator wallet, recorded by the contract, and reflected in the GroupPay UI.

This architecture is intentionally narrow. It is feasible to finish, easy to demonstrate, and directly aligned with Monad’s published example of shared wallets and group spending in the Consumer Products & Payments track [1].

## Hackathon fit

Metropolis is a six-week global online hackathon running from 1 September to 13 October 2026. The official site describes four tracks and lists a $250,000 prize pool. The Consumer Products & Payments track has a $30,000 pool divided evenly among three teams [1]. The official submission requires a working product, a public project profile, a demo, a short write-up, and a code link [1].

GroupPay should select Consumer Products & Payments because the project is a shared-wallet and group-spending product rather than a general wallet dashboard. The product narrative should focus on the first five minutes of use: create a group, invite people, fund the wallet, send a payout, and show the transaction on Monad.

The official hackathon portal lists Monad Chain ID 143 and an intake window from 1 September to 13 October [2]. Monad’s developer hub currently lists testnet Chain ID 10143, the testnet RPC at `https://rpc.testnet.monad.xyz`, and Testnet Monadscan as the explorer [3]. These values must not be mixed. The contract should be deployed to testnet for development and demo verification, while the submission should clearly label the deployed network.

## Product promise

> **GroupPay is a shared wallet that lets a group create, fund, and spend together without asking every member to understand blockchain mechanics.**

The creator owns the group wallet. Members can receive an invite, view the balance, and contribute. The creator controls outgoing payments. GroupPay hides unnecessary chain terminology but exposes a verifiable transaction link when the user wants proof.

The hackathon demo should avoid presenting GroupPay as a multisig unless a multisig implementation is actually delivered. The current requested rule is creator-admin custody: one creator wallet authorizes outgoing transfers. This is simpler and consistent with the current product logic, but the UI must label the custody model clearly.

## Recommended system architecture

| Layer | Responsibility | Recommended implementation |
|---|---|---|
| Web client | Dashboard, groups, send, request, batch flow, wallet connection | Existing React application with RainbowKit and wagmi |
| Wallet layer | Connect wallet, sign transactions, read chain state | wagmi + RainbowKit + viem |
| Smart contract | Group creation, deposits, creator-authorized sends, membership events | Solidity contract deployed to Monad |
| Backend API | User profiles, indexed group metadata, transaction history, notifications, pending requests | Existing Express/tRPC server with protected procedures |
| Database | Read model and application metadata | Existing MySQL/TiDB schema through Drizzle |
| Indexer | Convert contract events into queryable application records | Start with a polling worker; use an indexer provider if available |
| Storage | Contract address, chain configuration, deployment metadata | Environment variables and deployment manifest |

The contract is the source of truth for balances and authorization. The database is a read model and application store. The backend must never pretend that a database row is proof that money moved onchain.

## Smart-contract design

### Contract responsibilities

Use one contract deployment that manages multiple group wallets. Each group is identified by a numeric `groupId`. The contract stores the creator, token configuration, active status, and balance accounting. The simplest hackathon version should support the native MON token first or one explicitly configured ERC-20 test token second. Supporting arbitrary tokens increases risk and demo complexity.

Recommended contract functions:

| Function | Who can call it | Purpose |
|---|---|---|
| `createGroup(string name)` | Any connected wallet | Creates a group and records `msg.sender` as creator/admin |
| `deposit(uint256 groupId)` | Any wallet | Sends native MON into the group wallet and emits a contribution event |
| `send(uint256 groupId, address payable recipient, uint256 amount, string note)` | Group creator only | Sends native MON from the group wallet |
| `closeGroup(uint256 groupId)` | Group creator only | Stops new deposits and optionally settles remaining balance |
| `group(uint256 groupId)` | Public view | Returns creator, name, active state, and accounting values |
| `groupsByCreator(address creator)` | Public view or offchain indexed | Returns groups created by a wallet |
| `balanceOf(uint256 groupId)` | Public view | Returns the contract-held balance for a group |

Recommended events:

```solidity
event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
event FundsReceived(uint256 indexed groupId, address indexed from, uint256 amount, string note);
event FundsSent(uint256 indexed groupId, address indexed to, uint256 amount, string note);
event GroupClosed(uint256 indexed groupId, address indexed creator);
```

### Creator-admin rule

The creator is stored immutably or authoritatively as `creator` for each group. The `send` and `closeGroup` functions use an explicit modifier or check:

```solidity
modifier onlyCreator(uint256 groupId) {
    if (groups[groupId].creator != msg.sender) revert NotCreator();
    _;
}
```

A backend permission check is still useful for UX, but it is not the security boundary. The contract check is the security boundary. If a malicious client bypasses the UI, the contract must still reject the call.

### Reentrancy and transfer safety

Use OpenZeppelin’s `ReentrancyGuard` if the contract performs external value transfers. Follow checks-effects-interactions ordering. Validate nonzero recipients and positive amounts. Do not use arbitrary low-level calls unless the behavior is understood and tested. If an ERC-20 mode is added, use `SafeERC20` and explicitly configure the token address per deployment.

The contract should not store user passwords, private keys, OAuth secrets, or arbitrary profile data. Notes should be length-limited. The contract should not attempt to implement fiat conversion or offchain approval rules in the first hackathon version.

## Backend changes

The current backend already has group wallets, transactions, wallet connections, and creator checks in `server/routers.ts` and `server/db.ts`. The current implementation records transfer intents in the database. The next stage should turn those intents into a transaction lifecycle.

### Database changes

Extend the schema with the following fields or tables:

| Table or field | Purpose |
|---|---|
| `group_wallets.contractGroupId` | Maps an app group to the onchain group ID |
| `group_wallets.contractAddress` | Stores the deployed contract address used by the group |
| `group_wallets.chainId` | Prevents mixing Monad testnet and mainnet records |
| `group_wallets.creatorAddress` | Stores the creator wallet address used by the contract |
| `group_transactions.txHash` | Stores the submitted or confirmed transaction hash |
| `group_transactions.lifecycleStatus` | `draft`, `awaiting_signature`, `submitted`, `confirmed`, `failed` |
| `group_transactions.blockNumber` | Enables confirmation and explorer links |
| `group_transactions.fromAddress` | Records the signing wallet |
| `group_transactions.toAddress` | Records the destination wallet |
| `group_transactions.tokenAddress` | Null for native MON; populated for ERC-20 mode |
| `group_members` | Stores invited members and their role/status |
| `payment_requests` | Stores request amount, requester, recipient, status, and optional group ID |
| `contract_events` | Stores indexed event ID, block number, transaction hash, and decoded payload |

All money amounts should remain integer base units at the API boundary. The UI can display formatted values, but the backend and contract integration should never use floating-point arithmetic for transaction amounts.

### API procedure plan

Replace the current public write procedures with authenticated procedures for real money operations. Keep read procedures public only if the product explicitly supports public group visibility.

Recommended procedures:

| Procedure | Purpose |
|---|---|
| `groupPay.snapshot` | Returns the authenticated user’s groups, members, balances, and recent indexed transactions |
| `groupPay.createGroup` | Creates an app record, then prepares or submits the onchain `createGroup` transaction |
| `groupPay.prepareDeposit` | Returns the contract call data or typed transaction request for a deposit |
| `groupPay.prepareSend` | Verifies creator ownership and returns the contract call for a creator-authorized send |
| `groupPay.recordSubmittedTransaction` | Associates a submitted hash with a pending transaction record |
| `groupPay.transactionStatus` | Returns indexed/confirmed/failed status from the database and chain RPC |
| `groupPay.createRequest` | Creates a payment request without moving funds |
| `groupPay.respondToRequest` | Prepares a deposit or send based on the request state |
| `groupPay.inviteMember` | Creates an invite linked to a group and address or username |
| `groupPay.members` | Returns group members and roles |
| `wallet.connect` | Stores wallet metadata and validates chain ID |

The server should not sign transactions for users. The user wallet signs through wagmi. The server creates an intent, validates permissions, and then indexes the resulting transaction.

### Transaction lifecycle

1. The user edits a send form.
2. The client calls `prepareSend` with `groupId`, recipient, amount, and note.
3. The server checks that the connected user owns the group and that the target chain is Monad.
4. The client calls the contract through wagmi and the connected wallet.
5. The client receives a transaction hash.
6. The client calls `recordSubmittedTransaction`.
7. A worker waits for confirmation and decodes the contract event.
8. The worker updates the group balance and transaction lifecycle status.
9. The UI invalidates the snapshot query and shows an explorer link.

The interface should show `Awaiting signature`, `Submitted`, `Confirmed`, and `Failed` states. It should never show a confirmed payment merely because the user clicked a button.

## Wallet and Monad integration

The current RainbowKit and wagmi integration is a good starting point. Add a Monad chain configuration with the correct chain ID for the chosen environment. Keep testnet and mainnet configuration separate.

The client should expose three wallet states:

| State | UI behavior |
|---|---|
| Disconnected | Show a compact Connect Wallet action |
| Connected to another chain | Show a switch-network action and block money operations |
| Connected to Monad | Show the wallet address and enable contract actions |

The user should be able to connect with MetaMask and WalletConnect through RainbowKit. The app should display the connected chain and address before any send action. The backend should validate the address format and chain ID, but the contract remains responsible for authorization.

Use the Monad testnet RPC and explorer from the official developer hub during development [3]. Confirm the final submission’s network and contract address in the project profile.

## Frontend flows to build

### Create a group

The user selects a group template and enters a name. The client asks the connected wallet to create the group onchain. After confirmation, the backend stores the returned `groupId`, creator address, contract address, and transaction hash. The group appears as an admin-owned wallet.

### Receive funds

The group creator opens a group and selects Receive. The UI displays the group deposit address or contract action. A contributor connects their wallet, enters an amount, signs a deposit, and receives a transaction status. The creator’s dashboard updates after event indexing.

### Send funds

The creator selects Send from a group. The UI validates the recipient and amount. The backend verifies creator ownership. The connected wallet signs the contract call. The UI displays the pending and confirmed states.

### Request funds

A member creates a request. The request is stored offchain until someone responds. The recipient or creator can open the request and trigger the corresponding onchain deposit or send flow. Requests are not approvals unless an actual approval mechanism is implemented.

### Batch send

The current two-step Batch Send UI is appropriate. Step one collects recipients and amounts. Step two is a separate full-width Batch Summary page. The next implementation should prepare one transaction per recipient or add a contract `batchSend` function only after the single-send flow is reliable. For the hackathon, a simple loop of wallet-signed sends is easier to audit, but a `batchSend` contract function can make the Monad performance story stronger if tested thoroughly.

## Indexing strategy

The minimum viable indexer can poll the Monad RPC for the contract’s events every few seconds. It should persist the last processed block and use an idempotent event key composed of transaction hash, log index, and contract address.

A production-shaped version should use a dedicated indexing provider from Monad’s tooling ecosystem if available. The application should remain correct if an indexer restarts. Never increment balances twice for the same event.

## Security boundaries

| Risk | Mitigation |
|---|---|
| Unauthorized group send | Contract `onlyCreator` check plus backend ownership check |
| Wrong network | Validate chain ID in client, backend, and deployment configuration |
| Replay or duplicate event | Idempotent event table keyed by transaction hash and log index |
| Fake confirmation | Mark confirmed only after RPC receipt and event decoding |
| Reentrancy | Use checks-effects-interactions and OpenZeppelin guard where needed |
| Bad amount handling | Use integer base units and reject zero/negative values |
| Malicious recipient | Validate nonzero address and display a confirmation step |
| Lost transaction state | Persist intent before signing and hash immediately after submission |
| Stale UI balance | Revalidate after receipt and indexer update |
| Admin confusion | Label creator as wallet administrator and explain custody clearly |
| Secret leakage | Keep private keys and API secrets out of the browser and database |

A formal audit is outside the hackathon scope. The contract should still include unit tests, integration tests, and a manual threat review before demo deployment.

## Delivery plan

| Phase | Deliverable | Exit condition |
|---|---|---|
| 1. Contract foundation | Solidity contract, tests, Monad testnet deployment | Create, deposit, send, and creator rejection tests pass |
| 2. Wallet execution | wagmi calls for create, deposit, and send | A real wallet signs a testnet transaction |
| 3. Backend lifecycle | Intent, submitted, confirmed, and failed records | Refreshing the browser preserves transaction status |
| 4. Indexer | Event polling and idempotent updates | Contract events update GroupPay balances automatically |
| 5. Requests and groups | Invite flow, request flow, member roles | A contributor can respond to a request onchain |
| 6. Batch send | Separate recipient and summary steps | Batch flow is usable and safe with a small recipient list |
| 7. Demo hardening | Error states, explorer links, mobile polish | A clean five-minute demo can be repeated from a fresh wallet |
| 8. Submission package | Demo video, write-up, code, contract address | Public profile contains every required link |

## Five-minute demo script

First, connect a wallet on Monad testnet and create a Dubai Trip group. Show that the connected creator address is the group admin. Second, copy the group deposit action and contribute a small amount from a second wallet or prepared test account. Third, refresh the dashboard and show the confirmed deposit with an explorer link. Fourth, use the creator wallet to send a payout to a recipient. Fifth, show the transaction status changing from awaiting signature to submitted to confirmed. Finish by explaining that GroupPay hides blockchain complexity while keeping group funds programmable and verifiable.

The demo should avoid showing unfinished generic dashboards. It should show one real group, one real deposit, one real creator-authorized send, and clear proof on Monad.

## Submission positioning

The project profile should describe GroupPay as a consumer payments product rather than a database dashboard. The write-up should explain the problem, the creator-admin custody model, the contract address, the Monad network used, and what is onchain versus offchain.

The strongest claim is not that GroupPay has every possible wallet feature. The strongest claim is that a group can create a shared wallet, move funds, and settle expenses on Monad through a simple consumer interface.

## Decisions to make before implementation

1. Choose native MON only for the first contract, or explicitly add one test ERC-20 token.
2. Decide whether a group creator is the sole administrator or whether a second phase will add multisig approvals.
3. Decide whether batch send uses repeated single-send calls or a tested `batchSend` contract method.
4. Choose the indexing approach and document its restart and reorg behavior.
5. Decide whether public users can browse groups or whether all group data requires authentication.
6. Confirm the target deployment network before publishing the contract address.

## References

[1]: https://monad.xyz/metropolis "Monad Metropolis official hackathon page"
[2]: https://hackathon.monad.xyz/ "Official Metropolis hackathon portal"
[3]: https://monad.xyz/developers "Monad official developer hub"
[4]: https://docs.monad.xyz "Monad official documentation"
