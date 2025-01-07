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
          url: "https://optimism-sepolia.infura.io/v3/34251487055b4fe2b46ea91f07523741",
          accounts: ["0543335677a457962918d1923288da370607a557824f1336e5967e8e8d12624a"]
      }
  }
};

// module.exports = {
//   solidity: "0.8.27",
//   networks: {
//     localhost: {
//       url: "http://127.0.0.1:8545",
//     },
//   },
// };
