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
    // Connect to Ethereum network (replace with your provider URL)
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    
    // Contract details
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI = require('./contractABI.json');
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    console.log('Ethereum contract watcher set up successfully');
    
    // Listen for events (replace 'YourEventName' with the actual event name from your contract)
    contract.on('YourEventName', (...args) => {
      // The last argument is the event object
      const event = args[args.length - 1];
      const eventData = args.slice(0, -1);
      
      console.log('Event detected!');
      console.log('Transaction Hash:', event.transactionHash);
      console.log('Block Number:', event.blockNumber);
      console.log('Event Data:', eventData);
      
      // Add your custom logic here to handle the event
    });
    
    // You can listen to multiple events if needed
    // contract.on('AnotherEvent', (...args) => { ... });
    
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
