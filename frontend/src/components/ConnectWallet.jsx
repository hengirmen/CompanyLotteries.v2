import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { getContract } from '../services/contractService';

const ConnectWallet = ({ setSigner, setProvider, setAddress, setIsAdmin }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
    
                // Get admin contract and check ownership
                const adminContract = getContract(signer, 'AdminFacet');
                const adminAddress = await adminContract.getAdmin();
                const isAdmin = adminAddress.toLowerCase() === address.toLowerCase();
                
                console.log('Connected address:', address);
                console.log('Admin address:', adminAddress);
                console.log('Is admin:', isAdmin);
    
                setProvider(provider);
                setSigner(signer);
                setAddress(address);
                setWalletAddress(address);
                setIsAdmin(isAdmin);
                setIsConnected(true);
    
                toast.success('Wallet connected successfully!');
            } catch (error) {
                console.error('Wallet connection error:', error);
                toast.error('Failed to connect wallet.');
            }
        } else {
            toast.error('MetaMask not detected. Please install MetaMask!');
        }
    };

    const handleDisconnect = () => {
        setProvider(null);
        setSigner(null);
        setAddress(null);
        setWalletAddress('');
        setIsConnected(false);
        setIsAdmin(false);
        toast.info('Wallet disconnected.');
    };

    return (
        <div className="connect-wallet">
            {!isConnected ? (
                <button
                    onClick={connectWallet}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                    Connect Wallet
                </button>
            ) : (
                <div className="connected-info">
                    <p className="text-sm text-gray-700">
                        Connected as: <span className="font-bold">{walletAddress}</span>
                    </p>
                    <button
                        onClick={handleDisconnect}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition mt-2"
                    >
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
};

export default ConnectWallet;