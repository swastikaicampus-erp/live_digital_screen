import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

function PlaylistManager({ ads, playlists, refresh, showStatus, backendUrl }) {
    const [pName, setPName] = useState('');
    const [selectedAds, setSelectedAds] = useState([]);
    const [layout, setLayout] = useState('FULL_SCREEN');
    const [marquee, setMarquee] = useState('');

    const toggleAd = (id) => {
        setSelectedAds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const savePlaylist = async (e) => {
        e.preventDefault();
        if (selectedAds.length === 0) return showStatus("Select at least one ad", "error");

        try {
            const token = await auth.currentUser.getIdToken();
            const payload = { 
                name: pName, 
                adIds: selectedAds, 
                layoutType: layout, 
                marqueeText: marquee 
            };
            await axios.post(`${backendUrl}/api/playlists`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showStatus("Playlist Created!");
            setPName(''); setSelectedAds([]); setMarquee('');
            refresh();
        } catch (err) { showStatus("Failed to save", "error"); }
    };

    const activate = async (id) => {
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.put(`${backendUrl}/api/playlists/activate/${id}`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showStatus("Playlist is LIVE!");
            refresh();
        } catch (err) { showStatus("Activation failed", "error"); }
    };

    return (
        <div className="playlist-container">
            <div className="glass-panel">
                <h3>✨ New Playlist with Layout</h3>
                <form onSubmit={savePlaylist}>
                    <input type="text" placeholder="Playlist Name" value={pName} onChange={e => setPName(e.target.value)} required className="full-input"/>
                    
                    <div className="layout-selector">
                        <label>Select Template:</label>
                        <select value={layout} onChange={e => setLayout(e.target.value)}>
                            <option value="FULL_SCREEN">📺 Full Screen (Photo/Video)</option>
                            <option value="SPLIT_SCREEN">🌓 Split Screen (Half-Half Video)</option>
                            <option value="MARQUEE_LAYOUT">🗞️ Media + Bottom Marquee</option>
                        </select>
                    </div>

                    {layout === 'MARQUEE_LAYOUT' && (
                        <input type="text" placeholder="Enter Marquee Text..." value={marquee} onChange={e => setMarquee(e.target.value)} className="marquee-input" />
                    )}

                    <div className="ad-grid">
                        {ads.map(ad => (
                            <div key={ad._id} className={`ad-card ${selectedAds.includes(ad._id) ? 'active' : ''}`} onClick={() => toggleAd(ad._id)}>
                                {ad.title}
                            </div>
                        ))}
                    </div>
                    <button type="submit" className="btn btn-primary mt-10">Create Playlist</button>
                </form>
            </div>

            <div className="glass-panel">
                <h3>📡 Active Playlists</h3>
                {playlists.map(p => (
                    <div key={p._id} className={`p-item ${p.isActive ? 'live' : ''}`}>
                        <span>{p.name} ({p.layoutType})</span>
                        <div className="p-actions">
                            {!p.isActive && <button onClick={() => activate(p._id)} className="btn-act">Go Live</button>}
                            <button className="btn-del">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PlaylistManager;