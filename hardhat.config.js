require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  paths: {
    sources: "./contracts", // Active contracts directory
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
      op_sepolia: {
          url: "", // Your Optimism Infura URL
          accounts: [""] // Your Metamask account's private key
      }
  }
};
