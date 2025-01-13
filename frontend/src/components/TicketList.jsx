import React, { useEffect, useState } from 'react';
import { getUserTickets, getContract } from '../services/contractService';
import { toast } from 'react-toastify';

const TicketList = ({ lotteryId, signer }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [randomNumber, setRandomNumber] = useState('');

    useEffect(() => {
        fetchTickets();
    }, [lotteryId, signer]);

    const fetchTickets = async () => {
        if (!signer || !lotteryId) return;
        setLoading(true);
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
            fetchTickets(); // Refresh tickets after reveal
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

    if (loading) return <div>Loading tickets...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-4">
            {tickets.length > 0 ? (
                tickets.map((ticket, index) => (
                    <div key={index} className="bg-gray-600 p-4 rounded">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p>Start Number: {ticket.startNumber}</p>
                                <p>Quantity: {ticket.quantity}</p>
                            </div>
                            <div className="text-right">
                                <p>Status: {getTicketStatus(ticket)}</p>
                            </div>
                        </div>
                        {!ticket.revealed && !ticket.isFinished && (
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
                ))
            ) : (
                <p>No tickets found for this lottery</p>
            )}
        </div>
    );
};

export default TicketList;