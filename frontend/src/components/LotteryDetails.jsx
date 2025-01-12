import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import TicketList from './TicketList';
import BuyTicket from './BuyTicket';

const LotteryDetails = ({ lottery = {}, signer }) => {
    const [showTickets, setShowTickets] = useState(false);

    const formatValue = (value, type = 'number') => {
        if (value === null || value === undefined) return 'N/A';
        try {
            if (type === 'number') return Number(value);
            if (type === 'ether') return ethers.formatEther(value);
            if (type === 'text') return value.toString();
        } catch {
            return 'N/A';
        }
    };

    if (!lottery.id) {
        return <p>No lottery data available.</p>;
    }

    return (
        <div className="lottery-details">
            <h3 className="text-lg font-bold mb-4">Lottery #{lottery.id}</h3>
            <div className="space-y-2">
                <p>
                    <span className="font-semibold">End Time:</span>{' '}
                    {lottery.endTime ? new Date(lottery.endTime * 1000).toLocaleString() : 'N/A'}
                </p>
                <p>
                    <span className="font-semibold">Ticket Price:</span>{' '}
                    {lottery.ticketPrice ? `${formatValue(lottery.ticketPrice, 'ether')} ETH` : 'N/A'}
                </p>
                <p>
                    <span className="font-semibold">Tickets Sold:</span>{' '}
                    {lottery.ticketsSold ?? 'N/A'}
                </p>
                <p>
                    <span className="font-semibold">Number of Winners:</span>{' '}
                    {lottery.numWinners ?? 'N/A'}
                </p>
            </div>

            <div className="my-4">
                <BuyTicket lotteryId={lottery.id} signer={signer} ticketPrice={lottery.ticketPrice} />
            </div>

            <button
                onClick={() => setShowTickets(!showTickets)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
                {showTickets ? 'Hide Tickets' : 'Show Tickets'}
            </button>

            {showTickets && (
                <div className="mt-4">
                    <TicketList lotteryId={lottery.id} signer={signer} />
                </div>
            )}
        </div>
    );
};

export default LotteryDetails;
