import React from 'react';

function ThankYou() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
                <p className="text-gray-600 mb-6">
                    The contract has been signed successfully. You can close this window now.
                </p>
                <button
                    onClick={() => window.close()}
                    className="text-indigo-600 hover:text-indigo-500"
                >
                    Close Window
                </button>
            </div>
        </div>
    );
}

export default ThankYou;