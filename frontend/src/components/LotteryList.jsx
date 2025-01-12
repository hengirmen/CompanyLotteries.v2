import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../services/contractService';
import BuyTicket from './BuyTicket';

const LotteryList = ({ signer }) => {
    const [ongoingLotteries, setOngoingLotteries] = useState([]);
    const [finishedLotteries, setFinishedLotteries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedLotteryId, setExpandedLotteryId] = useState(null);

    const fetchLotteries = async () => {
        if (!signer) {
            console.log("No signer available");
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const contract = getContract(signer, 'LotteryFacet');
            const currentId = await contract.getCurrentLotteryNo();
            
            const ongoing = [];
            const finished = [];

            if (currentId && Number(currentId) > 0) {
                for (let i = 1; i <= Number(currentId); i++) {
                    try {
                        const rawInfo = await contract.getLotteryInfo(i);
                        const numSold = await contract.getLotterySales(i);
                        const paymentToken = await contract.getPaymentToken(i);
                        
                        let tokenSymbol = 'ETH';
                        if (paymentToken !== ethers.AddressZero) {
                            const tokenContract = getContract(signer, 'MockERC20');
                            tokenSymbol = await tokenContract.symbol();
                        }

                        const info = {
                            id: i,
                            endTime: Number(rawInfo[0]),
                            noOfTickets: Number(rawInfo[1]),
                            numWinners: Number(rawInfo[2]),
                            minPercentage: Number(rawInfo[3]),
                            ticketPrice: rawInfo[4], // Keep as BigNumber for BuyTicket
                            formattedPrice: ethers.formatEther(rawInfo[4]), // Formatted for display
                            ticketsSold: Number(numSold),
                            paymentToken,
                            tokenSymbol
                        };
                        
                        const now = Math.floor(Date.now() / 1000);
                        if (info.endTime > now) {
                            ongoing.push(info);
                        } else {
                            finished.push(info);
                        }
                    } catch (error) {
                        if (error.message.includes("Lottery does not exist")) {
                            continue;
                        }
                        throw error;
                    }
                }
            }
            
            setOngoingLotteries(ongoing);
            setFinishedLotteries(finished);
        } catch (error) {
            console.error('Error in fetchLotteries:', error);
            setError(`Failed to fetch lottery information: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLotteries();
    }, [signer]);

    const handleReset = () => {
        setOngoingLotteries([]);
        setFinishedLotteries([]);
        fetchLotteries();
    };

    const toggleLotteryExpansion = (lotteryId) => {
        setExpandedLotteryId(expandedLotteryId === lotteryId ? null : lotteryId);
    };

    return (
        <div className="space-y-8">
            <button
                onClick={handleReset}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                disabled={loading}
            >
                {loading ? 'Refreshing...' : 'Refresh Lottery List'}
            </button>

            {error && (
                <div className="bg-red-500 text-white p-4 rounded">
                    {error}
                </div>
            )}

            {loading && (
                <div className="text-gray-400">Loading lotteries...</div>
            )}

            {/* Ongoing Lotteries */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Ongoing Lotteries</h2>
                {ongoingLotteries.length > 0 ? (
                    ongoingLotteries.map((lottery) => (
                        <div key={lottery.id} className="bg-gray-700 p-4 rounded shadow mb-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold">Lottery #{lottery.id}</h3>
                                <button
                                    onClick={() => toggleLotteryExpansion(lottery.id)}
                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                                >
                                    {expandedLotteryId === lottery.id ? 'Hide Details' : 'Show Details'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <p>End Time: {new Date(lottery.endTime * 1000).toLocaleString()}</p>
                                <p>Total Tickets: {lottery.noOfTickets}</p>
                                <p>Ticket Price: {lottery.formattedPrice} {lottery.tokenSymbol}</p>
                                <p>Tickets Sold: {lottery.ticketsSold}</p>
                                <p>Number of Winners: {lottery.numWinners}</p>
                                <p>Minimum Percentage: {lottery.minPercentage}%</p>
                            </div>
                            
                            {/* Buy Ticket Section */}
                            {expandedLotteryId === lottery.id && (
                                <div className="mt-4 pt-4 border-t border-gray-600">
                                    <BuyTicket 
                                        lotteryId={lottery.id} 
                                        signer={signer} 
                                        ticketPrice={lottery.formattedPrice}
                                        tokenSymbol={lottery.tokenSymbol}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">No ongoing lotteries found.</p>
                )}
            </div>

            {/* Finished Lotteries */}
            <div>
                <h2 className="text-2xl font-bold mb-4">Finished Lotteries</h2>
                {finishedLotteries.length > 0 ? (
                    finishedLotteries.map((lottery) => (
                        <div key={lottery.id} className="bg-gray-700 p-4 rounded shadow mb-4">
                            <h3 className="text-lg font-bold mb-2">Lottery #{lottery.id}</h3>
                            <div className="space-y-2">
                                <p>End Time: {new Date(lottery.endTime * 1000).toLocaleString()}</p>
                                <p>Total Tickets: {lottery.noOfTickets}</p>
                                <p>Tickets Sold: {lottery.ticketsSold}</p>
                                <p>Number of Winners: {lottery.numWinners}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">No finished lotteries found.</p>
                )}
            </div>
        </div>
    );
};

export default LotteryList;