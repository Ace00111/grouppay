import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { mainnet, base, optimism, polygon } from "wagmi/chains";

/** Monad testnet configuration for the Metropolis build. */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadexplorer.com" } },
  testnet: true,
});

/**
 * RainbowKit owns wallet discovery and connection UI.
 * The Monad testnet is first so the hackathon flow has a clear default target.
 */
export const walletConfig = getDefaultConfig({
  appName: "GroupPay",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "grouppay-preview-project-id",
  chains: [monadTestnet, mainnet, base, optimism, polygon],
  ssr: false,
});
