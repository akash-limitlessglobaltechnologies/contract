import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignaturePad from "react-signature-canvas";
import {
    DocumentTextIcon,
    ExclamationIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/outline";
import PaymentWrapper from "./PaymentForm";

function ContractSign() {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signedSuccessfully, setSignedSuccessfully] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    
    const { signingKey } = useParams();
    const navigate = useNavigate();
    const sigPad = useRef();

    useEffect(() => {
        fetchContract();
    }, [signingKey]);

    const fetchContract = async () => {
        try {
            const response = await fetch(
                `http://localhost:5001/api/contracts/sign/${signingKey}`
            );
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Contract not found or expired");
            }
            const data = await response.json();
            setContract(data);
            setError(null);
        } catch (error) {
            console.error("Error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getPreviewUrl = (contract) => {
        return `http://localhost:5001/api/contracts/preview/${contract._id}/${contract.signingKey}`;
    };

    const getDownloadUrl = (contract) => {
        return `http://localhost:5001/api/contracts/download/${contract._id}/${contract.signingKey}`;
    };

    const handleDownload = async (contract) => {
        try {
            const response = await fetch(getDownloadUrl(contract));
            if (!response.ok) throw new Error('Failed to download file');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${contract.title}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download the file. Please try again.');
        }
    };

    const handleClear = () => {
        if (sigPad.current) {
            sigPad.current.clear();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!sigPad.current || sigPad.current.isEmpty()) {
            alert('Please provide your signature');
            return;
        }

        try {
            setSigning(true);
            const signatureData = sigPad.current.toDataURL('image/png');
            
            const response = await fetch(`http://localhost:5001/api/contracts/sign/${signingKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ signatureData }),
            });

            if (!response.ok) {
                throw new Error('Failed to sign contract');
            }

            await response.json();
            setSignedSuccessfully(true);

            if (contract.requirePayment) {
                setShowPayment(true);
            } else {
                alert('Contract signed successfully!');
                navigate('/thank-you');
            }
        } catch (error) {
            console.error('Error signing contract:', error);
            alert(error.message || 'Failed to sign contract');
        } finally {
            setSigning(false);
        }
    };

    const handlePaymentSuccess = () => {
        setPaymentCompleted(true);
        alert('Payment completed successfully!');
        navigate('/thank-you');
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

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
                    <div className="inline-flex h-14 w-14 rounded-full bg-red-100 p-4 mx-auto">
                        <XCircleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Error</h2>
                    <p className="mt-2 text-gray-600">{error}</p>
                    <button
                        onClick={() => window.close()}
                        className="mt-6 w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Close Window
                    </button>
                </div>
            </div>
        );
    }

    if (!contract) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
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
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        Contract Details
                                    </h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        {contract.description && (
                                            <p className="text-gray-600 mb-2">{contract.description}</p>
                                        )}
                                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <div>
                                                <span className="text-sm text-gray-500">Recipient:</span>
                                                <span className="ml-2 text-sm text-gray-900">
                                                    {contract.recipientEmail}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm text-gray-500">Expires:</span>
                                                <span className="ml-2 text-sm text-gray-900">
                                                    {new Date(contract.expiryDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {contract.requirePayment && (
                                                <div className="sm:col-span-2 mt-2">
                                                    <span className="text-sm text-gray-500">Payment Required:</span>
                                                    <span className="ml-2 text-sm font-medium text-gray-900">
                                                        {contract.paymentAmount} {contract.paymentCurrency}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* PDF Preview */}
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
                                                    onClick={() => window.open(getPreviewUrl(contract), "_blank")}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    <DocumentTextIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                                                    View Document
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(contract)}
                                                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature Section */}
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

                                {/* Action Buttons */}
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
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Instructions
                        </h3>
                        <ul className="space-y-2 text-gray-600 text-sm">
                        <li className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                    1.
                                </span>
                                Review the contract document carefully above
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                    2.
                                </span>
                                Draw your signature in the signature box
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                    3.
                                </span>
                                Use the 'Clear' button if you need to redraw your signature
                            </li>
                            <li className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                    4.
                                </span>
                                Click 'Sign Contract' when you're ready to submit
                            </li>
                            {contract.requirePayment && (
                                <li className="flex items-start">
                                    <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                        5.
                                    </span>
                                    Complete the payment after signing ({contract.paymentAmount} {contract.paymentCurrency})
                                </li>
                            )}
                            <li className="flex items-start">
                                <span className="flex-shrink-0 h-5 w-5 text-indigo-500 mr-2">
                                    {contract.requirePayment ? "6." : "5."}
                                </span>
                                Wait for confirmation before closing the window
                            </li>
                        </ul>

                        {/* Payment Info (if required) */}
                        {contract.requirePayment && !signedSuccessfully && (
                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-md p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-blue-800">Payment Required</h3>
                                        <p className="mt-2 text-sm text-blue-700">
                                            This contract requires a payment of {contract.paymentAmount} {contract.paymentCurrency}.
                                            You will be prompted to complete the payment after signing.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Expiry Warning */}
                        {contract.expiryDate && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-md p-4">
                                <div className="flex">
                                    <ExclamationIcon className="h-5 w-5 text-yellow-400" />
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700">
                                            This contract must be signed before{" "}
                                            {new Date(contract.expiryDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContractSign;