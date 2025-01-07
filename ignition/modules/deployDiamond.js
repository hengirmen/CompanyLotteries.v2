const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Manually calculates 4-byte function selectors from a contract's ABI.
 * We build a "functionSignature" string like "createLottery(uint256,uint256)"
 * and take the first 4 bytes of keccak256(UTF-8 of that signature).
 */
async function getFunctionSelectors(contractName) {
    const factory = await ethers.getContractFactory(contractName);
    const contractInterface = factory.interface;
  
    // console.log(`Inspecting contract interface for ${contractName}:`, contractInterface);
  
    const functionSelectors = [];
  
    for (const fragment of contractInterface.fragments) {
      if (fragment.type === "function") {
        const functionSignature = `${fragment.name}(${fragment.inputs.map((input) => input.type).join(",")})`;
        const selector = ethers.keccak256(ethers.toUtf8Bytes(functionSignature)).slice(0, 10);
        
        functionSelectors.push(selector);
        console.log(`Processing function: ${fragment.name} => Signature: ${functionSignature} => Selector: ${selector}`);
      }
    }
  
    if (functionSelectors.length === 0) {
      throw new Error(`No function selectors found in the ${contractName} contract.`);
    }
  
    console.log(`Function selectors for ${contractName}:`, functionSelectors);
    return functionSelectors;
  }

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const addresses = {};

  try {
    // Deploy DiamondProxy
    // console.log("Deploying DiamondProxy...");
    const DiamondProxy = await ethers.getContractFactory("DiamondProxy");
    const diamondProxy = await DiamondProxy.deploy();

    if (!diamondProxy || !diamondProxy.target) {
      throw new Error("DiamondProxy deployment failed.");
    }

    addresses.DiamondProxy = diamondProxy.target;
    console.log("DiamondProxy deployed at:", addresses.DiamondProxy);

    // Deploy facets
    // console.log("Deploying LotteryFacet...");
    const LotteryFacet = await ethers.getContractFactory("LotteryFacet");
    const lotteryFacet = await LotteryFacet.deploy();
    addresses.LotteryFacet = lotteryFacet.target;
    console.log("LotteryFacet deployed at:", addresses.LotteryFacet);

    // console.log("Deploying TicketFacet...");
    const TicketFacet = await ethers.getContractFactory("TicketFacet");
    const ticketFacet = await TicketFacet.deploy();
    addresses.TicketFacet = ticketFacet.target;
    console.log("TicketFacet deployed at:", addresses.TicketFacet);
    
    // console.log("Deploying AdminFacet...");
    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    const adminFacet = await AdminFacet.deploy();
    addresses.AdminFacet = adminFacet.target;
    console.log("AdminFacet deployed at:", addresses.AdminFacet);

    // Save addresses to a JSON file
    fs.writeFileSync("deployedAddresses.json", JSON.stringify(addresses, null, 2));
    console.log("Addresses saved to deployedAddresses.json");

    // Initialize Diamond Proxy with facets
    // NOTE: This will fail if DiamondProxy does not implement diamondCut. 
    // Currently, DiamondProxy's fallback reverts with "Fallback invoked".
    console.log("Initializing Diamond Proxy with facets...");
    const diamond = await ethers.getContractAt("DiamondProxy", addresses.DiamondProxy);

    const diamondCutTx = await diamond.diamondCut(
        [
          {
            facetAddress: addresses.LotteryFacet,
            functionSelectors: await getFunctionSelectors("LotteryFacet"),
            action: 0 // Add action parameter (0 = Add)
          },
          {
            facetAddress: addresses.TicketFacet,
            functionSelectors: await getFunctionSelectors("TicketFacet"),
            action: 0
          },
          {
            facetAddress: addresses.AdminFacet,
            functionSelectors: await getFunctionSelectors("AdminFacet"),
            action: 0
          }
        ],
        ethers.ZeroAddress,
        "0x"
      );
    await diamondCutTx.wait();

    console.log("Diamond Proxy successfully initialized with facets.");
  } catch (error) {
    console.error("Error during deployment:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unexpected error during script execution:", error);
    process.exit(1);
  });
