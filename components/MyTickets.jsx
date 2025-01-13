import React, { useState, useEffect } from 'react';
import { getUserTickets, getContract } from '../services/contractService';
import { toast } from 'react-toastify';

const MyTickets = ({ signer, lotteryId }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [randomNumber, setRandomNumber] = useState('');

    const fetchMyTickets = async () => {
        if (!signer || !lotteryId) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const userTickets = await getUserTickets(signer, lotteryId);
            setTickets(userTickets);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            setError('Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async (startNumber, quantity) => {
        if (!randomNumber) {
            toast.error('Please enter a random number');
            return;
        }

        try {
            const contract = getContract(signer, 'TicketFacet');
            const tx = await contract.revealRndNumberTx(
                lotteryId,
                startNumber,
                quantity,
                randomNumber
            );
            await tx.wait();
            toast.success('Random number revealed successfully!');
            fetchMyTickets();
        } catch (error) {
            console.error('Error revealing number:', error);
            toast.error('Failed to reveal random number');
        }
    };

    const getTicketStatus = (ticket) => {
        if (ticket.isFinished) {
            if (!ticket.revealed) {
                return <span className="text-yellow-400">Not Revealed (Lottery Finished)</span>;
            }
            return ticket.isWinner ? 
                <span className="text-green-400">Winner!</span> : 
                <span className="text-red-400">Not a winner</span>;
        } else {
            if (!ticket.revealed) {
                return <span className="text-yellow-400">Not Revealed</span>;
            }
            return <span className="text-blue-400">Revealed - Awaiting Results</span>;
        }
    };

    useEffect(() => {
        fetchMyTickets();
    }, [signer, lotteryId]);

    if (loading) {
        return <div className="text-gray-400">Loading tickets...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="bg-gray-700 p-4 rounded-lg">
            {tickets.length > 0 ? (
                <div className="space-y-4">
                    {tickets.map((ticket, index) => (
                        <div key={index} className="bg-gray-600 p-4 rounded">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-white">Ticket Start Number: {ticket.startNumber}</p>
                                    <p className="text-white">Quantity: {ticket.quantity}</p>
                                    <p className="text-white">
                                        Lottery Status: {ticket.isFinished ? 
                                            <span className="text-red-400">Finished</span> : 
                                            <span className="text-green-400">Ongoing</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white">Status: {getTicketStatus(ticket)}</p>
                                </div>
                            </div>
                            {!ticket.revealed && (
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="Enter random number"
                                        className="p-2 rounded border w-full mb-2"
                                        onChange={(e) => setRandomNumber(e.target.value)}
                                    />
                                    <button
                                        onClick={() => handleReveal(ticket.startNumber, ticket.quantity)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        Reveal Number
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400">No tickets found for this lottery</p>
            )}
        </div>
    );
};

export default MyTickets;