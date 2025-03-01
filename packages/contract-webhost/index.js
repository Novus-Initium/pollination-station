const express = require("express");
const path = require("path");
const ethers = require("ethers");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Set up Ethereum provider and contract
const setupEthereumWatcher = async () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL
    );
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contractABI =
      require("../hardhat/artifacts/contracts/YourContract.sol/YourContract.json").abi;
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    console.log("Ethereum contract watcher set up successfully");

    // Listen for DAOCreated events
    contract.on(
      "DAOCreated",
      async (daoAddress, title, description, socials, event) => {
        console.log("DAOCreated Event detected");

        try {
          const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/dao-manager`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "create",
                data: {
                  name: title,
                  description: description,
                  public_address: daoAddress,
                },
              }),
            }
          );
          console.log(response)
          if (!response.ok) throw new Error("Failed to create DAO");
          const data = await response.json();
          console.log("DAO created successfully:", data);
        } catch (error) {
          console.error("Error creating DAO:", error);
        }
      }
    );

    // Listen for NeedCreated events
    contract.on(
      "NeedCreated",
      async (needId, daoAddress, description, event) => {
        console.log("NeedCreated Event detected");

        const needIdAsNumber = needId.toNumber();

        console.log(daoAddress);
        console.log(needIdAsNumber);

        try {
          // First get the DAO to get its ID
          const DAO_object = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/dao-manager`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "get",
                publicAddress: daoAddress,
                data: {},
              }),
            }
          );

          if (!DAO_object.ok) throw new Error("Failed to fetch DAO");
          const daoData = await DAO_object.json();

          // Create the need
          const response = await fetch(
            `${process.env.SUPABASE_URL}/functions/v1/need-manager`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "create",
                data: {
                  dao_id: daoData.data.id,
                  contract_need_id: needIdAsNumber,
                  description: description,
                },
              }),
            }
          );

          if (!response.ok) throw new Error("Failed to create Need");
          const data = await response.json();
          console.log("Need created successfully:", data);
        } catch (error) {
          console.error("Error creating Need:", error);
        }
      }
    );

    // Listen for PollinCreated events
    //     contract.on('PollinCreated', async (
    //       pollinId,
    //       daoWithNeed,
    //       daoWithOffering,
    //       needId,
    //       descriptionOfRelationship,
    //       confidence,
    //       event
    //     ) => {
    //       console.log('PollinCreated Event detected');

    //       try {
    //         // Create pollen match using pollen-query endpoint
    //         const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/pollen-query`, {
    //           method: 'POST',
    //           headers: {
    //             'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    //             'Content-Type': 'application/json'
    //           },
    //           body: JSON.stringify({
    //             need_id: needId.toString(),
    //             requesting_dao_address: daoWithNeed,
    //             fulfilling_dao_address: daoWithOffering,
    //             description: descriptionOfRelationship,
    //             confidence_score: parseFloat(confidence) / 100
    //           })
    //         });

    //         if (!response.ok) throw new Error('Failed to create Pollen match');
    //         const data = await response.json();
    //         console.log('Pollen match created successfully:', data);
    //       } catch (error) {
    //         console.error('Error creating Pollen match:', error);
    //       }
    //     });
  } catch (error) {
    console.error("Error setting up Ethereum watcher:", error);
  }
};

// Start the server with graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  setupEthereumWatcher();
});

// Graceful shutdown handler
const shutdown = () => {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
