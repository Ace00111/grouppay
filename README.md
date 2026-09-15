# GroupPay UI + Wallet API

GroupPay is a linked group-wallet dashboard rebuilt from the supplied reference panorama. The frontend is intentionally consolidated into the smallest readable source set: one React app file, one CSS file, and one API client entrypoint.

## Minimal frontend file set

| File | Purpose |
|---|---|
| `client/index.html` | HTML document shell and font loading. |
| `client/src/App.tsx` | All linked dashboard, send, batch settlement, group approval, and Dubai Trip detail views. It includes handwritten comments and small reusable render helpers. |
| `client/src/index.css` | Complete light/dark design system, responsive breakpoints, and component styling. |
| `client/src/main.tsx` | Single tRPC/React Query client bootstrap. |
| `client/src/lib/trpc.ts` | Typed backend client binding. |
| `client/src/wallet.ts` | RainbowKit/wagmi configuration for EVM chains. |

Superseded screen components, mock data files, template pages, and duplicate standalone HTML files were removed.

## Backend API

The static project was upgraded to the managed full-stack template with tRPC, Express, Drizzle, and user support. The relevant business API is in `server/routers.ts`:

| Procedure | Purpose |
|---|---|
| `groupPay.snapshot` | Loads group wallets and transaction history for the dashboard. |
| `groupPay.createGroup` | Creates a group wallet using a validated name and category. |
| `groupPay.sendMoney` | Records a transfer intent with exact integer-cent amounts. |
| `groupPay.connectWallet` | Stores only a validated public wallet address, provider, and chain ID. No private keys are accepted or stored. |

Database persistence is defined in `drizzle/schema.ts` for users, group wallets, transactions, and wallet connections. When no database is available, the API uses a small in-memory preview fallback so the UI remains interactive.

## Wallet connection

- **RainbowKit + wagmi:** The sidebar uses the official `ConnectButton` and provider stack instead of a custom wallet dropdown. It sits directly above Settings.
- **MetaMask and WalletConnect:** Both are discovered through RainbowKit's connector list. WalletConnect QR/mobile sessions require `VITE_WALLETCONNECT_PROJECT_ID`.
- **Public-address registration:** When wagmi reports a connected account, GroupPay sends only the public address and chain ID to `groupPay.connectWallet`. No private keys or signing data are stored.

Set `VITE_WALLETCONNECT_PROJECT_ID` in the project environment to enable WalletConnect QR sessions.

## UI behavior

- Every view is linked through the top screen tabs, sidebar, cards, quick actions, and hash routes: `#dashboard`, `#send`, `#batch`, `#groups`, and `#detail`.
- The light/dark toggle persists in `localStorage`, respects the user's system preference on first load, and sits beside the profile icon/name in the sidebar footer.
- There is no top bar: navigation is owned by the sidebar and content cards.
- `My Groups` now uses a wallet-card icon and contains the reusable `Dubai Trip` template card in the main content area, not the sidebar.
- `Requests` is a dedicated sidebar route (`#request`) with a request form and pending/paid request activity list. Send, Batch Send, and My Groups each have distinct summary, workspace, and action layouts.
- Sidebar order is Dashboard, Send, Requests, Batch Send, and My Groups. UI icons now come from Iconify's Solar set through `@iconify/react`; the previous Lucide dependency has been removed.
- The main interface uses Inter with Helvetica Neue fallbacks and a wide-bold display stack for headings. The dashboard sentence “Here's what's happening with your money.” intentionally keeps the existing Plus Jakarta Sans treatment.
- Settings and Profile are now linked sidebar views with appearance and notification controls, wallet status cards, profile details, and responsive account layouts. The sidebar Connect Wallet button is compact and disappears when wagmi reports a connected address; wallet actions remain available from Settings and Profile.
- Profile no longer shows the redundant group-count or membership-date rows. My Groups now uses creator-admin controls instead of approval placeholder copy. The creator stored in `group_wallets.ownerId` is the wallet admin and is the only actor allowed by the API to send from or receive into that group wallet.
- Responsive layouts collapse the sidebar into a horizontal mobile navigation strip, keep the profile/theme row visible, stack panels, and preserve readable form controls at narrow widths. Typography, dollar amounts, labels, buttons, input heights, panel spacing, and sidebar width use fluid `clamp()` scales rather than desktop-only fixed values.
- The detail page includes Overview, Expenses, Members, and Activity tabs with a safe placeholder state for the latter three until their API resources are added.

## Verification

- `pnpm check` passes.
- `pnpm test` passes: 2 test files and 4 tests.
- `pnpm build` passes.
- Browser verification confirmed the dashboard, Send Money, Create & Approvals, and Dubai Trip Detail routes render from direct hash links.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the local URL printed by the dev server. Production builds use:

```bash
pnpm build
pnpm start
```
