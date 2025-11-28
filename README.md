# ShadowFlow – Confidential ETH ➜ cUSDT Swap

ShadowFlow delivers a fixed-rate ETH-to-cUSDT swap with full on-chain confidentiality powered by the Zama FHEVM stack. Users swap ETH at a deterministic 1 ETH = 4000 cUSDT price, hold balances privately, decrypt on demand, and transfer cUSDT without exposing cleartext values on-chain.

## Why ShadowFlow
- **End-to-end privacy**: Encrypted balances and transfers through FHEVM and the Zama relayer SDK. On-chain state never reveals cleartext amounts.
- **Deterministic pricing**: Fixed 1 ETH = 4000 cUSDT keeps UX predictable and limits oracle dependencies.
- **Non-custodial flows**: Users retain control; the swap contract only mints and delivers confidential tokens while collecting ETH fees.
- **Operational safety**: Liquidity is explicitly seeded and tracked; ETH withdrawals are owner-gated; reentrancy-safe execution.
- **Developer clarity**: Tests, typed contracts, and a React + Vite frontend that uses viem for reads and ethers for writes, matching the production integration model.

## What the project solves
- **Private stable exposure**: Acquire a stable-denominated asset (cUSDT) without leaking swap sizes or holdings.
- **Confidential transfers**: Move balances privately using client-side encryption with access control enforced by the FHEVM.
- **Auditable yet private**: Liquidity, swap events, and ETH fees remain transparent, while individual balances and transfer amounts stay encrypted.
- **Predictable onboarding**: A single fixed rate removes price discovery frictions for users new to confidential assets.

## Core architecture
### Smart contracts
- **ConfidentialUSDT (contracts/ConfidentialUSDT.sol)**: ERC7984 confidential token (6 decimals, symbol `cUSDT`). Mints in fixed 100 cUSDT units using FHE encrypted amounts. Immutable and not modified by swaps.
- **ConfidentialSwap (contracts/ConfidentialSwap.sol)**: Ownable, reentrancy-safe swap. Accepts ETH and delivers encrypted cUSDT at 1:4000. Owner seeds liquidity in batches of 100 cUSDT (max 5 batches per call) and can withdraw collected ETH. View helpers expose quotas and minted/distributed liquidity without relying on `msg.sender`.
- **FHECounter (contracts/FHECounter.sol)**: Reference FHE sample retained for development/testing.

### Frontend (ui/)
- Built with **React + Vite + TypeScript**, **RainbowKit** for wallet UX, **wagmi/viem** for reads, **ethers** for writes.
- **Swap panel**: Execute ETH → cUSDT swaps on Sepolia; shows fixed quote and live available liquidity.
- **Balance panel**: Displays encrypted balance handles and lets users decrypt via `@zama-fhe/relayer-sdk`.
- **Transfer panel**: Client-side encryption plus ACL-aware cUSDT transfers using the confidential transfer entrypoint.
- Targets the Sepolia network only; no localhost networks or frontend env vars are used.

## Tech stack
- **Hardhat + TypeScript** for compilation, testing, and deployment.
- **@fhevm/solidity** and **@zama-fhe/relayer-sdk** for confidential computation and client encryption.
- **hardhat-deploy**, **ethers v6**, **typechain**, **solidity-coverage**, **eslint/prettier** for reliability and DX.
- **React, Vite, wagmi, RainbowKit, viem** for the application layer.

## Repository layout
- `contracts/` – ConfidentialUSDT, ConfidentialSwap, reference FHECounter.
- `deploy/` – Hardhat deployment script that seeds liquidity post-deploy.
- `deployments/` – Generated artifacts and ABIs (use these ABIs for the frontend).
- `tasks/` – Custom Hardhat tasks.
- `test/` – Unit tests for swap and FHE components.
- `ui/` – Frontend application (no Tailwind, Sepolia-only).
- `docs/` – Zama protocol and relayer notes (`docs/zama_llm.md`, `docs/zama_doc_relayer.md`).

## Prerequisites
- Node.js 20+
- npm
- Sepolia RPC access via **Infura** (uses `process.env.INFURA_API_KEY`).
- Deployment key via **`process.env.PRIVATE_KEY`** (private key only, no mnemonics).
- Optional: `process.env.ETHERSCAN_API_KEY` for verification.

## Backend setup and usage
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in a `.env` file:
   ```bash
   INFURA_API_KEY=<your_infura_key>
   PRIVATE_KEY=<deployer_private_key>
   ETHERSCAN_API_KEY=<optional_for_verification>
   ```
3. Compile and test:
   ```bash
   npm run compile
   npm run test            # Hardhat network with FHE mocks
   npm run coverage        # Optional coverage
   ```
4. Local development utilities:
   ```bash
   npm run chain           # Hardhat node (FHE mock)
   npm run deploy:localhost
   ```
5. Deploy to Sepolia (seeds liquidity automatically: 5 batches x 100 cUSDT):
   ```bash
   npm run deploy:sepolia
   ```
6. (Optional) Verify on Etherscan:
   ```bash
   npm run verify:sepolia -- <ConfidentialSwap_address>
   ```

### Contract behaviors at a glance
- **Swap rate**: 1 ETH = 4000 cUSDT (6 decimals).
- **Liquidity model**: Owner mints in 100 cUSDT increments; max 5 mint batches per call; available liquidity = minted – distributed.
- **Access control**: Owner-only liquidity seeding and ETH withdrawals; swaps are nonReentrant.
- **Views**: `availableLiquidity`, `mintedLiquidity`, `distributedLiquidity`, `quote`, `mintUnit`, `tokenDecimals`.

## Frontend setup (ui/)
1. Install dependencies:
   ```bash
   cd ui
   npm install
   ```
2. Configure wallet connectivity:
   - Update `ui/src/config/wagmi.ts` with your WalletConnect `projectId`.
3. Wire deployed contracts:
   - Copy ABIs from `deployments/sepolia/*.json` into `ui/src/config/abis.ts` (they must stay in sync with deployments).
   - Set deployed addresses in `ui/src/config/contracts.ts` (Sepolia only; no localhost endpoints).
4. Run the app:
   ```bash
   npm run dev
   ```
5. Usage:
   - Connect a Sepolia wallet, swap ETH→cUSDT, view encrypted balance handles, decrypt via the relayer SDK, and send confidential transfers (ethers for writes, viem for reads).

## Future roadmap
- **Dynamic pricing and oracle integration** while preserving confidentiality guarantees.
- **Multi-asset support** for additional confidential stable assets and pairs.
- **Liquidity provider tooling**: dashboards for seeding/withdrawing and automated rebalancing.
- **Production hardening**: subgraph indexing, alerting, gas optimizations, and fuzz/property-based testing.
- **UX refinements**: richer transaction status, mobile optimizations, and progressive rollouts of relayer SDK features.

## References
- Zama protocol docs: see `docs/zama_llm.md` and `docs/zama_doc_relayer.md`.
- FHEVM Solidity library: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- RainbowKit / wagmi: [https://www.rainbowkit.com/docs/introduction](https://www.rainbowkit.com/docs/introduction)

## License
BSD-3-Clause-Clear. See `LICENSE`.
