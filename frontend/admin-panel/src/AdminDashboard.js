import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { auth } from './firebase';
import { sendPasswordResetEmail } from "firebase/auth";
import io from 'socket.io-client';

const BACKEND_URL = 'http://76.13.192.122:5000';
const api = axios.create({ baseURL: BACKEND_URL });
const socket = io(BACKEND_URL);


api.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

const Icons = {
    Ad: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
    Playlist: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    Upload: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    Edit: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Delete: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    Live: () => <span className="live-pulse"></span>,
    Logout: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    External: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
    Menu: () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
    Key: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5z" /></svg>,
};

function AdminDashboard() {
    const [ads, setAds] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [activeTab, setActiveTab] = useState('ads');
    const [status, setStatus] = useState({ message: '', type: '' });
    const [uploading, setUploading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [screenKeys, setScreenKeys] = useState([]);

    // Form States
    const [title, setTitle] = useState('');
    const [order, setOrder] = useState(0);
    const [duration, setDuration] = useState(10);
    const [file, setFile] = useState(null);
    const [isEditingAd, setIsEditingAd] = useState(false);
    const [editAdId, setEditAdId] = useState(null);

    const [playlistName, setPlaylistName] = useState('');
    const [selectedAdIds, setSelectedAdIds] = useState([]);
    const [isEditingPlaylist, setIsEditingPlaylist] = useState(false);
    const [editPlaylistId, setEditPlaylistId] = useState(null);
    const handleResetPassword = async () => {
        const email = auth.currentUser?.email;
        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("Password reset link sent to your email!");
                setShowMenu(false);
            } catch (error) {
                alert("Error: " + error.message);
            }
        }
    };

    const showStatus = (msg, type = 'success') => {
        setStatus({ message: msg, type });
        if (type !== 'loading') setTimeout(() => setStatus({ message: '', type: '' }), 4000);
    };

    const fetchAds = useCallback(async () => {
        try {
            const res = await api.get('/api/ads');
            setAds(res.data.sort((a, b) => a.order - b.order));
        } catch (e) { console.error("Fetch Ads Error:", e); }
    }, []);

    const fetchPlaylists = useCallback(async () => {
        try {
            const res = await api.get('/api/playlists');
            setPlaylists(res.data);
        } catch (e) { console.error("Fetch Playlists Error:", e); }
    }, []);

    const fetchScreenKeys = useCallback(async () => {
        try {
            const res = await api.get('/api/screens/my-keys');
            setScreenKeys(res.data);
        } catch (e) { console.error("Fetch Keys Error:", e); }
    }, []);

   useEffect(() => {
    // 1. Auth state listener setup
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            // Saare data calls ek hi baar mein
            fetchAds();
            fetchPlaylists();
            fetchScreenKeys(); 
            socket.emit('register_device', user.uid);
        } else {
            // Agar user logged out hai toh home page par bhejein
            window.location.href = '/';
        }
    });

    // 2. Socket listener setup
    socket.on('force_logout', (data) => {
        alert(data.message || "Your account has been suspended.");
        auth.signOut();
    });

    // 3. Cleanup function (bohot important hai memory leaks rokne ke liye)
    return () => {
        unsubscribe();
        socket.off('force_logout');
    };
}, [fetchAds, fetchPlaylists, fetchScreenKeys]);

    const handleOpenDisplay = () => {
        const uid = auth.currentUser?.uid;
        if (uid) window.open(`/display?userId=${uid}`, '_blank');
        else showStatus('User not authenticated', 'error');
    };
    const resetAdForm = () => { setIsEditingAd(false); setEditAdId(null); setTitle(''); setOrder(0); setDuration(10); setFile(null); };

    const handleAdSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        showStatus('Processing...', 'loading');
        const formData = new FormData();
        formData.append('title', title);
        formData.append('order', order);
        formData.append('duration', duration);
        if (file) formData.append('file', file);

        try {
            if (isEditingAd) await api.put(`/api/ads/${editAdId}`, formData);
            else await api.post('/api/ads', formData);
            showStatus('Media Library Updated!');
            fetchAds(); resetAdForm();
        } catch (err) { showStatus('Upload Failed', 'error'); }
        finally { setUploading(false); }
    };

    const handlePlaylistSubmit = async (e) => {
        e.preventDefault();
        if (selectedAdIds.length === 0) return showStatus('Select media first', 'error');
        showStatus('Saving Playlist...', 'loading');
        try {
            const payload = { name: playlistName, adIds: selectedAdIds };
            if (isEditingPlaylist) await api.put(`/api/playlists/${editPlaylistId}`, payload);
            else await api.post('/api/playlists', payload);
            fetchPlaylists();
            setIsEditingPlaylist(false); setPlaylistName(''); setSelectedAdIds([]);
            showStatus('Playlist Saved!');
        } catch (err) { showStatus('Error saving', 'error'); }
    };

    const handleGoLive = async (id) => {
        showStatus('Activating...', 'loading');
        try {
            await api.put(`/api/playlists/activate/${id}`);
            await fetchPlaylists();
            showStatus('Playlist is now LIVE!');
        } catch (err) { showStatus('Failed to go live', 'error'); }
    };

    return (
        <div className="admin-layout">
            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo-section">
                    <img
                        src="/goldberry_tech.png"
                        alt="Logo"
                        className="centered-logo"
                    />
                </div>
                <nav className="nav-menu">
                    <button className={activeTab === 'ads' ? 'active' : ''} onClick={() => { setActiveTab('ads'); setIsSidebarOpen(false) }}>
                        <Icons.Ad /> <span>Media Library</span>
                    </button>
                    <button className={activeTab === 'playlists' ? 'active' : ''} onClick={() => { setActiveTab('playlists'); setIsSidebarOpen(false) }}>
                        <Icons.Playlist /> <span>Playlists</span>
                    </button>
                   
                    <button onClick={handleOpenDisplay} className="view-screen-btn">
                        <Icons.External /> <span>View Screen</span>
                    </button>
                </nav>
                <button className="logout-btn" onClick={() => auth.signOut()}>
                    <Icons.Logout /> <span>Sign Out</span>
                </button>
            </aside>

            <main className="main-content">
    <header className="top-bar">
        <div className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
            <Icons.Menu />
        </div>
        <h1>
            {activeTab === 'ads' ? 'Media' : activeTab === 'playlists' ? 'Playlists' : 'My Screen Keys'}
        </h1>
        
        <div className="top-actions">
            <div className="user-profile-box" onClick={() => setShowMenu(!showMenu)} style={{ position: 'relative', cursor: 'pointer' }}>
                <span className="user-email-full">{auth.currentUser?.email}</span>
                <div className="user-avatar">
                    {auth.currentUser?.email?.charAt(0).toUpperCase()}
                </div>

                {showMenu && (
                    <div className="profile-dropdown">
                        <button onClick={handleResetPassword}>Reset Password</button>
                        <button onClick={() => auth.signOut()} className="logout-btn">Logout</button>
                    </div>
                )}
            </div>
        </div>
    </header>

    <div className="content-scroll">
        {/* TAB 1: ADS */}
        {activeTab === 'ads' && (
            <div className="view-container">
                <div className="card form-card">
                    <h3>{isEditingAd ? 'Edit Media' : 'Upload Content'}</h3>
                    <form onSubmit={handleAdSubmit}>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Media Title" required />
                        <div className="input-group">
                            <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (s)" required />
                            <input type="number" value={order} onChange={e => setOrder(e.target.value)} placeholder="Order" />
                        </div>
                        <div className="file-input-wrapper">
                            <input type="file" id="file" onChange={e => setFile(e.target.files[0])} required={!isEditingAd} />
                            <label htmlFor="file" style={{display:'block', padding:'10px', border:'1px dashed #444', textAlign:'center', cursor:'pointer'}}>
                                {file ? file.name : 'Choose Video or Image'}
                            </label>
                        </div>
                        <div className="button-group" style={{display:'flex', gap:'10px'}}>
                            <button type="submit" className="btn-primary" disabled={uploading}>
                                <Icons.Upload /> {isEditingAd ? 'Update' : 'Upload'}
                            </button>
                            {isEditingAd && <button type="button" className="btn-primary" onClick={resetAdForm}>Cancel</button>}
                        </div>
                    </form>
                </div>

                <div className="media-grid">
                    {ads.map(ad => (
                        <div className="media-card card" key={ad._id}>
                            <div className="media-preview">
                                {ad.type === 'video' ? <div className="play-hint">▶</div> : <img src={ad.url} alt="" />}
                                <span className="duration-badge">{ad.duration}s</span>
                            </div>
                            <div className="media-info">
                                <h4>{ad.title}</h4>
                                <div className="card-actions">
                                    <button onClick={() => {
                                        setIsEditingAd(true); setEditAdId(ad._id);
                                        setTitle(ad.title); setOrder(ad.order); setDuration(ad.duration);
                                    }}><Icons.Edit /></button>
                                    <button className="del" onClick={async () => {
                                        if (window.confirm('Delete?')) { await api.delete(`/api/ads/${ad._id}`); fetchAds(); }
                                    }}><Icons.Delete /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB 2: PLAYLISTS */}
        {activeTab === 'playlists' && (
            <div className="view-container">
                <div className="card playlist-form">
                    <h3>{isEditingPlaylist ? 'Modify Playlist' : 'New Playlist'}</h3>
                    <div className="flex-form">
                        <input type="text" value={playlistName} onChange={e => setPlaylistName(e.target.value)} placeholder="Playlist Name..." required />
                        <div className="selection-area">
                            <p>Select Media ({selectedAdIds.length})</p>
                            <div className="chip-container">
                                {ads.map(ad => (
                                    <div key={ad._id}
                                        className={`chip ${selectedAdIds.includes(ad._id) ? 'active' : ''}`}
                                        onClick={() => setSelectedAdIds(prev => prev.includes(ad._id) ? prev.filter(id => id !== ad._id) : [...prev, ad._id])}>
                                        {ad.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button onClick={handlePlaylistSubmit} className="btn-primary" style={{ width: '100%' }}>Save Playlist</button>
                    </div>
                </div>

                <div className="playlist-grid">
                    {playlists.map(p => (
                        <div className={`card playlist-card ${p.isActive ? 'live-border' : ''}`} key={p._id}>
                            <div className="p-header">
                                <h4>{p.name}</h4>
                                {p.isActive && <div className="live-tag"><Icons.Live /> LIVE</div>}
                            </div>
                            <p>{p.ads?.length || 0} Items Integrated</p>
                            <div className="p-footer">
                                {!p.isActive && (
                                    <button className="btn-primary" onClick={() => handleGoLive(p._id)}>Go Live</button>
                                )}
                                <button className="btn-icon" onClick={() => {
                                    setIsEditingPlaylist(true); setEditPlaylistId(p._id);
                                    setPlaylistName(p.name); setSelectedAdIds(p.ads.map(a => a._id));
                                }}><Icons.Edit /></button>
                                <button className="btn-icon del" onClick={async () => {
                                    if (window.confirm('Delete?')) { await api.delete(`/api/playlists/${p._id}`); fetchPlaylists(); }
                                }}><Icons.Delete /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB 3: SCREENS (Fixed Logic) */}
        {activeTab === 'screens' && (
            <div className="view-container">
                <div className="card form-card">
                    <h3>Generate New Screen Key</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '15px' }}>One key can only be used on one screen at a time.</p>
                    <button className="btn-primary" onClick={async () => {
                        try {
                            showStatus('Generating...', 'loading');
                            await api.post('/api/screens/generate');
                            fetchScreenKeys();
                            showStatus('Key Generated!');
                        } catch(e) { showStatus('Generation Failed', 'error'); }
                    }}>+ Generate Key</button>
                </div>

                <div className="playlist-grid" style={{ marginTop: '20px' }}>
                    {screenKeys.map(key => (
                        <div className="card" key={key._id} style={{ borderLeft: key.isUsed ? '4px solid #10b981' : '4px solid #94a3b8' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                                <h2 style={{ letterSpacing: '2px', color: '#fff', margin:0 }}>{key.keyValue}</h2>
                                {key.isUsed ? <span className="live-tag">ONLINE</span> : <span style={{ fontSize: '10px', background:'#444', padding:'2px 6px', borderRadius:'4px' }}>UNUSED</span>}
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin:'10px 0' }}>
                                {key.isUsed ? `Linked to: ${key.deviceName || 'Unknown Device'}` : 'Not paired yet'}
                            </p>
                            <button className="del" style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding:'8px', borderRadius:'6px', cursor: 'pointer', width:'100%' }}
                                onClick={async () => {
                                    if (window.confirm('Revoke this key? Screen will stop working.')) {
                                        await api.delete(`/api/screens/${key._id}`);
                                        fetchScreenKeys();
                                    }
                                }}>Revoke Key</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
</main>

            {status.message && (
                <div className={`toast ${status.type}`}>
                    {status.message}
                </div>
            )}

            <style>{`
                :root {
                    --bg-page: #0a0c10; --sidebar: #12151c; --card: #1c212c;
                    --primary: #4f46e5; --accent: #818cf8; --danger: #ef4444;
                    --text: #f1f5f9; --text-dim: #94a3b8; --radius: 12px;
                    --glass: rgba(255, 255, 255, 0.03);
                }
                    /* Container ko pura width dena aur content center karna */
.logo-section {
    display: flex;
    flex-direction: column; /* Text ko logo ke niche lane ke liye */
    align-items: center;    /* Sab kuch center karne ke liye */
    justify-content: center;
    gap: 8px;              /* Logo aur text ke bich ka gap */
    background: white;
    border-radius: 16px;
    padding: 15px;         /* Thoda space andar ki taraf */
    margin-bottom: 15px;
    width: 100%;           /* Container ki width */
    box-sizing: border-box;
}

.centered-logo {
    width: 160px;
    height: auto;          /* Height auto rakhein taaki aspect ratio kharab na ho */
    max-height: 80px;
    object-fit: contain;
    display: block;
}

.tagline-text {
    font-size: 7px;
    font-weight: 900;
    color: #000;        /* Professional Dark Grey */
    letter-spacing: 1px;
    text-align: center;
    line-height: 1.2;
}



                * { box-sizing: border-box; transition: all 0.2s ease; }
                body { margin: 0; background: var(--bg-page); color: var(--text); font-family: 'Inter', sans-serif; }
                
                .admin-layout { display: flex; height: 91vh; position: relative; overflow: hidden; }

                /* Sidebar Responsive */
                .sidebar { 
                    width: 260px; background: var(--sidebar); display: flex; flex-direction: column; 
                    padding: 25px; border-right: 1px solid var(--glass); z-index: 1000;
                }
                
                @media (max-width: 768px) {
                    .sidebar {
                        position: absolute; left: -260px; height: 100%; transition: 0.3s;
                    }
                    .sidebar.open { left: 0; }
                    .sidebar-overlay {
                        position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; backdrop-filter: blur(2px);
                    }
                    .desktop-only { display: none; }
                }

                .logo-section { display: flex; align-items: center;  justify-content: center; margin-bottom: 25px; }
                .logo-icon { background: var(--primary); width: 35px; height: 35px; border-radius: 8px; display: grid; place-items: center; font-weight: 800; }

                .nav-menu { flex: 1; display: flex; flex-direction: column; gap: 8px; }
                .nav-menu button { 
                    background: transparent; border: none; color: var(--text-dim); padding: 12px 15px; 
                    border-radius: var(--radius); display: flex; align-items: center; gap: 12px; cursor: pointer;
                }
                .nav-menu button.active { background: var(--primary); color: white; }
                .view-screen-btn { border: 1px solid var(--primary) !important; color: var(--accent) !important; margin-top: 10px; }

                /* Main Content */
                .main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
                .top-bar { 
                    padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; 
                    background: rgba(10, 12, 16, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid var(--glass);
                }
                .menu-toggle { display: none; cursor: pointer; }
                @media (max-width: 768px) { .menu-toggle { display: block; } .top-bar h1 { font-size: 1.2rem; } }

                .user-avatar { 
                    width: 35px; height: 35px; background: var(--accent); border-radius: 50%; 
                    display: grid; place-items: center; font-weight: bold; font-size: 14px;
                }

                .content-scroll { padding: 20px; overflow-y: auto; flex: 1; }
                
                /* Grids */
                .media-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
                    gap: 15px; margin-top: 25px; 
                }
                .playlist-grid { 
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                    gap: 15px; margin-top: 25px; 
                }

                @media (max-width: 480px) {
                    .media-grid { grid-template-columns: 1fr 1fr; }
                    .playlist-grid { grid-template-columns: 1fr; }
                    .content-scroll { padding: 15px; }
                }

                .card { background: var(--card); border-radius: var(--radius); padding: 15px; border: 1px solid var(--glass); }
                .form-card { max-width: 500px; margin: 0 auto; }
                
                input { 
                    background: #0f1219; border: 1px solid var(--glass); padding: 12px; 
                    border-radius: 8px; color: white; width: 100%; margin-bottom: 12px; font-size: 16px; 
                }
                .input-group { display: flex; gap: 10px; }
                
                .btn-primary { 
                    background: var(--primary); border: none; color: white; padding: 12px 20px; 
                    border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; 
                    align-items: center; justify-content: center; gap: 8px; margin-top: 10px;
                }

                .media-preview { height: 110px; background: #000; border-radius: 8px; position: relative; overflow: hidden; }
                .media-preview img { width: 100%; height: 100%; object-fit: cover; }
                .duration-badge { position: absolute; bottom: 5px; right: 5px; background: rgba(0,0,0,0.7); font-size: 10px; padding: 2px 5px; border-radius: 4px; }

                .card-actions { display: flex; gap: 10px; margin-top: 10px; }
                .card-actions button, .btn-icon { 
                    background: var(--glass); border: none; color: white; padding: 8px; 
                    border-radius: 6px; cursor: pointer; flex: 1; display: grid; place-items: center;
                }
                .del { color: var(--danger) !important; }

                /* Playlist Specific */
                .p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .p-footer { display: flex; gap: 8px; margin-top: 15px; }
                .chip-container { 
                    display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; 
                    max-height: 120px; overflow-y: auto; padding: 10px; background: #0f1219; border-radius: 8px;
                }
                .chip { background: var(--glass); padding: 5px 12px; border-radius: 15px; font-size: 12px; cursor: pointer; }
                .chip.active { background: var(--primary); }

                .toast { 
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); 
                    padding: 12px 25px; border-radius: 8px; background: var(--primary); 
                    z-index: 2000; white-space: nowrap; font-size: 14px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                .live-pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse 1.5s infinite; }
                @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
            .user-profile-box{
            display: flex; align-items: center;justify-content: center; gap: 10px;}
            .profile-dropdown {
    position: absolute;
    top: 110%; /* Avatar ke thik niche */
    right: 0;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 1000;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.profile-dropdown button {
    background: none;
    border: none;
    color: #e2e8f0;
    padding: 8px 12px;
    text-align: left;
    cursor: pointer;
    font-size: 0.9rem;
    border-radius: 4px;
    transition: 0.2s;
}

.profile-dropdown button:hover {
    background: #30363d;
    color: #58a6ff;
}

.logout-btn:hover {
    color: #f85149 !important; /* Logout par red hover */
}
            `}</style>

        </div>
    );
}

export default AdminDashboard;