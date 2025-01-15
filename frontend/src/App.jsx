import React, { useState } from 'react';
import ConnectWallet from './components/ConnectWallet';
import AdminDashboard from './components/AdminDashboard';
import LotteryList from './components/LotteryList';
import Faucet from './components/Faucet';
import LotteryDetails from './components/LotteryDetails';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css'; // ensures Tailwind gets processed

function App() {
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [address, setAddress] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [darkMode, setDarkMode] = useState(true); // Set Dark Mode as default
    const [selectedLottery, setSelectedLottery] = useState(null); // Manage selected lottery

    const toggleDarkMode = () => setDarkMode(!darkMode);

    return (
        <div
            className={`min-h-screen ${
                darkMode ? 'dark bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-900'
            }`}
        >
            {/* Header */}
            <header className="p-6 bg-blue-500 text-white dark:bg-blue-700">
                <div className="container mx-auto flex items-center justify-between">
                    {/* Left: Logo */}
                    <div className="flex items-center">
                        <img 
                            src="/logo.png" 
                            alt="Lottery DApp Logo" 
                            className="h-24 w-auto mr-4"
                        />
                    </div>

                    {/* Right: Dark Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 
                                dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500 transition"
                    >
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
            </header>

            {/* Connect Wallet Section */}
            <div className="p-6">
                <ConnectWallet setSigner={setSigner} setProvider={setProvider} setAddress={setAddress} setIsAdmin={setIsAdmin} />
                {signer ? (
                    <>
                        {/* Faucet Component */}
                        <div className="my-6">
                            <Faucet signer={signer} />
                        </div>

                        {/* Layout for Admin Dashboard and Lottery List */}
                        <div className="flex flex-col lg:flex-row gap-6 mt-6">
                            {/* Admin Dashboard on the Left */}
                            {isAdmin && (
                                <div className="lg:w-1/3 w-full">
                                    <AdminDashboard signer={signer} />
                                </div>
                            )}

                            {/* Lottery List on the Right */}
                            <div className={`${isAdmin ? 'lg:w-2/3' : 'w-full'}`}>
                            <LotteryList
                                signer={signer}
                                address={address}
                                isAdmin={isAdmin}
                                onSelectLottery={(lottery) => setSelectedLottery(lottery)}
                            />
                            </div>
                        </div>

                        {/* Lottery Details */}
                        {selectedLottery && (
                            <div className="mt-8">
                                <LotteryDetails signer={signer} lotteryId={selectedLottery.id} />
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center text-gray-500 mt-4">Please connect your wallet to use the DApp.</p>
                )}
            </div>

            {/* Toast Notifications */}
            <ToastContainer />
        </div>
    );
}

export default App;