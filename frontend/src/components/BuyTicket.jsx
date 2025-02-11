import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { buyTicket, getContract, approvePaymentToken } from '../services/contractService';

const BuyTicket = ({ signer, lotteryId, ticketPrice, tokenSymbol }) => {
    const [quantity, setQuantity] = useState(1);
    const [randomNumber, setRandomNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleBuyTickets = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
    
        try {
            if (!randomNumber) {
                throw new Error("Please enter a random number (numeric).");
            }
            
            if (quantity < 1 || quantity > 30) {
                throw new Error("Quantity must be between 1 and 30");
            }

            // 1) Convert user input to BigInt to match 'uint256' in the contract
            let randomNumBig;
            try {
                randomNumBig = BigInt(randomNumber);
            } catch (err) {
                throw new Error("Random number must be numeric, e.g. 12345");
            }

            // 2) Hash the numeric random with keccak256(abi.encodePacked(uint256))
            //    so it matches the contract’s reveal logic
            const packedData = ethers.solidityPacked(["uint256"], [randomNumBig]);
            const hashRndNumber = ethers.keccak256(packedData);

            // 3) Calculate total ticket cost
            const priceInWei = ethers.parseEther(ticketPrice.toString());
            const totalCost = priceInWei * BigInt(quantity);

            // 4) Get contract references
            const lotteryContract = getContract(signer, 'LotteryFacet');
            const ticketContract = getContract(signer, 'TicketFacet');
            const paymentToken = await lotteryContract.getPaymentToken(lotteryId);

            if (!paymentToken || paymentToken === ethers.ZeroAddress) {
                throw new Error("Invalid payment token address");
            }

            // 5) Approve token spend
            await approvePaymentToken(signer, paymentToken, ticketContract.target, totalCost);

            // 6) Estimate gas
            const gasEstimate = await ticketContract.buyTicketTx.estimateGas(
                lotteryId,
                quantity,
                hashRndNumber,
                { value: paymentToken === ethers.ZeroAddress ? totalCost : 0 }
            );
            const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);

            console.log("Transaction parameters:", {
                lotteryId,
                quantity,
                hashRndNumber,
                totalCost: totalCost.toString(),
                gasLimit,
                paymentToken
            });

            // 7) Send transaction
            const tx = await buyTicket(
                signer,
                lotteryId,
                quantity,
                hashRndNumber,
                { gasLimit }
            );

            // 8) Wait for confirmation with user feedback
            await toast.promise(
                tx.wait(),
                {
                    pending: 'Buying tickets...',
                    success: `Successfully purchased ${quantity} ticket(s)!`,
                    error: {
                        render({ data }) {
                            console.error("Transaction error:", data);
                            return 'Failed to buy tickets. Check balance or try again.';
                        }
                    }
                }
            );
    
            // Reset form
            setQuantity(1);
            setRandomNumber('');
        } catch (error) {
            console.error("Buy ticket error:", error);
            let errorMessage = "Failed to buy tickets";
            
            if (error.message.includes("insufficient funds")) {
                errorMessage = "Insufficient funds for transaction";
            } else if (error.message.includes("Purchase phase has ended")) {
                errorMessage = "Purchase phase has ended for this lottery";
            } else if (error.message.includes("Not enough tickets remaining")) {
                errorMessage = "Not enough tickets remaining in this lottery";
            }
            
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="buy-ticket bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-4">Buy Tickets for Lottery #{lotteryId}</h3>
            <form onSubmit={handleBuyTickets} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        Quantity (1-30):
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="30"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        disabled={isProcessing}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">
                        Random Number (numeric only!):
                    </label>
                    <input
                        type="text"
                        value={randomNumber}
                        onChange={(e) => setRandomNumber(e.target.value)}
                        placeholder="E.g. 12345"
                        className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        disabled={isProcessing}
                    />
                </div>
                <div>
                    <p className="text-sm text-gray-400 mb-2">
                        Total Cost: {(Number(ticketPrice) * quantity).toFixed(6)} {tokenSymbol}
                    </p>
                    <button
                        type="submit"
                        className={`w-full rounded-md px-4 py-2 text-white
                            ${isProcessing
                                ? 'bg-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Processing...' : 'Buy Tickets'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BuyTicket;
