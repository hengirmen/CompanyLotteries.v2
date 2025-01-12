import { ethers } from 'ethers';
import LotteryFacet from '../../../artifacts/contracts/facets/LotteryFacet.sol/LotteryFacet.json';
import TicketFacet from '../../../artifacts/contracts/facets/TicketFacet.sol/TicketFacet.json';
import AdminFacet from '../../../artifacts/contracts/facets/AdminFacet.sol/AdminFacet.json';
import MockERC20 from '../../../artifacts/contracts/MockERC20.sol/MockERC20.json';
import DeployedAddress from '../../../deployedAddresses.json';

const fetchDiamondProxyAddress = () => {
    try {
        console.log("Using Diamond Proxy Address:", DeployedAddress.DiamondProxy); // Debug log
        return DeployedAddress.DiamondProxy;
    } catch (error) {
        console.error('Error accessing Diamond Proxy address:', error);
        throw error;
    }
};

const fetchMockERC20Address = () => {
    try {
        console.log("Using MockERC20 Address:", DeployedAddress.MockERC20); // Debug log
        return DeployedAddress.MockERC20;
    } catch (error) {
        console.error('Error accessing MockERC20 address:', error);
        throw error;
    }
};

export const getContract = (signer, contractName) => {  // Removed async since we don't need it
    let abi;
    switch (contractName) {
        case 'LotteryFacet':
            abi = LotteryFacet.abi;
            break;
        case 'TicketFacet':
            abi = TicketFacet.abi;
            break;
        case 'AdminFacet':
            abi = AdminFacet.abi;
            break;
        case 'MockERC20':
            abi = MockERC20.abi;
            break;
        default:
            throw new Error('Unknown contract name');
    }

    const address = contractName === 'MockERC20' ? fetchMockERC20Address() : fetchDiamondProxyAddress();
    return new ethers.Contract(address, abi, signer);
};

export const requestFaucetTokens = async (signer, amount) => {
    const contract = getContract(signer, 'MockERC20');
    const tx = await contract.faucet(amount);
    await tx.wait();
};

export const createLottery = async (
    signer,
    unixbeg,        // Start time (Unix timestamp)
    nooftickets,    // Total tickets
    noofwinners,    // Number of winners
    minpercentage,  // Minimum percentage of tickets sold
    ticketprice,    // Price per ticket
    htmlhash,       // HTML hash (metadata or identifier)
    url             // URL for additional metadata
) => {
    const contract = await getContract(signer, 'LotteryFacet');
    return await contract.createLottery(
        unixbeg,
        nooftickets,
        noofwinners,
        minpercentage,
        ticketprice,
        htmlhash,
        url
    );
};

export const setPaymentToken = async (signer, tokenAddress) => {
    const contract = await getContract(signer, 'AdminFacet');
    const tx = await contract.setPaymentToken(tokenAddress);
    return tx;
};

export const buyTicket = async (signer, lotteryId, quantity, hashRndNumber, overrides = {}) => {
    try {
        const contract = getContract(signer, 'TicketFacet');
        
        console.log("Buying ticket with params:", {
            lotteryId,
            quantity,
            hashRndNumber,
            overrides
        });

        const tx = await contract.buyTicketTx(
            lotteryId,
            quantity,
            hashRndNumber,
            overrides
        );

        return tx;
    } catch (error) {
        console.error('Error in buyTicket:', error);
        throw error;
    }
};

const IERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)"
];

export const approvePaymentToken = async (signer, tokenAddress, spender, amount) => {
    try {
        if (!tokenAddress || !spender) {
            throw new Error("Invalid token or spender address");
        }

        console.log("Approving token:", {
            tokenAddress,
            spender,
            amount: amount.toString()
        });

        const contract = new ethers.Contract(tokenAddress, IERC20_ABI, signer);
        const address = await signer.getAddress();
        const currentAllowance = await contract.allowance(address, spender);
        
        console.log("Current allowance:", currentAllowance.toString());

        if (currentAllowance < amount) {
            const tx = await contract.approve(spender, ethers.MaxUint256);
            await tx.wait();
            console.log("Token approval successful");
        } else {
            console.log("Sufficient allowance already granted");
        }
    } catch (error) {
        console.error("Token approval failed:", error);
        throw error;
    }
};

export const getLotteryInfo = async (signer, lotteryId) => {
    const contract = await getContract(signer, 'LotteryFacet');
    return await contract.getLotteryInfo(lotteryId);
};

export const getCurrentLotteryId = async (signer) => {
    const contract = await getContract(signer, 'LotteryFacet');
    return await contract.getCurrentLotteryId();
};