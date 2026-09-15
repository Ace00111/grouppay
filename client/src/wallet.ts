import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import { mainnet, base, optimism, polygon } from "wagmi/chains";

/** Monad testnet configuration for the Metropolis build. */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
  testnet: true,
});

/**
 * RainbowKit owns wallet discovery and connection UI.
 * The Monad testnet is first so the hackathon flow has a clear default target.
 */
export const walletConfig = getDefaultConfig({
  appName: "GroupPay",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "3a700a2f0aae0324c6d8336a21016ac5",
  chains: [monadTestnet, mainnet, base, optimism, polygon],
  ssr: false,
});
