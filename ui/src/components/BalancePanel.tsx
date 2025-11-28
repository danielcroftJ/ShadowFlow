import { useState } from 'react';
import type { JsonRpcSigner } from 'ethers';
import { useReadContract } from 'wagmi';
import type { Abi } from 'viem';

import type { ContractsConfig } from '../config/contracts';
import { TOKEN_DECIMALS, ZERO_ADDRESS } from '../config/contracts';
import { formatTokenBalance } from '../lib/format';

type Props = {
  address?: `0x${string}`;
  signerPromise?: Promise<JsonRpcSigner>;
  contracts?: ContractsConfig;
  instance: any;
  isZamaLoading: boolean;
};

export function BalancePanel({ address, signerPromise, contracts, instance, isZamaLoading }: Props) {
  const [clearBalance, setClearBalance] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const tokenAbi = (contracts?.cusdt.abi ?? ([] as Abi));
  const tokenAddress = contracts?.cusdt.address ?? ZERO_ADDRESS;

  const { data: encryptedBalance, refetch } = useReadContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(contracts && address),
    },
  });

  const hasBalance = Boolean(encryptedBalance && encryptedBalance !== '0x00');

  const handleDecrypt = async () => {
    if (!contracts || !address || !instance || !signerPromise || !encryptedBalance) {
      setError('Connect your wallet and ensure balances are available.');
      return;
    }

    setStatus('pending');
    setError(null);

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer unavailable. Reconnect your wallet.');
      }

      const signerAddress = await signer.getAddress();
      const keypair = instance.generateKeypair();
      const handlePairs = [{ handle: encryptedBalance as string, contractAddress: tokenAddress }];
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '1';
      const contractAddresses = [tokenAddress];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const response = await instance.userDecrypt(
        handlePairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        signerAddress,
        startTimestamp,
        durationDays,
      );

      const decryptedValue = response[encryptedBalance as string];
      if (decryptedValue === undefined) {
        throw new Error('No decrypted value returned.');
      }

      setClearBalance(formatTokenBalance(BigInt(decryptedValue), TOKEN_DECIMALS, 6));
      await refetch();
      setStatus('idle');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to decrypt right now.');
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="status-pill">Balance</p>
          <h2 className="card-title">cUSDT holdings</h2>
          <p className="card-description">Encrypted amounts remain private until you request a user decrypt.</p>
        </div>
      </div>

      <div>
        <p className="helper-text">Encrypted balance handle</p>
        <div className="info-block">
          <p className="info-value">{encryptedBalance ? (encryptedBalance as string) : '0x0'}</p>
        </div>
      </div>

      <div className="info-block">
        <div className="info-item">
          <span className="info-label">Last decrypted value</span>
          <span className="highlight-value">
            {clearBalance
              ? `${clearBalance} cUSDT`
              : `${formatTokenBalance(undefined, TOKEN_DECIMALS)} cUSDT`}
          </span>
        </div>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleDecrypt}
          disabled={!hasBalance || !instance || !signerPromise || status === 'pending' || isZamaLoading}
        >
          {status === 'pending' ? 'Decrypting...' : 'Decrypt balance'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setClearBalance(null)}
          disabled={!clearBalance}
        >
          Clear
        </button>
      </div>

      {isZamaLoading && <p className="helper-text">Loading encryption SDK...</p>}
      {error && <p className="error-text">{error}</p>}
      {!address && <p className="helper-text">Connect a wallet to view your encrypted balance.</p>}
    </section>
  );
}
