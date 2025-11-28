import type { Abi } from 'viem';

import { confidentialSwapAbi, confidentialUsdtAbi } from './abis';

type ContractConfig = {
  address: `0x${string}`;
  abi: Abi;
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const ACTIVE_CHAIN_ID = 11155111;
export const TOKEN_DECIMALS = 6;

export const sepoliaContracts: {
  swap: ContractConfig;
  cusdt: ContractConfig;
} = {
  swap: {
    address: "0x0E60Efa8ED650bA0B143450A3E3c7FD84A3cdf6E",
    abi: confidentialSwapAbi as unknown as Abi,
  },
  cusdt: {
    address: "0xF005214136E02Ed99f9a99671bda8bdd7ff82681",
    abi: confidentialUsdtAbi as unknown as Abi,
  },
};

export type ContractsConfig = typeof sepoliaContracts;

export function getContracts(chainId?: number) {
  if (chainId === ACTIVE_CHAIN_ID) {
    return sepoliaContracts;
  }
  return undefined;
}
