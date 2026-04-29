import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FaArrowRotateRight, FaArrowRotateLeft, FaPlay, FaPause } from "react-icons/fa6";
import { RxTrackNext, RxTrackPrevious } from "react-icons/rx";

// --- CONFIGURATION ---
const BACKEND_URL = 'https://my-signage-backend.onrender.com';
const socket = io(BACKEND_URL);
const HIDE_TIMEOUT_MS = 4000; // 4 seconds of inactivity hides controls

function DisplayScreen() {
    const [ads, setAds] = useState([]);
    const [playlistName, setPlaylistName] = useState('Loading...');
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(true); 
    const [rotationDegree, setRotationDegree] = useState(0); 
    const [userId, setUserId] = useState(null);

    const videoRef = useRef(null);
    const timerRef = useRef(null);
    const hideControlsTimer = useRef(null);

    // 1. Core Logic: Auto-hide UI
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        if (isPlaying) {
            hideControlsTimer.current = setTimeout(() => {
                setShowControls(false);
            }, HIDE_TIMEOUT_MS);
        }
    }, [isPlaying]);

    // 2. Navigation Actions
    const goToNextAd = useCallback(() => {
        if (ads.length === 0) return;
        setCurrentAdIndex(prev => (prev + 1) % ads.length);
        resetHideTimer();
    }, [ads.length, resetHideTimer]);

    const togglePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
        resetHideTimer();
    }, [resetHideTimer]);

    // 3. Effects: UserID & Socket Listeners
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const id = queryParams.get('userId');
        setUserId(id);

        if (!id) return;

        const fetchAds = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/playlists/active?userId=${id}`);
                setAds(res.data.ads || []);
                setPlaylistName(res.data.name || 'No Active Playlist');
                setLoading(false);
            } catch (e) { console.error(e); setLoading(false); }
        };

        fetchAds();

        socket.on(`active-playlist-updated-${id}`, fetchAds);
        socket.on('admin_command', (data) => {
            if (data.command === 'REMOTE_CONTROL' && data.payload.userId === id) {
                const act = data.payload.action;
                if (act === 'NEXT') goToNextAd();
                if (act === 'PLAY_PAUSE') togglePlayPause();
                if (act === 'ROTATE_RIGHT') setRotationDegree(d => (d + 90) % 360);
                if (act === 'ROTATE_LEFT') setRotationDegree(d => (d - 90 + 360) % 360);
            }
        });

        return () => {
            socket.off(`active-playlist-updated-${id}`);
            socket.off('admin_command');
        };
    }, [userId, goToNextAd, togglePlayPause]);

    // 4. Video Playback Control
    useEffect(() => {
        if (videoRef.current) {
            isPlaying ? videoRef.current.play().catch(e => {}) : videoRef.current.pause();
        }
    }, [isPlaying, currentAdIndex]);

    if (loading) return <div style={fullPageStyle}><h3>Initializing Signage...</h3></div>;

    const currentAd = ads[currentAdIndex];
    const isRotated = rotationDegree === 90 || rotationDegree === 270;

    return (
        <div style={containerStyle} onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
            <style>{`
                :root {
                    --ctrl-btn-size: clamp(60px, 9vmax, 95px);
                }
                body { margin: 0; background: #000; overflow: hidden; font-family: 'Segoe UI', Tahoma, sans-serif; }
                .media-frame { transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
                .ui-bar {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 2.5vmax 5vmax;
                    background: linear-gradient(transparent, rgba(0,0,0,0.85));
                    transition: all 0.5s ease;
                    z-index: 1000;
                }
                .control-btn {
                    width: var(--ctrl-btn-size); height: var(--ctrl-btn-size);
                    border-radius: 50%; border: 2px solid rgba(255,255,255,0.4);
                    background: rgba(255,255,255,0.1); color: white;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.3s;
                    backdrop-filter: blur(5px);
                }
                .control-btn:active { transform: scale(0.9); background: rgba(255,255,255,0.3); }
                .control-btn svg { width: 45%; height: 45%; }
                .playlist-info { color: #fff; font-size: 1.8vmax; font-weight: 500; text-shadow: 2px 2px 5px #000; }
            `}</style>

            <div 
                className="media-frame"
                style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: `translate(-50%, -50%) rotate(${rotationDegree}deg)`,
                    width: isRotated ? '100vh' : '100vw',
                    height: isRotated ? '100vw' : '100vh',
                }}
            >
                {ads.length > 0 ? (
                    currentAd?.type === 'video' ? (
                        <video 
                            ref={videoRef}
                            src={currentAd.url}
                            muted={isMuted}
                            playsInline
                            style={mediaStyle}
                            onEnded={goToNextAd}
                        />
                    ) : (
                        <img src={currentAd.url} style={mediaStyle} alt="Signage" />
                    )
                ) : (
                    <div style={fullPageStyle}>No active content.</div>
                )}
            </div>

            {/* RESPONSIVE CONTROLS */}
            <div className="ui-bar" style={{ 
                opacity: showControls ? 1 : 0, 
                transform: showControls ? 'translateY(0)' : 'translateY(100%)' 
            }}>
                <div className="control-btn" onClick={togglePlayPause}>
                    {isPlaying ? <FaPause /> : <FaPlay />}
                </div>

                <div className="playlist-info">
                    {playlistName} • {currentAdIndex + 1}/{ads.length}
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="control-btn" onClick={() => setRotationDegree(d => (d + 90) % 360)}>
                        <FaArrowRotateRight />
                    </div>
                    <div className="control-btn" onClick={goToNextAd}>
                        <RxTrackNext />
                    </div>
                </div>
            </div>
        </div>
    );
}

const containerStyle = { width: '100vw', height: '100vh', background: '#000', position: 'relative' };
const mediaStyle = { width: '100%', height: '100%', objectFit: 'contain' };
const fullPageStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', background: '#000' };

export default DisplayScreen;