import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignaturePad from "react-signature-canvas";
import {
    DocumentTextIcon,
    ExclamationIcon,
    CheckCircleIcon,
    XCircleIcon,
    DownloadIcon,
    EyeIcon
} from "@heroicons/react/outline";
import PaymentWrapper from "./PaymentForm";
import axios from 'axios';

// Configure API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || `http://localhost:5001`;

function ContractSign() {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signedSuccessfully, setSignedSuccessfully] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    
    const { signingKey } = useParams();
    const navigate = useNavigate();
    const sigPad = useRef();

    useEffect(() => {
        fetchContract();
        // Cleanup function
        return () => {
            if (sigPad.current) {
                sigPad.current.clear();
            }
        };
    }, [signingKey]);

    const fetchContract = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/contracts/sign/${signingKey}`);
            const data = response.data;

            // Check contract status
            if (data.status === 'signed') {
                throw new Error('This contract has already been signed.');
            }

            // Check expiry
            if (new Date(data.expiryDate) < new Date()) {
                throw new Error('This contract has expired.');
            }

            setContract(data);
            setError(null);
        } catch (error) {
            console.error("Error:", error);
            setError(error?.response?.data?.message || error.message || "Failed to fetch contract");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!contract) return;

        try {
            setDownloadProgress(0);
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/contracts/download/${contract._id}/${contract.signingKey}`,
                {
                    responseType: 'blob',
                    onDownloadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        setDownloadProgress(percentCompleted);
                    }
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${contract.title}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download the file. Please try again.');
        } finally {
            setDownloadProgress(0);
        }
    };

    const handlePreview = () => {
        if (!contract) return;
        window.open(`${process.env.REACT_APP_API_URL}/api/contracts/preview/${contract._id}/${contract.signingKey}`, '_blank');
    };

    const handleClear = () => {
        if (sigPad.current) {
            sigPad.current.clear();
        }
    };

    const handleSave = () => {
        if (!sigPad.current || sigPad.current.isEmpty()) return null;
        return sigPad.current.toDataURL('image/png');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const signatureData = handleSave();
        if (!signatureData) {
            alert('Please provide your signature');
            return;
        }

        try {
            setSigning(true);
            const response = await axios.post(
                `${API_URL}/api/contracts/sign/${signingKey}`,
                { signatureData },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            const { signedPdfUrl } = response.data;
            setSignedSuccessfully(true);
            setContract(prev => ({
                ...prev,
                signedPdfUrl,
                status: 'signed'
            }));

            if (contract.requirePayment) {
                setShowPayment(true);
            } else {
                // Show success message and redirect
                setTimeout(() => {
                    navigate('/thank-you');
                }, 2000);
            }
        } catch (error) {
            console.error('Error signing contract:', error);
            alert(error?.response?.data?.message || 'Failed to sign contract');
        } finally {
            setSigning(false);
        }
    };

    const handlePaymentSuccess = () => {
        setPaymentCompleted(true);
        setTimeout(() => {
            navigate('/thank-you');
        }, 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading contract...</p>
                </div>
            </div>
        );
    }

    // Rest of your existing JSX with updated buttons and logic
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Main content container */}
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
                    {/* Header */}
                    <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {contract.title}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {signedSuccessfully 
                                ? "Please complete the payment"
                                : "Please review and sign the document"}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-5 sm:p-6">
                        {signedSuccessfully && showPayment ? (
                            // Payment Section
                            <div className="space-y-6">
                                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                                    <div className="flex">
                                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                                        <div className="ml-3">
                                            <p className="text-sm text-green-700">
                                                Contract signed successfully! Please complete the payment.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <PaymentWrapper
                                    contract={contract}
                                    onSuccess={handlePaymentSuccess}
                                />
                            </div>
                        ) : !signedSuccessfully ? (
                            // Contract Signing Section
                            <>
                                {/* Contract Details */}
                                <div className="mb-6">
                                    {/* Your existing contract details section */}
                                </div>

                                {/* PDF Preview with improved buttons */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Document Preview
                                    </h3>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <div className="text-center">
                                            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                {contract.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500">PDF Document</p>
                                            <div className="mt-6 space-x-4">
                                                <button
                                                    onClick={handlePreview}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    <EyeIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                                                    View Document
                                                </button>
                                                <button
                                                    onClick={handleDownload}
                                                    disabled={downloadProgress > 0}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    <DownloadIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                                                    {downloadProgress > 0 
                                                        ? `Downloading ${downloadProgress}%`
                                                        : 'Download'
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Section with improved error handling */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Sign Here
                                    </h3>
                                    <div className="border border-gray-300 rounded-lg p-4">
                                        <SignaturePad
                                            ref={sigPad}
                                            canvasProps={{
                                                className: "signature-canvas border rounded",
                                                style: {
                                                    width: "100%",
                                                    height: "200px",
                                                    backgroundColor: "#fff",
                                                },
                                            }}
                                        />
                                        <div className="mt-2 flex justify-between items-center">
                                            <p className="text-sm text-gray-500">
                                                Draw your signature using mouse or touch screen
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleClear}
                                                className="text-sm text-gray-600 hover:text-gray-900"
                                            >
                                                Clear Signature
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons with improved states */}
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => window.close()}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                        disabled={signing}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={signing}
                                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                            ${signing ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
                                        `}
                                    >
                                        {signing ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Signing...
                                            </span>
                                        ) : (
                                            "Sign Contract"
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            // Success message if no payment required
                            <div className="text-center py-12">
                                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                                <h3 className="mt-2 text-xl font-medium text-gray-900">
                                    Contract signed successfully!
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    You can close this window now.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Instructions Card */}
                {!signedSuccessfully && (
                    <div className="bg-white shadow rounded-lg p-6">
                        {/* Your existing instructions section */}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContractSign;