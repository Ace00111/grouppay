import type { Abi } from "viem";

/** Minimal ABI used by the GroupPay UI. Keep this aligned with contracts/GroupPay.sol. */
export const groupPayAbi = [
  {
    type: "function",
    name: "createGroup",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "groupId", type: "uint256" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "note", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "send",
    stateMutability: "nonpayable",
    inputs: [
      { name: "groupId", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "note", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "GroupCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "groupId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
  },
] as const satisfies Abi;

export const groupPayContractAddress = (import.meta.env.VITE_GROUPPAY_CONTRACT_ADDRESS || "0x0be35b64b6e25389708c9211cad926407c5aba2a") as `0x${string}`;
