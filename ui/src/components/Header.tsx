import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div>
          <p className="header-eyebrow">ShadowFlow</p>
          <h1 className="header-title">Confidential Swap Desk</h1>
          <p className="header-subtitle">Swap ETH to cUSDT, decrypt balances, and transfer privately on Sepolia.</p>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
