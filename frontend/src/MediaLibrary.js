import React, { useState } from 'react';
import axios from 'axios';
import { auth } from './firebase';

function MediaLibrary({ ads, refresh, showStatus, backendUrl }) {
    const [formData, setFormData] = useState({ title: '', order: 1, duration: 10, file: null });
    const [loading, setLoading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!formData.file) return showStatus("Select a file", "error");

        setLoading(true);
        showStatus("Uploading...", "loading");

        try {
            const token = await user.getIdToken();
            const data = new FormData();
            data.append('title', formData.title);
            data.append('order', formData.order);
            data.append('duration', formData.duration);
            data.append('file', formData.file);

            await axios.post(`${backendUrl}/api/ads`, data, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            
            showStatus("Media Uploaded!");
            setFormData({ title: '', order: 1, duration: 10, file: null });
            refresh();
        } catch (err) { showStatus("Upload failed", "error"); }
        finally { setLoading(false); }
    };

    const deleteAd = async (id) => {
        if (!window.confirm("Delete this media?")) return;
        try {
            const token = await auth.currentUser.getIdToken();
            await axios.delete(`${backendUrl}/api/ads/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            showStatus("Deleted");
            refresh();
        } catch (err) { showStatus("Delete failed", "error"); }
    };

    return (
        <div className="media-container">
            <div className="glass-panel upload-section">
                <h3>☁️ Upload Media</h3>
                <form onSubmit={handleUpload} className="upload-grid">
                    <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                    <input type="number" placeholder="Order" value={formData.order} onChange={e => setFormData({...formData, order: e.target.value})} />
                    <input type="number" placeholder="Duration (sec)" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                    <input type="file" onChange={e => setFormData({...formData, file: e.target.files[0]})} required />
                    <button type="submit" disabled={loading} className="btn btn-primary">Upload</button>
                </form>
            </div>

            <div className="glass-panel list-section">
                <h3>📚 Media Files</h3>
                <table className="custom-table">
                    <thead><tr><th>Order</th><th>Title</th><th>Duration</th><th>Action</th></tr></thead>
                    <tbody>
                        {ads.map(ad => (
                            <tr key={ad._id}>
                                <td>{ad.order}</td>
                                <td>{ad.title}</td>
                                <td>{ad.duration}s</td>
                                <td><button onClick={() => deleteAd(ad._id)} className="btn-del">Delete</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MediaLibrary;