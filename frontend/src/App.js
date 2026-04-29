// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import AdminDashboard from './AdminDashboard';
import MasterDashboard from './MasterDashboard';
import PlanManager from './PlanManager';
import Login from './Login';
import DisplayScreen from './DisplayScreen';
import Signup from './Signup';

// --- Icons ---
const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);


function AdminPanel() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Modern Loading Screen ---
    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0c29', color: 'white', fontFamily: 'Inter, sans-serif' }}>
                <style>{`
                    .loader { border: 4px solid rgba(255,255,255,0.1); border-left-color: #667eea; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
                <div style={{ textAlign: 'center' }}>
                    <div className="loader" style={{ margin: '0 auto 15px' }}></div>
                    <p style={{ opacity: 0.7 }}>Initializing AI Core...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Styles for the App Layout */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
                body { margin: 0; font-family: 'Inter', sans-serif; }

                /* Header / Navigation Bar */
                .app-navbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 30px;
                    background: rgba(15, 12, 41, 0.95); /* Matches the dark theme */
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    backdrop-filter: blur(10px);
                }

                .brand-logo {
                    font-size: 1.2rem;
                    font-weight: 700;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: 1px;
                }

                .user-controls {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #a0a0a0;
                    font-size: 0.9rem;
                }

                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: rgba(255, 107, 107, 0.15);
                    color: #ff6b6b;
                    border: 1px solid rgba(255, 107, 107, 0.2);
                    padding: 8px 16px;
                    border-radius: 30px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .logout-btn:hover {
                    background: rgba(255, 107, 107, 0.25);
                    box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
                    transform: translateY(-1px);
                }
            `}</style>

            {user ? (
                <>
                    {/* --- Top Navigation Bar --- */}
                    <nav className="app-navbar">
                        <div className="brand-logo">DIGITAL  ELIXIR</div>

                        <div className="user-controls">
                            {/* Naya Master Link */}
                            <Link to="/master" style={{ color: '#667eea', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                Master Login
                            </Link>

                            <button onClick={() => auth.signOut()} className="logout-btn">
                                <LogoutIcon /> Logout
                            </button>
                        </div>
                    </nav>

                    {/* --- Main Dashboard Content --- */}
                    <AdminDashboard />
                </>
            ) : (
                /* --- Login Component --- */
                <Login setUser={setUser} />
            )}
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminPanel />} />
                <Route path="/master" element={<MasterDashboard />} /> {/* Naya Route */}
                <Route path="/master/plans" element={<PlanManager />} /> {/* Naya Route */}
                <Route path="/display/:deviceId" element={<DisplayScreen />} />
                <Route path="/display" element={<DisplayScreen />} />
                <Route path="/Signup" element={<Signup />} />
            </Routes>
        </Router>
    );
}

export default App;