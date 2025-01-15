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

export const getContract = (signer, contractName) => {
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
};

export const getTicketOwner = async (ticketContract, lotteryId, ticketNo) => {
    try {
        const owner = await ticketContract.isTicketOwner(lotteryId, ticketNo);
        return owner;
    } catch (error) {
        console.warn(`Error getting owner for ticket ${ticketNo}:`, error);
        return null;
    }
};

export const getUserTickets = async (signer, lotteryId, isAdmin) => {
    try {
        const lotteryContract = getContract(signer, 'LotteryFacet');
        const ticketContract = getContract(signer, 'TicketFacet');
        const address = await signer.getAddress();

        const numTxs = await lotteryContract.getNumPurchaseTxs(lotteryId);
        const tickets = [];

        for (let i = 1; i <= Number(numTxs); i++) {
            try {
                const tx = await lotteryContract.getIthPurchasedTicket(i, lotteryId);
                const startNumber = Number(tx[0]);
                const quantity = Number(tx[1]);

                for (let j = 0; j < quantity; j++) {
                    const ticketNumber = startNumber + j;
                    try {
                        const isOwner = await ticketContract.isTicketOwner(
                            lotteryId,
                            ticketNumber,
                            address
                        );

                        // Check if ticket is a winner
                        let isWinner = false;
                        try {
                            isWinner = await ticketContract.checkIfMyTicketWon(
                                lotteryId,
                                ticketNumber
                            );
                        } catch (error) {
                            console.warn(`Error checking winner status for ticket ${ticketNumber}:`, error);
                        }

                        const canView = isOwner || isAdmin;

                        if (canView) {
                            // Get actual owner address
                            const ownerAddress = await ticketContract.getTicketOwner(
                                lotteryId,
                                ticketNumber
                            );

                            tickets.push({
                                ticketNumber,
                                owner: ownerAddress,
                                isOwner,
                                canView,
                                isWinner
                            });
                        }
                    } catch (error) {
                        console.warn(`Error checking ticket ${ticketNumber}:`, error);
                    }
                }
            } catch (error) {
                console.warn(`Error processing transaction ${i}:`, error);
            }
        }

        return tickets;
    } catch (error) {
        console.error('Error in getUserTickets:', error);
        throw error;
    }
};

export const revealTicket = async (signer, lotteryId, startNumber, quantity, randomNumber) => {
    try {
        const ticketContract = getContract(signer, 'TicketFacet');
        const tx = await ticketContract.revealRndNumberTx(
            lotteryId,
            startNumber,
            quantity,
            randomNumber
        );
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error revealing ticket:', error);
        throw error;
    }
};

export const withdrawTicketProceeds = async (signer, lotteryId) => {
    try {
        const contract = getContract(signer, 'AdminFacet');
        const tx = await contract.withdrawTicketProceeds(lotteryId);
        await tx.wait();
        return true;
    } catch (error) {
        console.error('Error withdrawing proceeds:', error);
        throw error;
    }
};

export const getRevealPhaseEndTime = async (signer, lotteryId) => {
    try {
        const lotteryContract = getContract(signer, 'LotteryFacet');
        const revealPhaseEndTime = await lotteryContract.getRevealPhaseEndTime(lotteryId);
        return revealPhaseEndTime;
    } catch (error) {
        console.error('Error fetching reveal phase end time:', error);
        throw error;
    }
};

export const getLotteryPhaseTimes = async (signer, lotteryId) => {
    try {
        const lotteryContract = getContract(signer, 'LotteryFacet');
        const phaseTimes = await lotteryContract.getLotteryPhaseTimes(lotteryId);
        return {
            startTime: Number(phaseTimes[0]),
            purchaseEndTime: Number(phaseTimes[1]),
            revealEndTime: Number(phaseTimes[2])
        };
    } catch (error) {
        console.error('Error fetching lottery phase times:', error);
        throw error;
    }
};