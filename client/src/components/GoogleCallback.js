import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function GoogleCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    useEffect(() => {
        const handleCallback = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get('token');

            if (!token) {
                console.error('No token received');
                navigate('/login');
                return;
            }

            try {
                const response = await fetch('http://localhost:5001/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to get user data');
                }

                const userData = await response.json();
                login(userData, token);
                navigate('/');
            } catch (error) {
                console.error('Authentication error:', error);
                navigate('/login');
            }
        };

        handleCallback();
    }, [location, login, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-semibold">Authenticating...</h2>
                <p className="mt-2 text-gray-600">Please wait</p>
            </div>
        </div>
    );
}

export default GoogleCallback;