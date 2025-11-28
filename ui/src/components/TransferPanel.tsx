import { useState } from 'react';
import { Contract, type InterfaceAbi } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import type { Abi } from 'viem';

import type { ContractsConfig } from '../config/contracts';
import { TOKEN_DECIMALS, ZERO_ADDRESS } from '../config/contracts';
import { parseCusdt } from '../lib/format';

type Props = {
  address?: `0x${string}`;
  signerPromise?: Promise<JsonRpcSigner>;
  contracts?: ContractsConfig;
  instance: any;
  isZamaLoading: boolean;
};

export function TransferPanel({ address, signerPromise, contracts, instance, isZamaLoading }: Props) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const tokenAbi = (contracts?.cusdt.abi ?? ([] as Abi));
  const tokenInterfaceAbi = tokenAbi as InterfaceAbi;
  const tokenAddress = contracts?.cusdt.address ?? ZERO_ADDRESS;

  const handleTransfer = async () => {
    if (!contracts || !instance || !signerPromise || !address) {
      setMessage('Connect your wallet and wait for the encryption SDK to load.');
      return;
    }

    setStatus('pending');
    setMessage(null);

    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Wallet signer unavailable. Reconnect your wallet.');
      }

      const normalizedRecipient = recipient.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(normalizedRecipient)) {
        throw new Error('Enter a valid recipient address.');
      }

      const units = parseCusdt(amount, TOKEN_DECIMALS);
      if (units <= 0n) {
        throw new Error('Enter an amount greater than zero.');
      }

      const buffer = instance.createEncryptedInput(tokenAddress, address);
      buffer.add64(units);
      const encryptedAmount = await buffer.encrypt();

      const tokenContract = new Contract(tokenAddress, tokenInterfaceAbi, signer);
      const tx = await tokenContract['confidentialTransfer(address,bytes32,bytes)'](
        normalizedRecipient,
        encryptedAmount.handles[0],
        encryptedAmount.inputProof,
      );
      setStatus('confirming');
      await tx.wait();
      setStatus('success');
      setMessage('Transfer submitted. The recipient can decrypt once ACL permissions propagate.');
      setAmount('');
      setRecipient('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Transfer failed.');
    }
  };

  const isBusy = status === 'pending' || status === 'confirming';

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="status-pill">Transfer</p>
          <h2 className="card-title">Send cUSDT privately</h2>
          <p className="card-description">Encrypted values are produced client-side via the Zama relayer SDK.</p>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="recipient">Recipient address</label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          placeholder="0x..."
          onChange={(event) => setRecipient(event.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="cusdt-amount">Amount (cUSDT)</label>
        <input
          id="cusdt-amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          placeholder="0.00"
          onChange={(event) => setAmount(event.target.value)}
        />
      </div>

      <div className="info-block">
        <p className="helper-text">You will encrypt and sign the transfer locally before it reaches the smart contract.</p>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleTransfer}
          disabled={!instance || !signerPromise || !address || isBusy || isZamaLoading}
        >
          {isBusy ? 'Submitting…' : 'Send cUSDT'}
        </button>
      </div>

      {message && (
        <p className={status === 'error' ? 'error-text' : 'success-text'}>
          {message}
        </p>
      )}
      {!address && <p className="helper-text">Connect a wallet to initiate transfers.</p>}
    </section>
  );
}
