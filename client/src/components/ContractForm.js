import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

function ContractForm() {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        pdf: null,
        expiryDate: '',
        recipientEmail: '',
        requirePayment: false,
        paymentAmount: '',
        paymentCurrency: 'INR',
        bankDetails: {
            accountHolder: '',
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            upiId: ''
        }
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('pdf', formData.pdf);
        data.append('expiryDate', formData.expiryDate);
        data.append('recipientEmail', formData.recipientEmail);
        data.append('requirePayment', formData.requirePayment);
        
        if (formData.requirePayment) {
            data.append('paymentAmount', formData.paymentAmount);
            data.append('paymentCurrency', formData.paymentCurrency);
            data.append('bankDetails', JSON.stringify(formData.bankDetails));
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/contracts`, {
            method: 'POST',
            body: data,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to create contract');
        }

        navigate('/contracts');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Failed to create contract');
    } finally {
        setLoading(false);
    }
};


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Create New Contract</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                PDF Document
              </label>
              <input
                type="file"
                accept=".pdf"
                required
                className="mt-1 block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-md file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-indigo-50 file:text-indigo-700
                                    hover:file:bg-indigo-100"
                onChange={(e) =>
                  setFormData({ ...formData, pdf: e.target.files[0] })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Recipient Email
              </label>
              <input
                type="email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={formData.recipientEmail}
                onChange={(e) =>
                  setFormData({ ...formData, recipientEmail: e.target.value })
                }
              />
            </div>

            {/* Payment Section */}
            {/* Payment Options Section */}
            <div className="border-t pt-6">
                            <div className="flex items-center mb-4">
                                <input
                                    type="checkbox"
                                    id="requirePayment"
                                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                                    checked={formData.requirePayment}
                                    onChange={e => setFormData({...formData, requirePayment: e.target.checked})}
                                />
                                <label htmlFor="requirePayment" className="ml-2 text-sm font-medium text-gray-700">
                                    Require Payment
                                </label>
                            </div>

                            {formData.requirePayment && (
                                <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    required
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.paymentAmount}
                                                    onChange={e => setFormData({
                                                        ...formData, 
                                                        paymentAmount: e.target.value
                                                    })}
                                                    min="1"
                                                    step="any"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Currency</label>
                                            <select
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                value={formData.paymentCurrency}
                                                onChange={e => setFormData({
                                                    ...formData,
                                                    paymentCurrency: e.target.value
                                                })}
                                            >
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Bank Account Details */}
                                    <div className="border-t pt-4">
                                        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Receipt Details</h3>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.bankDetails.accountHolder}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        bankDetails: {
                                                            ...formData.bankDetails,
                                                            accountHolder: e.target.value
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.bankDetails.accountNumber}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        bankDetails: {
                                                            ...formData.bankDetails,
                                                            accountNumber: e.target.value
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.bankDetails.ifscCode}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        bankDetails: {
                                                            ...formData.bankDetails,
                                                            ifscCode: e.target.value
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                                <input
                                                    type="text"
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.bankDetails.bankName}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        bankDetails: {
                                                            ...formData.bankDetails,
                                                            bankName: e.target.value
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                                                <input
                                                    type="text"
                                                    placeholder="example@upi"
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                                    value={formData.bankDetails.upiId}
                                                    onChange={e => setFormData({
                                                        ...formData,
                                                        bankDetails: {
                                                            ...formData.bankDetails,
                                                            upiId: e.target.value
                                                        }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate("/contracts")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Contract"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContractForm;
