import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getContract, getLotteryPhaseTimes, getUserTickets } from '../services/contractService';
import BuyTicket from './BuyTicket';
import MyTickets from './MyTickets';
import { toast } from 'react-toastify';


const LotteryList = ({ signer, address, isAdmin }) => {
    const [ongoingLotteries, setOngoingLotteries] = useState([]);
    const [finishedLotteries, setFinishedLotteries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedLotteryId, setExpandedLotteryId] = useState(null);
    const [expandedTicketsSection, setExpandedTicketsSection] = useState(false);


    const getTicketsForLottery = async (lotteryId) => {
        try {
            const lotteryContract = getContract(signer, 'LotteryFacet');
            const ticketContract = getContract(signer, 'TicketFacet');
            const numTxs = await lotteryContract.getNumPurchaseTxs(lotteryId);
            const tickets = [];
    
            for (let i = 1; i <= Number(numTxs); i++) {
                try {
                    const tx = await lotteryContract.getIthPurchasedTicket(i, lotteryId);
                    const startNumber = Number(tx[0]);
                    const quantity = Number(tx[1]);
                    
                    const isOwner = await ticketContract.isTicketOwner(
                        lotteryId,
                        startNumber,
                        address
                    );
    
                    if (isOwner) {
                        tickets.push({
                            startNumber,
                            quantity,
                            buyerAddress: address
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing ticket ${i}:`, error);
                }
            }
            return tickets;
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return [];
        }
    };

    const fetchLotteries = async () => {
        if (!signer) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const lotteryContract = getContract(signer, 'LotteryFacet');
            const currentId = await lotteryContract.getCurrentLotteryNo();
            
            const ongoing = [];
            const finished = [];
    
            const now = Math.floor(Date.now() / 1000);
    
            for (let i = 1; i <= Number(currentId); i++) {
                try {
                    const rawInfo = await lotteryContract.getLotteryInfo(i);
                    const numSold = await lotteryContract.getLotterySales(i);
                    const paymentToken = await lotteryContract.getPaymentToken(i);
                    
                    const minTicketsRequired = (Number(rawInfo[1]) * Number(rawInfo[3])) / 100;
                    const hasMetMinimumSales = Number(numSold) >= minTicketsRequired;
                    
                    const phaseTimes = await lotteryContract.getLotteryPhaseTimes(i);
                    const startTime = Number(phaseTimes[0]);     // Current time
                    const purchaseEndTime = Number(phaseTimes[1]); // Purchase phase end
                    const revealEndTime = Number(phaseTimes[2]);   // Reveal phase end
                              
                    
                    const urlInfo = await lotteryContract.getLotteryURL(i);
                    const { htmlhash, url } = urlInfo;
                    
                    const info = {
                        id: i,
                        startTime,
                        purchaseEndTime,
                        revealEndTime,
                        noOfTickets: Number(rawInfo[1]),
                        numWinners: Number(rawInfo[2]),
                        minPercentage: Number(rawInfo[3]),
                        ticketPrice: rawInfo[4],
                        formattedPrice: ethers.formatEther(rawInfo[4]),
                        ticketsSold: Number(numSold),
                        paymentToken,
                        hasMetMinimumSales,
                        requiresRefund: !hasMetMinimumSales && now > revealEndTime,
                        isFinalized: false,
                        phase: 'Purchase',
                        tickets: await getTicketsForLottery(i),
                        htmlHash: htmlhash,
                        url: url
                    };
    
                    if (now < purchaseEndTime) {
                        info.phase = 'Purchase';
                    } else if (now < revealEndTime) {
                        info.phase = 'Reveal';
                    } else {
                        try {
                            await lotteryContract.getIthWinningTicket(i, 1);
                            info.phase = 'Finalized'; // If winning ticket is available, it's finalized
                        } catch (error) {
                            info.phase = 'Waiting for Finalization'; // Otherwise, wait for finalization
                        }
                    }
                    
                    if (info.phase === 'Waiting for Finalization' || info.phase === 'Finalized') {
                        finished.push(info);
                    } else {
                        ongoing.push(info);
                    }
                    console.log(`Lottery ${i} phase:`, info.phase);
                } catch (error) {
                    console.warn(`Error processing lottery ${i}:`, error);
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

    const renderLotteryStatus = (lottery) => {
        switch (lottery.phase) {
            case 'Finalized':
                return <span className="text-green-500">Finalized</span>;
            case 'Waiting for Finalization':
                return <span className="text-orange-500">Waiting for Finalization</span>;
            case 'Refund':
                return <span className="text-red-500">Refund</span>;
            case 'Purchase':
                return <span className="text-blue-500">Purchase</span>;
            case 'Reveal':
                return <span className="text-purple-500">Reveal</span>;
            default:
                return <span className="text-gray-500">{lottery.phase}</span>;
        }
    };
    

    const handleFinalizeLottery = async (lotteryId) => {
        if (!signer) return;
    
        try {
            await toast.promise(
                (async () => {
                    const adminContract = getContract(signer, 'AdminFacet');
                    const lotteryContract = getContract(signer, 'LotteryFacet');
                    
                    // Get lottery info to check minimum requirements
                    const info = await lotteryContract.getLotteryInfo(lotteryId);
                    const numSold = await lotteryContract.getLotterySales(lotteryId);
                    const minRequired = (Number(info[1]) * Number(info[3])) / 100;
                    
                    // Finalize the lottery
                    const tx = await adminContract.finalizeLottery(lotteryId);
                    await tx.wait();
                    
                    // Check if refunds are needed
                    if (Number(numSold) < minRequired) {
                        toast.info('Lottery finalized - Users can now claim refunds');
                    } else {
                        toast.success('Lottery finalized successfully');
                    }
                    
                    // Update the state
                    fetchLotteries();
                })(),
                {
                    pending: `Finalizing Lottery #${lotteryId}...`,
                    error: {
                        render({data}) {
                            if (data.message.includes('Reveal phase has not ended')) {
                                return 'Cannot finalize: Reveal phase has not ended yet';
                            } 
                            if (data.message.includes('Not enough tickets sold')) {
                                return 'Cannot finalize: Minimum ticket requirement not met';
                            }
                            return 'Failed to finalize lottery';
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error finalizing lottery:', error);
        }
    };

    

    const handleReset = () => {
        setOngoingLotteries([]);
        setFinishedLotteries([]);
        fetchLotteries();
    };

    const toggleLotteryExpansion = (lotteryId) => {
        setExpandedLotteryId(expandedLotteryId === lotteryId ? null : lotteryId);
    };

    useEffect(() => {
        fetchLotteries();
    }, [signer, address]);

    const renderTickets = (lottery) => {
        if (!lottery.tickets || lottery.tickets.length === 0) {
            return <p className="text-gray-400">No tickets found for this lottery</p>;
        }

        return (
            <div className="mt-4 space-y-2">
                <h4 className="text-lg font-medium">Tickets</h4>
                <div className="space-y-2">
                    {lottery.tickets.map((ticket, idx) => (
                        <div key={idx} className="bg-gray-600 p-2 rounded">
                            <p>Start Number: {ticket.startNumber}</p>
                            <p>Quantity: {ticket.quantity}</p>
                            {isAdmin && (
                                <p>Buyer Address: {ticket.buyerAddress}</p>
                            )}
                            {!isAdmin && ticket.buyerAddress.toLowerCase() === address.toLowerCase() && (
                                <p>Your Ticket</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    const handleClaimRefund = async (lotteryId, ticketNumber) => {
        if (!signer) return;
    
        try {
            const ticketContract = getContract(signer, 'TicketFacet');
            
            await toast.promise(
                async () => {
                    const tx = await ticketContract.withdrawTicketRefund(lotteryId, ticketNumber);
                    await tx.wait();
                    fetchLotteries(); // Refresh the list after claiming refund
                },
                {
                    pending: 'Claiming refund...',
                    success: 'Refund claimed successfully!',
                    error: {
                        render({data}) {
                            console.error('Refund error:', data);
                            if (data.message.includes('Lottery must be canceled')) {
                                return 'Cannot claim refund: Lottery is not canceled';
                            }
                            if (data.message.includes('already been withdrawn')) {
                                return 'Refund has already been claimed for this ticket';
                            }
                            return 'Failed to claim refund';
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error claiming refund:', error);
        }
    };

    const renderLotteryDetails = (lottery) => (
        <div className="space-y-2 mt-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-gray-400">Phase End Times</p>
                    <p className="text-white">Purchase Phase Ends: {new Date(lottery.purchaseEndTime * 1000).toLocaleString()}</p>
                    <p className="text-white">Reveal Phase Ends: {new Date(lottery.revealEndTime * 1000).toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-gray-400">Total Tickets / Tickets Sold</p>
                    <p className="text-white">{lottery.noOfTickets} tickets</p>
                    <p className={lottery.ticketsSold >= (lottery.noOfTickets * lottery.minPercentage / 100) ? 
                        "text-green-500" : "text-yellow-500"}>
                        {lottery.ticketsSold} sold / {Math.ceil(lottery.noOfTickets * lottery.minPercentage / 100)} required
                    </p>
                </div>
                <div>
                    <p className="text-gray-400">Minimum Requirements</p>
                    <p className="text-white">Min %: {lottery.minPercentage}%</p>
                    <p className="text-white">Min Tickets: {Math.ceil(lottery.noOfTickets * lottery.minPercentage / 100)}</p>
                </div>
                <div>
                    <p className="text-gray-400">Winners & Price</p>
                    <p className="text-white">Winners: {lottery.numWinners}</p>
                    <p className="text-white">Price: {lottery.formattedPrice} {lottery.tokenSymbol}</p>
                </div>
                    <p className="text-white">Status: {renderLotteryStatus(lottery)}</p>
                    <p className="text-white">Lottery URL: <a href={lottery.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 break-all">{lottery.url}</a></p>
                {lottery.isFinalized && lottery.winnerAddresses && (
                    <div className="col-span-2">
                        <p className="text-gray-400">Winners</p>
                        <div className="space-y-1">
                            {lottery.winnerAddresses.map((address, index) => (
                                <p key={index} className="text-green-500 text-sm">
                                    Winner #{index + 1}: {address}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
                </div>
    
            {lottery.requiresRefund && lottery.tickets && (
            <div className="mt-4">
                <h4 className="text-lg font-medium text-red-500">Refund Available</h4>
                <p className="text-sm text-white mb-2">
                    This lottery did not meet minimum participation requirements.
                    You can claim refunds for your tickets.
                </p>
                {lottery.tickets.map((ticket, idx) => (
                    <div key={idx} className="flex items-center justify-between mb-2 text-white">
                        <span>Ticket #{ticket.startNumber}</span>
                        <button
                            onClick={() => handleClaimRefund(lottery.id, ticket.startNumber)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Claim Refund
                        </button>
                    </div>
                ))}
            </div>
        )}
        </div>
    );

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

            <div>
                <h2 className="text-2xl font-bold mb-4">Ongoing Lotteries</h2>
                {ongoingLotteries.length > 0 ? (
                    ongoingLotteries.map((lottery) => (
                        <div key={lottery.id} className="bg-gray-700 p-4 rounded shadow mb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-bold">Lottery #{lottery.id}</h3>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-white ${
                                        lottery.phase === 'Purchase' ? 'bg-green-500' : 
                                        lottery.phase === 'Reveal' ? 'bg-yellow-500' : 'bg-gray-500'
                                    }`}>
                                        {lottery.phase}
                                    </span>
                                    <button
                                        onClick={() => toggleLotteryExpansion(lottery.id)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                                    >
                                        {expandedLotteryId === lottery.id ? 'Hide Details' : 'Show Details'}
                                    </button>
                                </div>
                            </div>

                            {expandedLotteryId === lottery.id && (
                                <div>
                                    {renderLotteryDetails(lottery)}
                                    
                                    {lottery.phase === 'Purchase' && (
                                        <div className="mt-4 pt-4 border-t border-gray-600">
                                            <BuyTicket 
                                                lotteryId={lottery.id} 
                                                signer={signer} 
                                                ticketPrice={lottery.formattedPrice}
                                                tokenSymbol={lottery.tokenSymbol}
                                            />
                                        </div>
                                    )}
                                    {renderTickets(lottery)}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">No ongoing lotteries found.</p>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Finished Lotteries</h2>
                {finishedLotteries.length > 0 ? (
                    finishedLotteries.map((lottery) => (
                        <div key={lottery.id} className="bg-gray-700 p-4 rounded shadow mb-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-white font-bold">Lottery #{lottery.id}</h3>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-white ${
                                        lottery.isFinalized ? 'bg-green-500' : 
                                        lottery.requiresRefund ? 'bg-red-500' : 
                                        'bg-yellow-500'
                                    }`}>
                                        {lottery.isFinalized ? 'Finalized' :
                                        lottery.requiresRefund ? 'Refund' :
                                        'Reveal'}
                                    </span>
                                    <button
                                        onClick={() => toggleLotteryExpansion(lottery.id)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                                    >
                                        {expandedLotteryId === lottery.id ? 'Hide Details' : 'Show Details'}
                                    </button>
                                </div>
                            </div>
                            {expandedLotteryId === lottery.id && (
                                <div>
                                    {renderLotteryDetails(lottery)}
                                    {lottery.phase === 'Waiting for Finalization' && isAdmin && (
                                    <button
                                        onClick={() => handleFinalizeLottery(lottery.id)}
                                        className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                                    >
                                        Finalize Lottery
                                    </button>
                            )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400">No finished lotteries found.</p>
                )}
            </div>

            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">My Tickets</h2>
                    <button
                        onClick={() => setExpandedTicketsSection(!expandedTicketsSection)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                        {expandedTicketsSection ? 'Hide Tickets' : 'Show Tickets'}
                    </button>
                </div>
                
                {expandedTicketsSection && (
                    [...ongoingLotteries, ...finishedLotteries].map((lottery) => (
                        <div key={lottery.id} className="mb-6">
                            <h3 className="text-xl font-semibold mb-2">Lottery #{lottery.id}</h3>
                            <MyTickets 
                                signer={signer} 
                                lotteryId={lottery.id} 
                                isAdmin={isAdmin} 
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LotteryList;