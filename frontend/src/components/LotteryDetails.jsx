import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { getContract } from '../services/contractService';
import TicketList from './TicketList';
import { toast } from 'react-toastify';

const LotteryDetails = ({ signer, lotteryId }) => {
    const [lotteryDetails, setLotteryDetails] = useState({});
    const [loading, setLoading] = useState(false);
    const [randomNumber, setRandomNumber] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState('');
    const [checkingWinner, setCheckingWinner] = useState(false);

    const fetchLotteryDetails = async () => {
        if (!signer || !lotteryId) {
            console.warn('Missing signer or lotteryId. Cannot fetch lottery details.');
            return;
        }
        setLoading(true);
        try {
            const contract = getContract(signer, 'LotteryFacet');
            const details = await contract.getLotteryInfo(lotteryId);

            setLotteryDetails({
                startTime: Number(details[0]),
                numTickets: Number(details[1]),
                numWinners: Number(details[2]),
                minPercentage: Number(details[3]),
                ticketPrice: ethers.utils.formatEther(details[4]),
            });
        } catch (error) {
            console.error('Error fetching lottery details:', error);
            toast.error('Failed to load lottery details.');
        } finally {
            setLoading(false);
        }
    };

    const withdrawRefund = async (ticketNo) => {
        if (!signer) return;
        setWithdrawing(true);
        try {
            const ticketContract = getContract(signer, 'TicketFacet');
            const tx = await ticketContract.withdrawTicketRefund(lotteryId, ticketNo);
            await tx.wait();
            toast.success('Refund withdrawn successfully!');
        } catch (error) {
            console.error('Error withdrawing refund:', error);
            toast.error('Failed to withdraw refund.');
        } finally {
            setWithdrawing(false);
        }
    };

    const revealRandomNumber = async (sticketno, quantity) => {
        if (!randomNumber) {
            toast.error('Enter a valid random number.');
            return;
        }
    
        try {
            const ticketContract = getContract(signer, 'TicketFacet');
            const tx = await ticketContract.revealRndNumberTx(
                lotteryId,
                sticketno,
                quantity,
                randomNumber
            );
            await tx.wait();
    
            toast.success('Random number revealed successfully!');
        } catch (error) {
            console.error('Error revealing random number:', error);
            toast.error('Failed to reveal random number.');
        }
    };

    
    const checkWinningTicket = async (ticketNo) => {
        if (!ticketNo) {
            toast.error('Please enter a ticket number');
            return;
        }
        setCheckingWinner(true);
        try {
            const ticketContract = getContract(signer, 'TicketFacet');
            const isWinner = await ticketContract.checkIfMyTicketWon(lotteryId, ticketNo);
            toast.info(isWinner ? 'Congratulations! Your ticket won!' : 'Sorry, this ticket did not win.');
        } catch (error) {
            console.error('Error checking winner:', error);
            toast.error('Failed to check if ticket won.');
        } finally {
            setCheckingWinner(false);
        }
    };

    useEffect(() => {
        fetchLotteryDetails();
    }, [signer, lotteryId]);

    return (
        <div className="lottery-details p-6">
            <h2 className="text-2xl font-bold mb-4">Lottery #{lotteryId} Details</h2>
            {loading ? (
                <p>Loading lottery details...</p>
            ) : (
                <div className="space-y-4">
                    <p>
                        <span className="font-semibold">Start Time:</span>{' '}
                        {new Date(lotteryDetails.startTime * 1000).toLocaleString()}
                    </p>
                    <p>
                        <span className="font-semibold">Number of Tickets:</span>{' '}
                        {lotteryDetails.numTickets}
                    </p>
                    <p>
                        <span className="font-semibold">Number of Winners:</span>{' '}
                        {lotteryDetails.numWinners}
                    </p>
                    <p>
                        <span className="font-semibold">Minimum Participation:</span>{' '}
                        {lotteryDetails.minPercentage}%
                    </p>
                    <p>
                        <span className="font-semibold">Ticket Price:</span>{' '}
                        {lotteryDetails.ticketPrice} ETH
                    </p>
                </div>
            )}

            {/* Purchased Tickets Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">My Tickets</h2>
                <div className="bg-gray-700 p-6 rounded shadow">
                    <TicketList lotteryId={lotteryId} signer={signer} />
                </div>
            </div>

            {/* Reveal Random Number Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Reveal Random Number</h2>
                <div className="bg-gray-700 p-6 rounded shadow">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Ticket Start Number:
                            </label>
                            <input
                                type="number"
                                className="p-2 rounded border w-full"
                                value={selectedTicket}
                                onChange={(e) => setSelectedTicket(e.target.value)}
                                placeholder="Enter ticket start number"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Random Number:
                            </label>
                            <input
                                type="text"
                                className="p-2 rounded border w-full"
                                value={randomNumber}
                                onChange={(e) => setRandomNumber(e.target.value)}
                                placeholder="Enter your random number"
                            />
                        </div>
                        <button
                            onClick={() => revealRandomNumber(Number(selectedTicket), 1)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition w-full"
                        >
                            Reveal Random Number
                        </button>
                    </div>
                </div>
            </div>

            {/* Refund Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Refund Section</h2>
                <div className="bg-gray-700 p-6 rounded shadow">
                    <h3 className="text-xl font-bold mb-2">Withdraw Refund</h3>
                    <input
                        type="number"
                        placeholder="Enter Ticket Number"
                        className="p-2 rounded border w-full mb-2"
                        onChange={(e) => setRandomNumber(e.target.value)}
                    />
                    <button
                        onClick={() => withdrawRefund(Number(randomNumber))}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                        disabled={withdrawing}
                    >
                        {withdrawing ? 'Withdrawing...' : 'Withdraw Refund'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LotteryDetails;
