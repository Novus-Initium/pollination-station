const express = require('express');
const path = require('path');
const ethers = require('ethers');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set up Ethereum provider and contract
const setupEthereumWatcher = async () => {
  try {
    // Connect to Ethereum network
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    
    // Contract details
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI = require('../hardhat/artifacts/contracts/YourContract.sol/YourContract.json').abi;
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log('Ethereum contract watcher set up successfully');
    
    // Listen for DAOCreated events
    contract.on('DAOCreated', (daoAddress, title, event) => {
      console.log('DAOCreated Event:');
      console.log('- DAO Address:', daoAddress);
      console.log('- Title:', title);
      console.log('- TX Hash:', event.transactionHash);
      console.log('- Block Number:', event.blockNumber);
    });
    
    // Listen for NeedCreated events
    contract.on('NeedCreated', (needId, dao, description, event) => {
      console.log('NeedCreated Event:');
      console.log('- Need ID:', needId.toString());
      console.log('- DAO Address:', dao);
      console.log('- Description:', description);
      console.log('- TX Hash:', event.transactionHash);
      console.log('- Block Number:', event.blockNumber);
    });
    
    // Listen for PollinCreated events
    contract.on('PollinCreated', (
      pollinId,
      daoWithNeed,
      daoWithOffering,
      needId,
      descriptionOfRelationship,
      confidence,
      event
    ) => {
      console.log('PollinCreated Event:');
      console.log('- Pollin ID:', pollinId.toString());
      console.log('- DAO with Need:', daoWithNeed);
      console.log('- DAO with Offering:', daoWithOffering);
      console.log('- Need ID:', needId.toString());
      console.log('- Description:', descriptionOfRelationship);
      console.log('- Confidence:', confidence.toString());
      console.log('- TX Hash:', event.transactionHash);
      console.log('- Block Number:', event.blockNumber);
    });
    
  } catch (error) {
    console.error('Error setting up Ethereum watcher:', error);
  }
};

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Set up the Ethereum event watcher
  setupEthereumWatcher();
});