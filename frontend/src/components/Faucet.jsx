import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { requestFaucetTokens } from '../services/contractService';

const Faucet = ({ signer }) => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [amount, setAmount] = useState('');

    const handleRequestTokens = async () => {
        setIsRequesting(true);
        try {
            // Parse amount to proper decimal format
            const amountInWei = ethers.parseEther(amount);
            await requestFaucetTokens(signer, amountInWei);
            toast.success('Tokens requested successfully!');
        } catch (error) {
            console.error('Error requesting tokens:', error);
            toast.error('Failed to request tokens.');
        } finally {
            setIsRequesting(false);
        }
    };

    return (
        <div className="faucet bg-gray-800 p-4 rounded-lg">
            <h3 className="text-white font-bold mb-4">MockERC20 Faucet</h3>
            <div className="mb-4">
                <label className="block text-sm font-medium text-white">
                    Amount:
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter amount"
                    required
                    disabled={isRequesting}
                />
            </div>
            <button
                onClick={handleRequestTokens}
                className={`w-full rounded-md px-4 py-2 text-white 
                    ${isRequesting 
                        ? 'bg-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isRequesting}
            >
                {isRequesting ? 'Requesting...' : 'Request Tokens'}
            </button>
        </div>
    );
};

export default Faucet;