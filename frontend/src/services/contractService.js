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
    const contract = getContract(signer, 'LotteryFacet');
    return contract.createLottery(
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
    const contract = getContract(signer, 'AdminFacet');
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
    const contract = getContract(signer, 'LotteryFacet');
    return contract.getLotteryInfo(lotteryId);
};

export const getCurrentLotteryNo = async (signer) => {
    const contract = getContract(signer, 'LotteryFacet');
    return contract.getCurrentLotteryNo();
};

export const getNumPurchaseTxs = async (signer, lotteryId) => {
    const contract = getContract(signer, 'LotteryFacet');
    return contract.getNumPurchaseTxs(lotteryId);
};

export const getIthPurchasedTicket = async (signer, lotteryId, index) => {
    const contract = getContract(signer, 'LotteryFacet');
    return contract.getIthPurchasedTicket(index, lotteryId); 
    // <== IMPORTANT: arguments must match the contract’s order
};

export const getUserTickets = async (signer, lotteryId) => {
    try {
        const lotteryContract = getContract(signer, 'LotteryFacet');
        const ticketContract = getContract(signer, 'TicketFacet');
        const address = await signer.getAddress();
        
        // Get lottery info to check if finished
        const rawInfo = await lotteryContract.getLotteryInfo(lotteryId);
        const now = Math.floor(Date.now() / 1000);
        const isFinished = now > Number(rawInfo[0]);
        
        // Get number of transactions
        const numTxs = await lotteryContract.getNumPurchaseTxs(lotteryId);
        console.log(`Processing lottery ${lotteryId}, transactions: ${numTxs}`);
        
        const tickets = [];
        for (let i = 1; i <= Number(numTxs); i++) {
            try {
                const tx = await lotteryContract.getIthPurchasedTicket(i, lotteryId);
                const startNumber = Number(tx[0]);
                const quantity = Number(tx[1]);
                
                let isWinner = false;
                let revealed = false;
                
                if (isFinished) {
                    try {
                        // For finished lotteries, check if ticket won
                        isWinner = await ticketContract.checkIfMyTicketWon(lotteryId, startNumber);
                        // If we can check winner status, ticket must be revealed
                        revealed = true;
                    } catch (error) {
                        if (error.message.includes("Reveal phase has not ended")) {
                            revealed = false;
                        } else {
                            console.log(`Winner check failed for ticket ${startNumber}: ${error.message}`);
                        }
                    }
                }

                // Add ticket to list
                tickets.push({
                    startNumber,
                    quantity,
                    revealed,
                    isWinner,
                    isFinished
                });
                
                console.log(`Found ticket: Lottery ${lotteryId}, Start ${startNumber}, Quantity ${quantity}, Revealed: ${revealed}, Winner: ${isWinner}`);
            } catch (error) {
                console.warn(`Error processing transaction ${i}:`, error);
                continue;
            }
        }
        
        console.log(`Found ${tickets.length} tickets for lottery ${lotteryId}`);
        return tickets;
    } catch (error) {
        console.error('Error in getUserTickets:', error);
        throw error;
    }
};