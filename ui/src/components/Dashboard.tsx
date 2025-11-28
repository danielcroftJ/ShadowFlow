import { useAccount } from 'wagmi';

import { getContracts } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/Dashboard.css';
import { BalancePanel } from './BalancePanel';
import { Header } from './Header';
import { SwapPanel } from './SwapPanel';
import { TransferPanel } from './TransferPanel';

export function Dashboard() {
  const { address, chainId, isConnected } = useAccount();
  const signer = useEthersSigner({ chainId });
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();
  const contracts = getContracts(chainId);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-content">
        {!contracts && (
          <div className="notification info">
            Connect your wallet to the Sepolia network to access the confidential swap tools.
          </div>
        )}
        <div className="module-grid">
          <SwapPanel
            address={address}
            isConnected={isConnected}
            signerPromise={signer}
            contracts={contracts}
          />
          <BalancePanel
            address={address}
            signerPromise={signer}
            contracts={contracts}
            instance={instance}
            isZamaLoading={isZamaLoading}
          />
          <TransferPanel
            address={address}
            signerPromise={signer}
            contracts={contracts}
            instance={instance}
            isZamaLoading={isZamaLoading}
          />
        </div>
        {zamaError && <div className="notification error">{zamaError}</div>}
      </main>
    </div>
  );
}
