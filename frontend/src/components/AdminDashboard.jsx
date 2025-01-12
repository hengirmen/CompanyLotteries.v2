import React, { useState } from 'react';
import { createLottery, setPaymentToken } from '../services/contractService';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

const AdminDashboard = ({ signer }) => {
    const [endTime, setEndTime] = useState('');
    const [ticketPrice, setTicketPrice] = useState('');
    const [paymentToken, setPaymentTokenInput] = useState('');
    const [noOfTickets, setNoOfTickets] = useState('');
    const [noOfWinners, setNoOfWinners] = useState('');
    const [minPercentage, setMinPercentage] = useState('');
    const [htmlHash, setHtmlHash] = useState('');
    const [url, setUrl] = useState('');
    const [darkMode, setDarkMode] = useState(false);

    const handleCreateLottery = async (e) => {
        e.preventDefault();
        try {
            const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
            const price = ethers.parseEther(ticketPrice);

            const tx = await createLottery(
                signer,
                endTimestamp,
                noOfTickets,
                noOfWinners,
                minPercentage,
                price,
                htmlHash,
                url
            );
            await tx.wait();
            toast.success('Lottery created successfully!');
        } catch (error) {
            console.error('Error creating lottery:', error);
            toast.error('Failed to create lottery.');
        }
    };

    const handleSetPaymentToken = async (e) => {
        e.preventDefault();
        try {
            const tx = await setPaymentToken(signer, paymentToken);
            await tx.wait();
            toast.success('Payment token updated successfully!');
        } catch (error) {
            console.error('Error setting payment token:', error);
            toast.error('Failed to set payment token.');
        }
    };

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center ${
                darkMode ? 'dark bg-gray-800 text-gray-200' : 'bg-gray-700 text-gray-900'
            }`}
        >
            <div className="bg-gray-700 p-6 rounded shadow-md w-full max-w-lg">
                <h2 className="text-2xl font-bold text-center mb-6 text-white">Admin Dashboard</h2>

                {/* Create Lottery Form */}
                <form onSubmit={handleCreateLottery} className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Create Lottery</h3>
                    <label className="block">
                        <span className="text-white">End Time:</span>
                        <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">Number of Tickets:</span>
                        <input
                            type="number"
                            value={noOfTickets}
                            onChange={(e) => setNoOfTickets(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">Number of Winners:</span>
                        <input
                            type="number"
                            value={noOfWinners}
                            onChange={(e) => setNoOfWinners(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">Minimum Percentage:</span>
                        <input
                            type="number"
                            value={minPercentage}
                            onChange={(e) => setMinPercentage(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">Ticket Price (ETH):</span>
                        <input
                            type="number"
                            step="0.0001"
                            value={ticketPrice}
                            onChange={(e) => setTicketPrice(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">HTML Hash:</span>
                        <input
                            type="text"
                            value={htmlHash}
                            onChange={(e) => setHtmlHash(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <label className="block">
                        <span className="text-white">URL:</span>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition w-full"
                    >
                        Create Lottery
                    </button>
                </form>

                {/* Set Payment Token Form */}
                <form onSubmit={handleSetPaymentToken} className="space-y-4 mt-8">
                    <h3 className="text-xl font-semibold text-white">Set Payment Token</h3>
                    <label className="block">
                        <span className="text-white">Payment Token Address:</span>
                        <input
                            type="text"
                            value={paymentToken}
                            onChange={(e) => setPaymentTokenInput(e.target.value)}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 text-white"
                            required
                        />
                    </label>
                    <button
                        type="submit"
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition w-full"
                    >
                        Set Payment Token
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminDashboard;
