import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const MasterDashboard = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [livePlans, setLivePlans] = useState([]);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [newPlan, setNewPlan] = useState({ plan: '', price: '', screens: 1 });

    const [loading, setLoading] = useState(false);

    const [newMasterKey, setNewMasterKey] = useState(''); // ← yeh add karo
    const [isEditingKey, setIsEditingKey] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [selectedUserHistory, setSelectedUserHistory] = useState(null); // History modal ke liye
    const [showHistoryModal, setShowHistoryModal] = useState(false); // Modal toggle ke liye
    const [generatedKey, setGeneratedKey] = useState(null); // Key store karne ke liye
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false); // Modal control ke liye
    const [selectedUser, setSelectedUser] = useState(null);

    const handleViewHistory = (user) => {
        setSelectedUser(user);
        setSelectedUserHistory(user.history || []);
    };
    const generateNewScreenKey = async (uid) => {
        setLoading(true);
        try {
            // Hum URL mein query parameter bhej rahe hain taaki key user se link ho jaye
            const res = await fetch(`${BASE_URL}/api/master/generate-screen-key?uid=${uid}`);
            const data = await res.json();
            if (data.success) {
                setGeneratedKey(data.key);
                setIsKeyModalOpen(true);
            } else {
                alert("Failed to generate key");
            }
        } catch (err) {
            console.error("Key Gen Error:", err);
            alert("Server error. Check if API exists.");
        } finally {
            setLoading(false);
        }
    };
    //const BASE_URL = 'https://my-signage-backend.onrender.com';
    const BASE_URL = 'http://localhost:5000';

    useEffect(() => {
        const auth = sessionStorage.getItem('master_auth');
        if (auth === 'true') setIsAuthorized(true);
    }, []);


    // ✅ REPLACE with:
    const updateMasterKey = async () => {
        if (!newMasterKey) return alert("Please enter a new password");
        const currentPass = prompt("Enter current password to confirm:");
        if (!currentPass) return;
        try {
            const res = await fetch(`${BASE_URL}/api/master/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: currentPass, newPassword: newMasterKey })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ Master Key Updated!");
                setIsEditingKey(false);
            } else {
                alert("❌ " + data.message);
            }
        } catch (err) { alert("Update failed"); }
    };
    useEffect(() => {
        if (isAuthorized) {
            fetchUsers();
            fetchLivePlans();
        }
    }, [isAuthorized]);




    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/master/users`);
            const data = await res.json();
            if (data.success) setUsers(data.users);
        } catch (err) { console.error("Fetch Error:", err); }
        finally { setLoading(false); }
    };

    const fetchLivePlans = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/plans`);
            const data = await res.json();
            setLivePlans(data);
        } catch (err) { console.error("Plans Fetch Error:", err); }
    };

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        suspended: users.filter(u => !u.isActive).length,
        totalScreens: users.reduce((sum, u) => {
            const count = parseInt(u.screens || u.numberOfScreens || 0);
            return sum + (isNaN(count) ? 0 : count);
        }, 0)
    };



    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!passwordInput.trim()) {
            alert("❌ Password enter karein!");
            return;
        }

        try {
            const res = await fetch(`${BASE_URL}/api/master/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordInput })
            });

            const data = await res.json();

            if (data.success) {
                setIsAuthorized(true);
                sessionStorage.setItem('master_auth', 'true');
            } else {
                alert("❌ Incorrect Master Key!");
                setPasswordInput('');
            }
        } catch (err) {
            alert("❌ Server se connect nahi ho paya!");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('master_auth');
        setIsAuthorized(false);
    };

    const toggleStatus = async (uid) => {
        try {
            const res = await fetch(`${BASE_URL}/api/master/toggle-status/${uid}`, { method: 'PUT' });
            const data = await res.json();
            if (data.success) { alert(data.message); fetchUsers(); }
        } catch (err) { alert("Error updating status"); }
    };

    const getStatus = (expiryDate, isActive) => {
        if (!isActive) return { text: 'Suspended', color: '#f6ad55' };
        if (!expiryDate) return { text: 'New User', color: '#a0aec0' };
        const diff = new Date(expiryDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) return { text: 'Expired', color: '#f56565' };
        return { text: `Active (${days}d)`, color: '#48bb78' };
    };

    const handleUpdate = async (uid) => {
        // Validation: Check if plan and price exist
        if (!newPlan.plan || !newPlan.price) return alert("Plan and Price are required");

        const res = await fetch(`${BASE_URL}/api/master/renew-plan/${uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selectedPlan: newPlan.plan,
                planPrice: Number(newPlan.price), // Convert to number
                screens: Number(newPlan.screens)  // Convert to number
            })
        });
        if (res.ok) {
            alert("✅ User Subscription Renewed!");
            setEditingUser(null);
            fetchUsers();
        }
    };

    const handleDelete = async (uid) => {
        if (window.confirm("Delete this user permanently?")) {
            await fetch(`${BASE_URL}/api/master/delete-user/${uid}`, { method: 'DELETE' });
            fetchUsers();
        }
    };

    const filteredUsers = users.filter(u =>
        u.shopName?.toLowerCase().includes(search.toLowerCase()) ||
        u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        u.transactionId?.toLowerCase().includes(search.toLowerCase()) ||
        u.mobile?.includes(search) // Agar mobile field hai toh
    );

    return (
        <div className="admin-root">
            <style>{`
                    .admin-root { min-height: 100vh; background: #0b0e14; color: #e2e8f0; font-family: 'Inter', sans-serif; padding-bottom: 20px; }
                    
                    /* Header & Nav */
                    .top-nav { background: #161b22; padding: 12px 20px; border-bottom: 1px solid #30363d; position: sticky; top: 0; z-index: 100; }
                    .nav-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
                    .nav-brand { font-size: 1.1rem; font-weight: 800; color: #58a6ff; }
                    .nav-links { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; }
                    .nav-link-btn { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 8px 15px; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
                    .nav-link-btn.active { background: #1f6feb; color: white; border-color: #388bfd; }

                    /* Stats - Mobile Optimization */
                    .stats-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 15px; }
                    .stat-card { background: #161b22; border: 1px solid #30363d; padding: 15px; border-radius: 12px; }
                    .stat-card h4 { margin: 0; color: #8b949e; font-size: 0.75rem; text-transform: uppercase; }
                    .stat-card .value { font-size: 1.5rem; font-weight: bold; margin-top: 5px; display: block; }
                    
                    @media (min-width: 768px) {
                        .stats-container { grid-template-columns: repeat(4, 1fr); max-width: 1400px; margin: 0 auto; }
                        .nav-top-row { margin-bottom: 0; }
                        .top-nav { display: flex; align-items: center; justify-content: space-between; padding: 15px 40px; }
                    }

                    /* Search Wrapper */
                    .search-bar-wrapper { padding: 0 15px 15px; }
                    .search-input { width: 100%; box-sizing: border-box; padding: 12px 15px; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; color: white; font-size: 1rem; }

                    /* User Grid */
                    .content-grid { display: grid; grid-template-columns: 1fr; gap: 15px; padding: 0 15px; }
                    @media (min-width: 768px) {
                        .content-grid { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); padding: 0 40px; }
                    }

                    .user-card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 18px; position: relative; }
                    .payment-box { background: #0d1117; padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px solid #30363d; }
                    
                    /* Responsive Buttons */
                    .actions-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; }
                    .action-btn { padding: 12px 10px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
                    .btn-full { grid-column: span 2; }
                    
                    .btn-primary { background: #238636; color: white; }
                    .btn-danger { background: rgba(248,81,73,0.1); border: 1px solid #f85149; color: #f85149; }
                    .btn-outline { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; }

                    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 15px; }
                    .modal { background: #161b22; width: 100%; max-width: 450px; padding: 20px; border-radius: 15px; border: 1px solid #30363d; }
                
                    .nav-links { 
        display: flex; 
        gap: 10px; 
        overflow-x: auto; /* Mobile par side scroll enable karega */
        padding: 5px 0;
        scrollbar-width: none; /* Firefox ke liye scrollbar hide */
        -ms-overflow-style: none; /* IE ke liye */
        -webkit-overflow-scrolling: touch; /* Smooth scrolling for iOS */
    }

    /* Chrome/Safari ke liye scrollbar hide karein */
    .nav-links::-webkit-scrollbar {
        display: none;
    }

    .nav-link-btn { 
        background: #21262d; 
        color: #c9d1d9; 
        border: 1px solid #30363d; 
        padding: 10px 18px; 
        border-radius: 8px; 
        text-decoration: none; 
        font-size: 0.85rem; 
        font-weight: 600; 
        white-space: nowrap; 
        display: flex;
        align-items: center;
        transition: all 0.2s ease;
    }

    .nav-link-btn:active {
        transform: scale(0.95); /* Mobile touch feedback */
    }

    .nav-link-btn.active { 
        background: #1f6feb; 
        color: white; 
        border-color: #388bfd; 
        box-shadow: 0 4px 12px rgba(31, 111, 235, 0.3);
    }
                `}</style>

            {!isAuthorized && (
                <div className="overlay">
                    <form onSubmit={handlePasswordSubmit} className="modal" style={{ textAlign: 'center' }}>
                        <h2 style={{ color: '#58a6ff' }}>🛡️ Admin Login</h2>
                        <input className="search-input" style={{ margin: '20px 0' }} type="password" placeholder="Enter Master Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} autoFocus />
                        <button
                            type="submit"
                            className="action-btn btn-primary btn-full"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            )}


            {isAuthorized && (
                <>
                    <nav className="top-nav">
                        <div className="nav-top-row">
                            <div className="nav-brand">DIGITAL ELIXIR</div>
                            <button onClick={handleLogout} className="action-btn btn-danger" style={{ padding: '5px 12px', fontSize: '0.7rem', marginLeft: '6px' }}>Logout</button>
                        </div>
                        <div className="nav-links">
                            <Link to="/master" className="nav-link-btn active">Users List</Link>
                            <Link to="/master/plans" className="nav-link-btn">⚙️ Plan Manager</Link>
                            {/* Yahan se wo 'u' wala history button hata diya kyunki yahan 'u' nahi milta */}
                            <button
                                onClick={() => setIsEditingKey(true)}
                                className="nav-link-btn"
                                style={{ background: 'transparent', border: '1px dashed #30363d' }}
                            >
                                🔑 Change Key
                            </button>
                        </div>
                    </nav>

                    {/* ... (Stats aur Search bar same rahega) */}

                    <main className="content-grid">
                        {loading ? <p style={{ textAlign: 'center' }}>Loading users...</p> :
                            filteredUsers.map(u => {
                                const status = getStatus(u.expiryDate, u.isActive);
                                return (
                                    <div key={u.uid} className="user-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{u.shopName}</h3>
                                                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#8b949e' }}>{u.fullName}</p>
                                            </div>
                                            <span className="badge" style={{ color: status.color, border: `1px solid ${status.color}`, padding: '4px 10px', height: 'fit-content' }}>
                                                {status.text}
                                            </span>
                                        </div>

                                        <div className="payment-box">
                                            <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>UTR: <span style={{ color: '#58a6ff', fontFamily: 'monospace' }}>{u.transactionId || '---'}</span></div>
                                            {u.paymentScreenshot && (
                                                <button onClick={() => setPreviewImage(u.paymentScreenshot)} className="action-btn btn-outline btn-full" style={{ marginTop: '10px', padding: '6px' }}>View Payment Screenshot</button>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginTop: '10px' }}>
                                            <span>Plan: <b>{u.selectedPlan}</b></span>
                                            <span>Screens: <b style={{ color: '#58a6ff' }}>{u.screens || 1}</b></span>
                                            <span>Paid: <b style={{ color: '#48bb78' }}>₹{u.planPrice}</b></span>
                                        </div>

                                        <div className="actions-group">
                                            <button
                                                onClick={() => handleViewHistory(u)} // Ab ye function sahi se call hoga
                                                className="action-btn btn-outline btn-full"
                                                style={{ borderColor: '#58a6ff', color: '#58a6ff', marginBottom: '5px' }}
                                            >
                                                📜 View Payment History
                                            </button>

                                            <button onClick={() => toggleStatus(u.uid)} className="action-btn btn-outline" style={{ color: u.isActive ? '#f85149' : '#48bb78' }}>
                                                {u.isActive ? 'Suspend' : 'Activate'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setEditingUser(u.uid);
                                                    setNewPlan({
                                                        plan: u.selectedPlan || '',
                                                        price: u.planPrice || '',
                                                        screens: u.screens || 1
                                                    });
                                                }}
                                                className="action-btn btn-outline"
                                            >
                                                Renew Plan
                                            </button>

                                            <button
                                                onClick={() => generateNewScreenKey(u.uid)}
                                                className="action-btn btn-primary btn-full"
                                                style={{ background: '#238636' }}
                                            >
                                                📺 Generate Pairing Key
                                            </button>
                                            <button onClick={() => handleDelete(u.uid)} className="action-btn btn-danger btn-full">Delete Account</button>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </main>
                </>
            )}

            {/* MODALS remain same functionality but with mobile-optimized padding */}
            {previewImage && (
                <div className="overlay" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Proof" style={{ maxWidth: '100%', maxHeight: '80%', borderRadius: '10px' }} />
                </div>
            )}

            {editingUser && (
                <div className="overlay">
                    <div className="modal">
                        <h3>🔄 Renew Subscription</h3>
                        <label style={{ fontSize: '0.8rem', color: '#8b949e' }}>Choose Plan:</label>
                        <select className="search-input" style={{ margin: '10px 0' }} onChange={(e) => {
                            const selected = livePlans.find(p => p.duration === e.target.value);
                            if (selected) setNewPlan({ plan: selected.duration, price: selected.price });
                        }}>
                            {livePlans.map(lp => <option key={lp._id} value={lp.duration}>{lp.name} (₹{lp.price})</option>)}
                            <option value="custom">Custom</option>
                        </select>
                        <input className="search-input" type="text" placeholder="Plan Duration" value={newPlan.plan} onChange={(e) => setNewPlan({ ...newPlan, plan: e.target.value })} style={{ marginBottom: '10px' }} />
                        <input className="search-input" type="number" placeholder="Price" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} />
                        <input
                            className="search-input"
                            type="number"
                            placeholder="Number of Screens"
                            value={newPlan.screens}
                            onChange={(e) => setNewPlan({ ...newPlan, screens: e.target.value })}
                            style={{ marginTop: '10px' }}
                        />
                        <div className="actions-group">
                            <button onClick={() => handleUpdate(editingUser)} className="action-btn btn-primary">Save</button>
                            <button onClick={() => setEditingUser(null)} className="action-btn btn-outline">Cancel</button>

                        </div>
                    </div>
                </div>
            )}
            {isEditingKey && (
                <div className="overlay">
                    <div className="modal">
                        <h3 style={{ color: '#58a6ff' }}>🔐 Update Master Key</h3>
                        <p style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '15px' }}>Enter the new password for Admin Dashboard access.</p>
                        <input
                            className="search-input"
                            type="text"
                            placeholder="New Password"
                            onChange={(e) => setNewMasterKey(e.target.value)}
                        />
                        <div className="actions-group" style={{ marginTop: '20px' }}>
                            <button onClick={updateMasterKey} className="action-btn btn-primary">Save New Key</button>
                            <button onClick={() => setIsEditingKey(false)} className="action-btn btn-outline">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {isKeyModalOpen && (
                <div className="overlay">
                    <div className="modal" style={{ textAlign: 'center' }}>
                        <h3 style={{ color: '#58a6ff' }}>📺 New Screen Pairing Key</h3>
                        <p style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                            Enter this code on the TV/Display screen to link it.
                        </p>

                        <div style={{
                            background: '#0d1117',
                            padding: '20px',
                            borderRadius: '10px',
                            border: '2px dashed #1f6feb',
                            margin: '20px 0',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            letterSpacing: '5px',
                            color: '#48bb78'
                        }}>
                            {generatedKey}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: '#f85149' }}>
                            *This key is valid for one-time use only.
                        </p>

                        <div className="actions-group">
                            <button onClick={() => setIsKeyModalOpen(false)} className="action-btn btn-primary btn-full">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- SUBSCRIPTION HISTORY MODAL --- */}
            {selectedUserHistory && (
                <div className="overlay">
                    <div className="modal" style={{ maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: '#58a6ff' }}>📜 Payment History</h3>
                            <button onClick={() => setSelectedUserHistory(null)} style={{ background: 'none', border: 'none', color: '#f85149', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                            {selectedUserHistory.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#8b949e' }}>No history found.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
                                            <th style={{ textAlign: 'left', padding: '10px' }}>Date</th>
                                            <th style={{ textAlign: 'left', padding: '10px' }}>Plan</th>
                                            <th style={{ textAlign: 'right', padding: '10px' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Reverse loop taaki naya record upar dikhe */}
                                        {[...selectedUserHistory].reverse().map((item, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid #21262d' }}>
                                                <td style={{ padding: '10px' }}>{new Date(item.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <div style={{ fontWeight: 'bold' }}>{item.plan}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#8b949e' }}>{item.screens} Screens</div>
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#48bb78', fontWeight: 'bold' }}>
                                                    ₹{item.price}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <button onClick={() => setSelectedUserHistory(null)} className="action-btn btn-outline btn-full" style={{ marginTop: '20px' }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDashboard;