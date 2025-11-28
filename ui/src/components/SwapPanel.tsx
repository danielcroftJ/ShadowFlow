import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useReadContract } from 'wagmi';
import type { Abi } from 'viem';

import type { JsonRpcSigner } from 'ethers';
import type { ContractsConfig } from '../config/contracts';
import { TOKEN_DECIMALS, ZERO_ADDRESS } from '../config/contracts';
import { formatTokenBalance, parseEth } from '../lib/format';

type Props = {
  address?: `0x${string}`;
  isConnected: boolean;
  signerPromise?: Promise<JsonRpcSigner>;
  contracts?: ContractsConfig;
};

export function SwapPanel({ address, isConnected, signerPromise, contracts }: Props) {
  const [ethAmount, setEthAmount] = useState('0.1');
  const [status, setStatus] = useState<'idle' | 'signing' | 'pending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const swapAbi = (contracts?.swap.abi ?? ([] as Abi));
  const swapAddress = contracts?.swap.address ?? ZERO_ADDRESS;

  const { data: liquidityData, refetch: refetchLiquidity } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'availableLiquidity',
    query: {
      enabled: Boolean(contracts),
    },
  });

  const { data: rateData } = useReadContract({
    abi: swapAbi,
    address: swapAddress,
    functionName: 'SWAP_RATE',
    query: {
      enabled: Boolean(contracts),
    },
  });

  const expectedCusdt = useMemo(() => {
    if (!rateData || !ethAmount) {
      return '0';
    }
    try {
      const wei = parseEth(ethAmount);
      if (wei <= 0n) {
        return '0';
      }
      const rate = BigInt(rateData);
      const quote = (wei * rate * 10n ** BigInt(TOKEN_DECIMALS)) / 10n ** 18n;
      return formatTokenBalance(quote, TOKEN_DECIMALS, 6);
    } catch {
      return '0';
    }
  }, [ethAmount, rateData]);

  const handleSwap = async () => {
    if (!contracts || !signerPromise || !isConnected) {
      setMessage('Connect your wallet on Sepolia to perform swaps.');
      return;
    }

    setStatus('signing');
    setMessage(null);

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable. Reconnect your wallet and retry.');
      }

      const value = parseEth(ethAmount);
      if (value <= 0n) {
        throw new Error('Enter a positive ETH amount.');
      }

      const swapContract = new Contract(swapAddress, swapAbi, signer);
      const tx = await swapContract.swap({ value });
      setStatus('pending');
      await tx.wait();
      setStatus('success');
      setMessage('Swap completed successfully. Your encrypted balance will refresh shortly.');
      await refetchLiquidity();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Swap failed.');
    }
  };

  const isBusy = status === 'signing' || status === 'pending';

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="status-pill">Swap</p>
          <h2 className="card-title">ETH → cUSDT</h2>
          <p className="card-description">Fixed 1 ETH = 4000 cUSDT with on-chain confidentiality.</p>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="eth-amount">ETH to swap</label>
        <input
          id="eth-amount"
          type="number"
          min="0"
          step="0.01"
          value={ethAmount}
          onChange={(event) => setEthAmount(event.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="info-block">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">You receive</span>
            <span className="info-value">{expectedCusdt} cUSDT</span>
          </div>
          <div className="info-item">
            <span className="info-label">Available Liquidity</span>
            <span className="info-value">{formatTokenBalance(liquidityData as bigint, TOKEN_DECIMALS)} cUSDT</span>
          </div>
        </div>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSwap}
          disabled={!contracts || !isConnected || isBusy}
        >
          {status === 'pending' ? 'Confirming...' : 'Swap Now'}
        </button>
      </div>

      {message && (
        <p className={status === 'error' ? 'error-text' : 'success-text'}>
          {message}
        </p>
      )}
      {!address && <p className="helper-text">Connect a wallet to preview live balances.</p>}
    </section>
  );
}
