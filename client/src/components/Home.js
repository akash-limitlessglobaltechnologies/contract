import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    DocumentTextIcon, 
    ClockIcon, 
    UserGroupIcon, 
    PlusIcon
} from '@heroicons/react/outline'; // Changed from /24/outline to /outline
import Navbar from './Navbar';

function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5001/api/logout', {
                credentials: 'include'
            });
            logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const features = [
        {
            name: 'Create Contracts',
            description: 'Upload PDFs and create new contracts with customizable terms',
            icon: DocumentTextIcon,
        },
        {
            name: 'Set Expiry',
            description: 'Define validity periods for your contracts',
            icon: ClockIcon,
        },
        {
            name: 'Easy Sharing',
            description: 'Share contracts directly via email with secure links',
            icon: UserGroupIcon,
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main>
                {/* Hero section */}
                <div className="bg-white shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Welcome back, {user?.displayName}
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => navigate('/contracts/new')}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                New Contract
                            </button>
                        </div>
                    </div>
                </div>

             

                {/* Features section */}
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <div
                                key={feature.name}
                                className="bg-white overflow-hidden shadow rounded-lg p-6"
                            >
                                <div>
                                    <feature.icon className="h-8 w-8 text-indigo-600" />
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {feature.name}
                                    </h3>
                                    <p className="mt-2 text-base text-gray-500">
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:p-6">
                            <h3 className="text-lg font-medium text-gray-900">
                                Quick Actions
                            </h3>
                            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <button
                                    onClick={() => navigate('/contracts/new')}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Create New Contract
                                </button>
                                <button
                                    onClick={() => navigate('/contracts')}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    View All Contracts
                                </button>
                                <button
                                    onClick={() => navigate('/contracts')}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Pending Signatures
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Home;