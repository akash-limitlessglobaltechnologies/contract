import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

function ContractList() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getToken } = useAuth();

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contracts`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please login again');
                }
                throw new Error('Failed to fetch contracts');
            }

            const data = await response.json();
            setContracts(data);
            setError(null);
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (contractId, signingKey) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contracts/download/${contractId}/${signingKey}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to download file');
            }

            // Get the blob from the response
            const blob = await response.blob();
            
            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link element
            const link = document.createElement('a');
            link.href = url;
            link.download = `contract-${contractId}.pdf`; // Set the file name
            
            // Append the link to the document
            document.body.appendChild(link);
            
            // Click the link to trigger the download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download the contract');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            signed: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Contracts</h1>
                    <Link
                        to="/contracts/new"
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Create Contract
                    </Link>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-2 text-gray-500">Loading contracts...</p>
                    </div>
                ) : contracts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <p className="text-gray-500">No contracts found</p>
                        <Link
                            to="/contracts/new"
                            className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
                        >
                            Create your first contract
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <ul className="divide-y divide-gray-200">
                            {contracts.map(contract => (
                                <li key={contract._id}>
                                    <div className="px-4 py-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900">
                                                {contract.title}
                                            </h3>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">
                                                    Recipient: {contract.recipientEmail}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Created: {new Date(contract.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Expires: {new Date(contract.expiryDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end space-y-2">
                                            {getStatusBadge(contract.status)}
                                            {contract.status === 'signed' && (
                                                <button
                                                    onClick={() => handleDownload(contract._id, contract.signingKey)}
                                                    className="text-sm text-indigo-600 hover:text-indigo-900 cursor-pointer"
                                                >
                                                    Download Signed PDF
                                                </button>
                                            )}
                                            <Link
                                                to={`/contracts/${contract._id}`}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContractList;