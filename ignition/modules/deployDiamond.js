const { ethers } = require("hardhat");
const fs = require("fs");

// Utility to calculate function selectors
async function getFunctionSelectors(contractName) {
    const factory = await ethers.getContractFactory(contractName);
    const contractInterface = factory.interface;

    const functionSelectors = [];

    for (const fragment of contractInterface.fragments) {
        if (fragment.type === "function") {
            const functionSignature = `${fragment.name}(${fragment.inputs.map((input) => input.type).join(",")})`;
            const selector = ethers.keccak256(ethers.toUtf8Bytes(functionSignature)).slice(0, 10);
            functionSelectors.push(selector);
            console.log(`Processing function: ${fragment.name} => Signature: ${functionSignature} => Selector: ${selector}`); // Log for each function
        }
    }

    if (functionSelectors.length === 0) {
        throw new Error(`No function selectors found in the ${contractName} contract.`);
    }

    return functionSelectors;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const addresses = {};

    try {
        // Deploy DiamondProxy
        const DiamondProxy = await ethers.getContractFactory("DiamondProxy");
        const diamondProxy = await DiamondProxy.deploy();
        await diamondProxy.waitForDeployment();
        addresses.DiamondProxy = await diamondProxy.getAddress();
        console.log("DiamondProxy deployed at:", addresses.DiamondProxy);

        // Deploy facets
        const facets = ["LotteryFacet", "TicketFacet", "AdminFacet"];
        for (const facetName of facets) {
            const Facet = await ethers.getContractFactory(facetName);
            const facet = await Facet.deploy();
            await facet.waitForDeployment();
            addresses[facetName] = await facet.getAddress();
            console.log(`${facetName} deployed at:`, addresses[facetName]);

            // Log function selectors
            const selectors = await getFunctionSelectors(facetName);
        }

        // Deploy MockERC20
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockERC20 = await MockERC20.deploy("Mock Token", "MCK", ethers.parseEther("1000000"));
        await mockERC20.waitForDeployment();
        addresses.MockERC20 = await mockERC20.getAddress();
        console.log("MockERC20 deployed at:", addresses.MockERC20);

        // Save addresses to a JSON file
        console.log("Saving deployed addresses to deployedAddresses.json...");
        fs.writeFileSync("deployedAddresses.json", JSON.stringify(addresses, null, 2));
        console.log("Addresses saved to deployedAddresses.json");

        // Initialize Diamond Proxy with facets
        console.log("Initializing Diamond Proxy with facets...");
        const diamond = await ethers.getContractAt("DiamondProxy", addresses.DiamondProxy);

        // Resolve all selectors for facets
        const facetsWithSelectors = [];
        for (const facetName of facets) {
            const selectors = await getFunctionSelectors(facetName);
            facetsWithSelectors.push({
                facetAddress: addresses[facetName],
                functionSelectors: selectors,
                action: 0, // 0 = Add
            });
        }

        console.log("Executing diamondCut...");
        const diamondCutTx = await diamond.diamondCut(facetsWithSelectors, ethers.ZeroAddress, "0x");
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