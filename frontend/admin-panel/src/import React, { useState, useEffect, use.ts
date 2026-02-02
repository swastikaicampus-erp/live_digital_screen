import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FaArrowRotateRight, FaArrowRotateLeft } from "react-icons/fa6"; // Right and Left Rotation Icons
import { RxTrackNext, RxTrackPrevious } from "react-icons/rx";
import { FaPlay, FaPause } from "react-icons/fa";

// --- CONFIGURATION ---
const BACKEND_URL = 'http://76.13.192.122:5000';
const API_ACTIVE_PLAYLIST_URL = `${BACKEND_URL}/api/playlists/active`;
const MY_DEVICE_ID = 'SCREEN-01'; 
const socket = io(BACKEND_URL);
const HIDE_TIMEOUT_MS = 3000; 

function DisplayScreen() {
    const [ads, setAds] = useState([]);
    const [playlistName, setPlaylistName] = useState('Checking...');
    const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [volume, setVolume] = useState(0.5); 
    const [isMuted, setIsMuted] = useState(true);
    const [showControls, setShowControls] = useState(true); 
    // ✅ Updated: रोटेशन को डिग्री में ट्रैक करें
    const [rotationDegree, setRotationDegree] = useState(0); 

    const timerRef = useRef(null);
    const videoRef = useRef(null);
    const hideControlsTimer = useRef(null); 

    // --- Core Logic ---

    // कंट्रोल्स दिखाने/छिपाने का टाइमर
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);

        // अगर वीडियो चल रहा है, तो 3 सेकंड बाद कंट्रोल्स छिपा दें
        if (isPlaying) {
            hideControlsTimer.current = setTimeout(() => {
                setShowControls(false);
            }, HIDE_TIMEOUT_MS);
        }
    }, [isPlaying]);

    // Play/Pause Logic
    const togglePlayPause = useCallback(() => {
        const video = videoRef.current;
        
        if (video && video.tagName === 'VIDEO') {
            if (video.paused) {
                video.play().then(() => {
                    setIsPlaying(true);
                    resetHideTimer();
                }).catch(e => console.error("Play error:", e));
            } else {
                video.pause();
                setIsPlaying(false);
                setShowControls(true); 
                if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
            }
        } else {
            // इमेज के लिए
            setIsPlaying(prev => !prev);
        }
    }, [resetHideTimer]);

    // Volume Change Logic
    const handleVolumeChange = useCallback((e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        
        const video = videoRef.current;
        if (video) {
            video.volume = newVolume;
            if (newVolume > 0 && isMuted) {
                video.muted = false;
                setIsMuted(false);
            }
        }
        resetHideTimer();
    }, [isMuted, resetHideTimer]);

    // Mute Toggle Logic
    const handleMuteToggle = useCallback(() => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        
        const video = videoRef.current;
        if (video) {
            video.muted = newMutedState;
            if (!newMutedState && volume === 0) {
                 setVolume(0.5);
                 video.volume = 0.5;
            }
        }
        resetHideTimer();
    }, [isMuted, volume, resetHideTimer]);

    // ✅ Rotate Right Logic (Clockwise)
    const rotateRight = useCallback(() => {
        setRotationDegree(prevDegree => (prevDegree + 90) % 360);
        resetHideTimer();
    }, [resetHideTimer]);

    // ✅ Rotate Left Logic (Counter-Clockwise)
    const rotateLeft = useCallback(() => {
        setRotationDegree(prevDegree => (prevDegree - 90 + 360) % 360);
        resetHideTimer();
    }, [resetHideTimer]);

    // Next Ad
    const goToNextAd = useCallback(() => {
        if (ads.length === 0) return;
        setCurrentAdIndex(prevIndex => (prevIndex + 1) % ads.length);
        resetHideTimer(); 
    }, [ads.length, resetHideTimer]);

    // Previous Ad
    const goToPrevAd = useCallback(() => {
        if (ads.length === 0) return;
        setCurrentAdIndex(prev => (prev - 1 + ads.length) % ads.length);
        resetHideTimer();
    }, [ads.length, resetHideTimer]);
    
    // Playlist Start Logic
    const setAndStartPlaylist = useCallback((newAds, newName, newId) => {
        setPlaylistName(newName || 'No Active Playlist');
        setAds(newAds || []);
        setCurrentPlaylistId(newId);
        setCurrentAdIndex(0);
        setIsPlaying(true);
        setShowControls(true); 
        
        setTimeout(() => {
            const video = videoRef.current;
            if (video) {
                video.load();
                video.play().catch(() => {});
                video.volume = volume;
                video.muted = isMuted;
            }
        }, 100);
        
        resetHideTimer();
    }, [volume, isMuted, resetHideTimer]);

    // Fetch Active Playlist
    const fetchActiveAds = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_ACTIVE_PLAYLIST_URL);
            const { name, ads: fetchedAds, playlistId } = response.data;

            if (currentPlaylistId !== playlistId || fetchedAds.length !== ads.length) {
                setAndStartPlaylist(fetchedAds, name, playlistId);
            }
        } catch (error) {
            console.error(`Error:`, error); 
            setAds([]);
            setPlaylistName('Error fetching playlist');
        } finally {
            setLoading(false);
        }
    }, [currentPlaylistId, ads.length, setAndStartPlaylist]);

    // Remote Control Logic
    const handleRemoteAction = useCallback((action) => {
        const video = videoRef.current;
        switch (action) {
            case 'RELOAD': window.location.reload(); break;
            case 'PLAY_PAUSE': togglePlayPause(); break;
            case 'NEXT': goToNextAd(); break;
            case 'PREV': goToPrevAd(); break;
            case 'VOL_UP': 
                if (video) {
                    const newVol = Math.min(1, video.volume + 0.1);
                    video.volume = newVol;
                    setVolume(newVol);
                }
                break;
            case 'VOL_DOWN': 
                if (video) {
                    const newVol = Math.max(0, video.volume - 0.1);
                    video.volume = newVol;
                    setVolume(newVol);
                }
                break;
            case 'MUTE': handleMuteToggle(); break;
            case 'ROTATE_RIGHT': rotateRight(); break; // ✅ Remote action for right rotate
            case 'ROTATE_LEFT': rotateLeft(); break;   // ✅ Remote action for left rotate
            default: break;
        }
    }, [togglePlayPause, goToNextAd, goToPrevAd, handleMuteToggle, rotateRight, rotateLeft]);

    // Socket Setup
    useEffect(() => {
        fetchActiveAds();
        socket.emit('register_device', MY_DEVICE_ID);
        const handleAdminCommand = (data) => {
            if (data.targetId && data.targetId !== MY_DEVICE_ID) return;
            if (data.command === 'UPDATE_PLAYLIST') {
                setAndStartPlaylist(data.payload.playlist.ads, `Real-Time Update: ${data.payload.playlist.name}`, data.payload.playlist._id);
            } else if (data.command === 'REMOTE_CONTROL') {
                handleRemoteAction(data.payload.action);
            } else if (data.command === 'RELOAD') window.location.reload();
        };
        socket.on('admin_command', handleAdminCommand);
        socket.on('active-playlist-updated', fetchActiveAds);
        return () => {
            socket.off('admin_command', handleAdminCommand);
            socket.off('active-playlist-updated', fetchActiveAds);
            if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        };
    }, [fetchActiveAds, handleRemoteAction, setAndStartPlaylist]);

    // Auto Next Logic (Timer)
    useEffect(() => {
        if (ads.length === 0 || loading || !isPlaying) return; 
        const currentAd = ads[currentAdIndex];
        if (timerRef.current) clearTimeout(timerRef.current);

        if (currentAd.type === 'image') {
            const duration = (currentAd.duration || 10) * 1000;
            timerRef.current = setTimeout(goToNextAd, duration);
        }
        return () => clearTimeout(timerRef.current);
    }, [ads, currentAdIndex, loading, goToNextAd, isPlaying]);


    // UI Rendering
    if (loading) return <div style={loaderStyle}>Loading...</div>;
    if (ads.length === 0) return <div style={loaderStyle}>⚠️ No Active Playlist</div>;

    const currentAd = ads[currentAdIndex];
    const mediaUrl = currentAd?.url?.startsWith('http') ? currentAd.url : `${BACKEND_URL}/${currentAd?.url}`;

    const getVolumeIcon = () => {
        if (isMuted || volume === 0) return '🔇';
        if (volume > 0) return '🔊'; // 0 से ऊपर कुछ भी 🔊
        return '🔇';
    };

    const isRotated90or270 = rotationDegree === 90 || rotationDegree === 270;

    return (
        // ✅ Outer Wrapper (Fixes Scrollbars & Rotation Clipping)
        <div style={outerContainerStyle}>
            
            <style>{`
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
                * { box-sizing: border-box; }
                .hide-cursor { cursor: none !important; }
                /* Range Slider Color */
                input[type=range] { accent-color: #ff0000; cursor: pointer; }
            `}</style>

            {/* ✅ Rotatable Container */}
            <div 
                style={{
                    ...innerRotatableStyle,
                    // रोटेशन डिग्री लागू करें
                    transform: `rotate(${rotationDegree}deg)`, 
                    // 90 और 270 डिग्री पर चौड़ाई और ऊँचाई पलट जाती है
                    width: isRotated90or270 ? '100vh' : '100vw',
                    height: isRotated90or270 ? '100vw' : '100vh',
                }}
                onMouseMove={resetHideTimer}
                onTouchStart={resetHideTimer}
            >
                {/* Media Element */}
                {currentAd.type === 'image' ? (
                    <img src={mediaUrl} alt="" style={mediaStyle} />
                ) : (
                    <video
                        ref={videoRef}
                        key={mediaUrl}
                        src={mediaUrl}
                        style={mediaStyle}
                        muted={isMuted} 
                        playsInline
                        autoPlay={true}
                        onEnded={goToNextAd} 
                    />
                )}

                {/* ✅ Click Overlay (For Main Screen Play/Pause) */}
                <div 
                    style={mediaOverlayStyle} 
                    onClick={togglePlayPause} 
                    className={showControls ? '' : 'hide-cursor'} 
                >
                    {!isPlaying && <div style={centerPlayIconStyle}><FaPlay size={100} color="rgba(255, 255, 255, 0.8)"/></div>}
                </div>

                {/* ✅ Controls Bar */}
                <div 
                    style={{
                        ...controlsBarContainer,
                        opacity: showControls ? 1 : 0, 
                        transform: showControls ? 'translateY(0)' : 'translateY(100%)',
                    }}
                    onMouseEnter={() => setShowControls(true)}
                    // यह लाइन बहुत महत्वपूर्ण है: कंट्रोल बार पर क्लिक को पीछे के वीडियो पर जाने से रोकती है
                    onClick={(e) => e.stopPropagation()} 
                >
                    {/* Left Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        
                        <button style={controlButton} onClick={togglePlayPause}>
                            {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
                        </button>
                        
                        <div style={volumeContainer}>
                            <span onClick={handleMuteToggle} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>
                                {getVolumeIcon()}
                            </span>
                           
                        </div>
                    </div>

                    {/* Middle Info */}
                    <span style={infoStyle}>
                        {playlistName.substring(0, 20)}.. ({currentAdIndex + 1}/{ads.length})
                    </span>

                    {/* Right Group: Rotation Buttons added */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* ✅ Left Rotate Button (Counter-Clockwise) */}
                        <button style={controlButton} onClick={rotateLeft}>
                             <FaArrowRotateLeft /> 
                        </button>
                        
                        <button style={controlButton} onClick={goToPrevAd}><RxTrackPrevious /></button>
                        <button style={controlButton} onClick={goToNextAd}><RxTrackNext /></button>
                        
                        {/* ✅ Right Rotate Button (Clockwise) */}
                        <button style={controlButton} onClick={rotateRight}>
                            <FaArrowRotateRight />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- STYLES ---

const outerContainerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    overflow: 'hidden', 
    zIndex: 0
};

const innerRotatableStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    transition: 'all 0.5s ease',
    transformOrigin: 'center center',
    translate: '-50% -50%',
};

const loaderStyle = {
    width: '100vw', height: '100vh', display: 'flex', 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#000', color: '#fff', fontSize: '1.5rem'
};

const mediaStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain', 
    maxHeight: '100vh',
    maxWidth: '100vw'
};

const mediaOverlayStyle = {
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: '100%',
    zIndex: 10, 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
};

const centerPlayIconStyle = {
    pointerEvents: 'none', 
};

// Controls Bar
const controlsBarContainer = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    minHeight: '60px',
    display: 'flex',
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', 
    color: 'white',
    zIndex: 100, // Overlay से ऊपर
    transition: 'opacity 0.3s, transform 0.3s',
    pointerEvents: 'auto', // यह सुनिश्चित करता है कि बटन क्लिकेबल हों
};

const controlButton = {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    cursor: 'pointer',
    flexShrink: 0,
};

const volumeContainer = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
};

const volumeSliderStyle = {
    width: '80px',
    height: '4px',
    cursor: 'pointer',
};

const infoStyle = {
    fontSize: '0.9rem',
    color: '#ddd',
    margin: '0 10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '150px' 
};

export default DisplayScreen;