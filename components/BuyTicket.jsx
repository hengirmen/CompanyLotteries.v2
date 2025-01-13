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
                throw new Error("Please enter a random number");
            }
            
            if (quantity < 1 || quantity > 30) {
                throw new Error("Quantity must be between 1 and 30");
            }

            const hashRndNumber = ethers.keccak256(ethers.toUtf8Bytes(randomNumber));
            const priceInWei = ethers.parseEther(ticketPrice.toString());
            const totalCost = priceInWei * BigInt(quantity);

            const lotteryContract = await getContract(signer, 'LotteryFacet');
            const paymentToken = await lotteryContract.getPaymentToken(lotteryId);

            if (paymentToken === ethers.AddressZero) {
                throw new Error("Invalid payment token address");
            }

            const lotteryContractAddress = await lotteryContract.getAddress();
            if (!lotteryContractAddress) {
                throw new Error("Invalid lottery contract address");
            }

            let overrides = {
                gasLimit: 500000
            };

            if (paymentToken === ethers.AddressZero) {
                console.log("Using ETH as payment token");
                overrides.value = totalCost;
            } else {
                console.log("Using ERC20 token as payment token");
                console.log("Payment Token Address:", paymentToken);
                console.log("Lottery Contract Address:", lotteryContractAddress);
                await approvePaymentToken(signer, paymentToken, lotteryContractAddress, totalCost);
            }

            console.log("Buying tickets with:", {
                lotteryId,
                quantity,
                hashRndNumber,
                totalCost: totalCost.toString(),
                paymentToken,
                overrides
            });

            const tx = await buyTicket(signer, lotteryId, quantity, hashRndNumber, overrides);
            console.log("Transaction sent:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Transaction receipt:", receipt);

            if (receipt.status === 0) {
                throw new Error("Transaction failed - Lottery may be closed or invalid");
            }

            toast.success(`Successfully purchased ${quantity} ticket(s)!`);
            setQuantity(1);
            setRandomNumber('');
        } catch (error) {
            console.error("Buy ticket error:", error);
            let errorMessage = "Failed to buy tickets";
            
            if (error.message.includes("Purchase phase has ended")) {
                errorMessage = "Purchase phase has ended for this lottery";
            } else if (error.message.includes("Not enough tickets remaining")) {
                errorMessage = "Not enough tickets remaining in this lottery";
            } else if (error.message.includes("Invalid token or spender address")) {
                errorMessage = "Invalid token or spender address";
            }
            
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="buy-ticket bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-4">Buy Tickets for Lottery #{lotteryId}</h3>
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
                        Random Number (will be used for ticket generation):
                    </label>
                    <input
                        type="text"
                        value={randomNumber}
                        onChange={(e) => setRandomNumber(e.target.value)}
                        placeholder="Enter any random string"
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
                                : 'bg-blue-600 hover:bg-blue-700'}`}
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