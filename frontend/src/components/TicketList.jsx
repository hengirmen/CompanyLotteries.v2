import React, { useEffect, useState } from 'react';
import { getContract } from '../services/contractService';

const TicketList = ({ lotteryId, signer }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!signer) return;
            setLoading(true);
            try {
                const contract = getContract(signer, 'LotteryFacet');
                const numTxs = await contract.getNumPurchaseTxs(lotteryId);
                const ticketList = [];

                for (let i = 1; i <= numTxs; i++) {
                    try {
                        const { sticketno, quantity } = await contract.getIthPurchasedTicket(lotteryId, i);
                        ticketList.push({ index: i, sticketno, quantity });
                    } catch (error) {
                        console.error(`Error fetching ticket ${i}:`, error);
                    }
                }

                setTickets(ticketList);
            } catch (error) {
                console.error('Error fetching tickets:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [lotteryId, signer]);

    return (
        <div className="ticket-list">
            <h4 className="text-lg font-bold mb-4">Purchased Tickets</h4>
            {loading ? (
                <p>Loading tickets...</p>
            ) : tickets.length > 0 ? (
                <ul className="space-y-2">
                    {tickets.map((ticket) => (
                        <li key={ticket.index} className="bg-gray-700 p-3 rounded shadow">
                            <p>
                                <span className="font-semibold">Ticket Index:</span> #{ticket.index}
                            </p>
                            <p>
                                <span className="font-semibold">Start Ticket Number:</span> {ticket.sticketno}
                            </p>
                            <p>
                                <span className="font-semibold">Quantity:</span> {ticket.quantity}
                            </p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400">No tickets purchased for this lottery.</p>
            )}
        </div>
    );
};

export default TicketList;
