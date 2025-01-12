const { ethers } = require("ethers");

// Function to compute the hash
const computeHash = (metadata) => {
    try {
        const hash = ethers.solidityPackedKeccak256(['string'], [metadata]);
        console.log(`Metadata: ${metadata}`);
        console.log(`Computed Hash: ${hash}`);
        return hash;
    } catch (error) {
        console.error("Error computing hash:", error);
    }
};

// Example metadata
const metadata = "Lottery4"; // Replace this with your metadata string

// Compute the hash
computeHash(metadata);
