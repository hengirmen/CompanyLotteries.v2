import React, { useState, useEffect } from 'react';
import { getContract, getUserTickets } from '../services/contractService';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

const MyTickets = ({ signer, lotteryId, isAdmin }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lotteryPhase, setLotteryPhase] = useState(null);
    const [randomNumber, setRandomNumber] = useState('');

    /**
     * Optional: Check lottery phase
     */
    const getLotteryPhase = async () => {
        try {
            const lotteryContract = getContract(signer, 'LotteryFacet');
            const info = await lotteryContract.getLotteryInfo(lotteryId);
            const numSold = await lotteryContract.getLotterySales(lotteryId);

            const minTicketsRequired = (Number(info[1]) * Number(info[3])) / 100;
            const hasMetMinimumSales = Number(numSold) >= minTicketsRequired;
            
            const now = Math.floor(Date.now() / 1000);

            // Check if there's at least one winning ticket => "Finalized"
            try {
                await lotteryContract.getIthWinningTicket(lotteryId, 1);
                return 'Finalized';
            } catch {
                // If fails, no winners => not finalized
            }

            // If your contract provides "phaseTimes":
            const phaseTimes = await lotteryContract.getLotteryPhaseTimes(lotteryId);
            const purchaseEndTime = Number(phaseTimes[1]);
            const revealEndTime = Number(phaseTimes[2]);

            if (now < purchaseEndTime) {
                return 'Purchase';
            } else if (now < revealEndTime) {
                return 'Reveal';
            } else {
                return !hasMetMinimumSales ? 'Refund' : 'Reveal';
            }
        } catch (err) {
            console.error('Error getting lottery phase:', err);
            return null;
        }
    };

    const getLotteryStatus = () => {
        switch (lotteryPhase) {
            case 'Purchase':
                return <div className="text-blue-500 mb-4">Purchase Phase - Buy your tickets!</div>;
            case 'Reveal':
                return <div className="text-purple-500 mb-4">Reveal Phase - Reveal your numbers!</div>;
            case 'Finalized':
                return <div className="text-green-500 mb-4">Lottery Finalized - Check winners!</div>;
            case 'Refund':
                return <div className="text-red-500 mb-4">Refund Available - Claim your refund!</div>;
            default:
                return null;
        }
    };

    const fetchTickets = async () => {
        if (!signer || !lotteryId) return;
        setLoading(true);

        try {
            // 1) Determine phase
            const phase = await getLotteryPhase();
            setLotteryPhase(phase);

            // 2) Fetch user tickets
            const fetchedTickets = await getUserTickets(signer, lotteryId, isAdmin);
            setTickets(fetchedTickets);
        } catch (err) {
            console.error('Error fetching tickets:', err);
            setError('Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    };

    /**
     * handleReveal:
     * 1) Log the purchase-style hash (utf8 => keccak256).
     * 2) Attempt on-chain reveal with rnd_number as uint256.
     *    If mismatch => user can't win.
     */
    const handleReveal = async (ticketNumber) => {
        if (!randomNumber) {
            toast.error('Please enter the same random string you used at purchase');
            return;
        }

        try {
            // Step 1: Show the purchase-style hash in console
            const revealHash = ethers.keccak256(
                ethers.toUtf8Bytes(randomNumber)  
            );
            console.log(`Hash of "${randomNumber}":`, revealHash);

            // Optionally remove "0x" if you want a clean print
            const revealHashNoPrefix = revealHash.replace(/^0x/, '');
            console.log(`Hash of "${randomNumber}" (no 0x prefix):`, revealHashNoPrefix);

            // Step 2: On-chain reveal
            const ticketContract = getContract(signer, 'TicketFacet');

            // Must pass a numeric uint256 for contract's keccak256(abi.encodePacked(rnd_number))
            const numericRnd = BigInt(randomNumber);

            const tx = await ticketContract.revealRndNumberTx(
                lotteryId,
                ticketNumber,
                1,         // quantity
                numericRnd // contract expects uint256
            );
            await tx.wait();

            toast.success('Random number revealed successfully!');
            // Re-fetch tickets to see updated "revealed" status
            fetchTickets();

        } catch (err) {
            console.error('Reveal error:', err);
            // If mismatch => revert with "Random number does not match the hash!"
            if (
                err.reason?.includes('Random number does not match') ||
                err.toString().includes('Random number does not match the hash!')
            ) {
                toast.error('Random number mismatch — this ticket can’t become a winner.');
            } else {
                toast.error('Failed to reveal random number.');
            }
        }
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signer, lotteryId, isAdmin]);

    if (loading) return <div className="text-gray-400">Loading tickets...</div>;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!tickets.length) return <div className="text-gray-400">No tickets found</div>;

    return (
        <div className="space-y-4">
            {getLotteryStatus()}

            {/* Render each ticket */}
            {tickets.map((ticket, index) => (
                <div key={index} className="bg-gray-600 p-4 rounded">
                    <p className="text-white">Ticket Number: {ticket.ticketNumber}</p>
                    <p className={ticket.isOwner ? "text-blue-400" : "text-gray-300"}>
                        Owner Address: {ticket.owner}
                    </p>

                    {/* If Finalized, show winner status */}
                    {lotteryPhase === "Finalized" && ticket.isWinner && (
                        <p className="text-green-400 font-bold">Winner! 🎉</p>
                    )}

                    {/* If it's Reveal phase and user hasn't revealed, show input */}
                    {lotteryPhase === "Reveal" && ticket.isOwner && !ticket.revealed && (
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Exact same random string used at purchase"
                                className="w-full p-2 rounded mb-2 text-black"
                                onChange={(e) => setRandomNumber(e.target.value)}
                            />
                            <button
                                onClick={() => handleReveal(ticket.ticketNumber)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            >
                                Reveal Number
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default MyTickets;
