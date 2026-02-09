// src/AdForm.js
import React, { useState } from 'react';
import axios from 'axios';
import { auth } from './firebase'; 

const BACKEND_URL = 'http://76.13.192.122:5000/api/ads';

function AdForm() {
    const [title, setTitle] = useState('');
    const [order, setOrder] = useState(1);
    const [duration, setDuration] = useState(10);
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. Check if user is logged in
        const user = auth.currentUser;
        if (!user) {
            setStatus('Error: You must be logged in to upload.');
            return;
        }

        if (!file || !title) {
            setStatus('Please fill all fields and select a file.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('order', order);
        formData.append('duration', duration);
        formData.append('file', file);

        setUploading(true);
        setStatus('Uploading...');

        try {
            // 2. Get the specific ID Token for the backend
            const token = await user.getIdToken();

            // 3. Send Request with Authorization Header
            const response = await axios.post(BACKEND_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}` // <--- KEY FIX: Sending Token
                },
            });

            setStatus(`Upload successful! Ad ID: ${response.data._id}`);
            setTitle(''); // Reset form
            setFile(null);
            setUploading(false);
        } catch (error) {
            console.error(error);
            setStatus('Upload failed: ' + (error.response?.data?.message || error.message));
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Upload New Ad</h2>
            <form onSubmit={handleSubmit}>
                <label>Title:</label>
                <input type="text" placeholder="Ad Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ display: 'block', width: '100%', margin: '5px 0 15px', padding: '8px' }} />
                
                <label>Order (Sequence):</label>
                <input type="number" placeholder="Order" value={order} onChange={(e) => setOrder(e.target.value)} required style={{ display: 'block', width: '100%', margin: '5px 0 15px', padding: '8px' }} />
                
                <label>Duration (Seconds):</label>
                <input type="number" placeholder="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} required style={{ display: 'block', width: '100%', margin: '5px 0 15px', padding: '8px' }} />
                
                <label>Media File (Image/Video):</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} required style={{ display: 'block', margin: '10px 0 20px' }} />
                
                <button type="submit" disabled={uploading} style={{ padding: '10px 20px', cursor: 'pointer', width: '100%', backgroundColor: uploading ? '#ccc' : '#28a745', color: 'white', border: 'none' }}>
                    {uploading ? 'Uploading...' : 'Upload Ad'}
                </button>
            </form>
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: uploading ? 'orange' : (status.includes('successful') ? 'green' : 'red') }}>
                {status}
            </p>
        </div>
    );
}

export default AdForm;