import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import GoogleCallback from './components/GoogleCallback';
import Home from './components/Home';
import ContractList from './components/ContractList';
import ContractForm from './components/ContractForm';
import ContractView from './components/ContractView';
import ContractSign from './components/ContractSign';
import PrivateRoute from './components/PrivateRoute';
import ThankYou from './components/Thankyou';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/google-callback" element={<GoogleCallback />} />
                        <Route path="/sign/:signingKey" element={<ContractSign />} />
                        <Route path="/thank-you" element={<ThankYou />} />

                        {/* Protected Routes */}
                        <Route path="/" element={
                            <PrivateRoute>
                                <Home />
                            </PrivateRoute>
                        } />
                        <Route path="/contracts" element={
                            <PrivateRoute>
                                <ContractList />
                            </PrivateRoute>
                        } />
                        <Route path="/contracts/new" element={
                            <PrivateRoute>
                                <ContractForm />
                            </PrivateRoute>
                        } />
                        <Route path="/contracts/:id" element={
                            <PrivateRoute>
                                <ContractView />
                            </PrivateRoute>
                        } />

                        {/* Catch-all redirect */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;