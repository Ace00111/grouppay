# GroupPay contract

`GroupPay.sol` is the first onchain foundation for the Monad Metropolis build. It implements creator-owned group wallets with native MON deposits, creator-authorized sends, close-group state, and event-based accounting.

## Network configuration

- Monad testnet chain ID: `10143`
- Monad testnet RPC: `https://rpc.testnet.monad.xyz`
- Monad testnet explorer: `https://testnet.monadscan.com`
- Hackathon portal network listing: chain ID `143`; confirm the final deployment target before submission.

## Suggested deployment

Use Foundry or Hardhat with Solidity `0.8.24`. Keep the deployer private key outside the repository. After deployment, record the address in the app environment as `VITE_GROUPPAY_CONTRACT_ADDRESS` and in the server environment as `GROUPPAY_CONTRACT_ADDRESS`.

The contract currently uses native MON so the first demo stays small and auditable. ERC-20 support should be added only after the native flow is tested end to end.
