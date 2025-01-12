# CompanyLotteries.v2

## **Before you start**
Make sure to add OP Sepolia Testnet on your MetaMask wallet: https://www.alchemy.com/overviews/how-to-add-sepolia-to-metamask

OP Sepolia Faucet: https://console.optimism.io/faucet


### **1. Deploy the Contracts**
In the main directory, run the following command to deploy the Diamond Proxy and its facets:

```bash
npx hardhat run ignition/modules/deployDiamond.js --network op_sepolia
```
In the terminal, you can find the Diamond Proxy address, Facet addresses, function selector mappings, and MockERC20 address. 

### **2. Run the Frontend**
In the frontend directory, run the following commands:
```bash
npm install vite --save-dev
npm run dev
```

The interface starts running on the localhost specified in the terminal.

### **Misc**
HTML Hash generator: generateHash.js
