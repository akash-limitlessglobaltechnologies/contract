// components/PaymentForm.js
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { XCircleIcon } from '@heroicons/react/outline';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function PaymentForm({ contract, onSuccess }) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setProcessing(true);
        setError(null);

        if (!stripe || !elements) {
            return;
        }

        try {
            // Create payment intent
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/payment/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: contract.paymentAmount,
                    currency: contract.paymentCurrency.toLowerCase(),
                    contractId: contract._id
                }),
            });

            const { clientSecret } = await response.json();

            // Confirm card payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                },
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

            onSuccess(result.paymentIntent);
        } catch (err) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Information
                </label>
                <div className="border rounded-md p-3">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '16px',
                                    color: '#424770',
                                    '::placeholder': {
                                        color: '#aab7c4',
                                    },
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <XCircleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Payment failed</h3>
                            <p className="mt-2 text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Amount:</span>
                    <span className="text-sm font-medium text-gray-900">
                        {contract.paymentAmount} {contract.paymentCurrency}
                    </span>
                </div>
            </div>

            <button
                type="submit"
                disabled={!stripe || processing}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                    ${processing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {processing ? 'Processing...' : `Pay ${contract.paymentAmount} ${contract.paymentCurrency}`}
            </button>
        </form>
    );
}

function PaymentWrapper({ contract, onSuccess }) {
    return (
        <Elements stripe={stripePromise}>
            <PaymentForm contract={contract} onSuccess={onSuccess} />
        </Elements>
    );
}

export default PaymentWrapper;