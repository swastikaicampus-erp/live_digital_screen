import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FaArrowRotateRight, FaPlay, FaPause, FaEyeSlash, FaLock } from "react-icons/fa6"; 
import { RxTrackNext } from "react-icons/rx";

const getTabId = () => {
  let id = sessionStorage.getItem('tab_unique_id');
  if (!id) {
    id = 'SCREEN-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('tab_unique_id', id);
  }
  return id;
};

const TAB_ID = getTabId();
const BACKEND_URL = 'https://my-signage-backend.onrender.com'; 
const socket = io(BACKEND_URL);
const HIDE_TIMEOUT_MS = 5000;

export default function DisplayScreen() {
  // --- 🟢 NEW PAIRING STATES ---
  const [screenKey, setScreenKey] = useState(sessionStorage.getItem('screen_key') || '');
  const [isPaired, setIsPaired] = useState(false);
  const [pairError, setPairError] = useState('');
  
  // --- Aapki Original States ---
  const [ads, setAds] = useState([]);
  const [playlistName, setPlaylistName] = useState('Initializing...');
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [rotationDegree, setRotationDegree] = useState(0);

  const videoRef = useRef(null);
  const hideControlsTimer = useRef(null);
  const containerRef = useRef(null);

  // --- 🟢 PAIRING HANDLER ---
  const handlePairing = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPairError('');
    try {
      const res = await axios.post(`${BACKEND_URL}/api/screens/verify`, { key: screenKey });
      if (res.data.success) {
        sessionStorage.setItem('screen_key', screenKey);
        sessionStorage.setItem('paired_user_id', res.data.userId); 
        setIsPaired(true);
        window.location.reload(); 
      }
    } catch (err) {
      setPairError(err.response?.data?.message || 'Invalid Screen Key');
    } finally {
      setLoading(false);
    }
  };

  // --- 🟢 FULLSCREEN LOGIC (Original) ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error enabling full-screen: ${e.message}`);
      });
    }
  };

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), HIDE_TIMEOUT_MS);
    }
  }, [isPlaying]);

  const manualHideUI = (e) => {
    e.stopPropagation();
    setShowControls(false);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
  };

  const handleUserActivity = () => {
    toggleFullScreen();
    resetHideTimer();
  };

  const goToNextAd = useCallback(() => {
    setAds((prevAds) => {
      if (prevAds.length === 0) return prevAds;
      setCurrentAdIndex((prevIndex) => (prevIndex + 1) % prevAds.length);
      return prevAds;
    });
  }, []);

  // --- 🟢 DATA FETCH & SOCKET (Updated for UID) ---
  const fetchAds = useCallback(async () => {
    const userId = sessionStorage.getItem('paired_user_id');
    if (!userId) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/playlists/active?userId=${userId}`);
      if (res.data) {
        setAds(res.data.ads || []);
        setPlaylistName(res.data.name || 'No Active Playlist');
        setCurrentAdIndex(0);
      }
      setLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userId = sessionStorage.getItem('paired_user_id');
    if (screenKey && userId) {
      setIsPaired(true);
      fetchAds();

      socket.emit('register_device', { userId, tabId: TAB_ID });
      socket.on(`active-playlist-updated-${userId}`, fetchAds);
      socket.on('admin_command', (data) => {
        if (data.payload?.userId !== userId) return;
        const action = data.payload.action;
        if (action === 'NEXT') { goToNextAd(); resetHideTimer(); }
        if (action === 'PLAY_PAUSE') setIsPlaying(p => !p);
        if (action === 'ROTATE_RIGHT') { setRotationDegree(d => (d + 90) % 360); resetHideTimer(); }
        if (action === 'SOUND_TOGGLE') {
           if (videoRef.current) {
             const newMute = !isMuted;
             videoRef.current.muted = newMute;
             setIsMuted(newMute);
           }
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      socket.off(`active-playlist-updated-${userId}`);
      socket.off('admin_command');
    };
  }, [fetchAds, screenKey]);

  // Image Duration Logic
  useEffect(() => {
    if (!ads.length || !isPlaying) return;
    const currentAd = ads[currentAdIndex];
    if (currentAd?.type === 'image') {
      const timer = setTimeout(() => goToNextAd(), (currentAd.duration || 10) * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentAdIndex, ads, isPlaying, goToNextAd]);

  // Video Play/Pause Logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.play().catch(() => { });
    else video.pause();
  }, [isPlaying, currentAdIndex]);

  // --- 🟢 PAIRING VIEW ---
  if (!isPaired) {
    return (
      <div style={pairPageStyle}>
        <div style={pairCardStyle}>
          <FaLock size={40} color="#4f46e5" />
          <h2 style={{ margin: '20px 0' }}>Register Screen</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Tab ID: {TAB_ID}</p>
          <form onSubmit={handlePairing} style={{ width: '100%' }}>
            <input 
              style={inputStyle}
              placeholder="Enter Pairing Key"
              value={screenKey}
              onChange={(e) => setScreenKey(e.target.value.toUpperCase())}
              required
            />
            {pairError && <p style={{ color: '#ef4444', fontSize: '14px' }}>{pairError}</p>}
            <button type="submit" style={btnStyle} disabled={loading}>
              {loading ? 'Verifying...' : 'Activate Screen'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 🟢 ORIGINAL TV CONTENT VIEW ---
  if (loading) return <div style={fullPageStyle}>Loading Signage Content...</div>;
  if (!ads.length) return <div style={fullPageStyle}>No Active Content to Display</div>;

  const currentAd = ads[currentAdIndex];
  const isRotated = rotationDegree === 90 || rotationDegree === 270;

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <style>{`
        body { margin: 0; background: #000; overflow: hidden; font-family: sans-serif; }
        * { cursor: ${showControls ? 'default' : 'none'} !important; }
        .ui-bar {
          position: fixed; bottom: 40px; left: 50%; 
          transform: translateX(-50%) ${showControls ? 'translateY(0)' : 'translateY(150%)'};
          display: flex; align-items: center; width: 90%; max-width: 950px; padding: 15px 30px;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(20px); border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.1); transition: all 0.4s ease; 
          opacity: ${showControls ? 1 : 0}; z-index: 9999;
        }
        .control-btn {
          width: 55px; height: 55px; border-radius: 50%; background: rgba(255,255,255,0.1);
          color: white; display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 22px; transition: 0.2s; border: none; outline: none;
        }
        .control-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
        .playlist-info { color: white; flex: 1; text-align: center; padding: 0 20px; }
        .playlist-name { font-size: 18px; font-weight: bold; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-count { font-size: 13px; opacity: 0.6; }
      `}</style>

      <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) rotate(${rotationDegree}deg)`,
          width: isRotated ? '100vh' : '100vw',
          height: isRotated ? '100vw' : '100vh',
          transition: 'transform 0.5s ease',
          zIndex: 1
      }}>
        {currentAd?.type === 'video' ? (
          <video
            key={currentAd.url}
            ref={videoRef}
            src={currentAd.url.startsWith('http') ? currentAd.url : `${BACKEND_URL}${currentAd.url}`}
            autoPlay={true}
            muted={isMuted}
            playsInline={true}
            style={mediaStyle}
            onEnded={goToNextAd}
          />
        ) : (
          <img
            key={currentAd?.url}
            src={currentAd?.url.startsWith('http') ? currentAd.url : `${BACKEND_URL}${currentAd.url}`}
            style={mediaStyle}
            alt="Ad Content"
          />
        )}
      </div>

      <div className="ui-bar" onClick={(e) => e.stopPropagation()}>
        <button className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <div className="playlist-info">
          <p className="playlist-name">{playlistName}</p>
          <span className="ad-count">Ad {currentAdIndex + 1} of {ads.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="control-btn" onClick={() => {setRotationDegree(d => (d + 90) % 360); resetHideTimer();}}>
            <FaArrowRotateRight />
          </button>
          <button className="control-btn" onClick={() => {goToNextAd(); resetHideTimer();}}>
            <RxTrackNext />
          </button>
          <button className="control-btn" onClick={manualHideUI} style={{background: 'rgba(255,50,50,0.2)'}}>
            <FaEyeSlash />
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const pairPageStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0c10', color: 'white', fontFamily: 'sans-serif' };
const pairCardStyle = { background: '#1c212c', padding: '40px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' };
const inputStyle = { width: '93%', padding: '15px', borderRadius: '10px', border: '1px solid #30363d', background: '#0f1219', color: 'white', fontSize: '18px', textAlign: 'center', marginBottom: '15px' };
const btnStyle = { width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: '#4f46e5', color: 'white', fontWeight: 'bold', cursor: 'pointer' };
const containerStyle = { width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' };
const mediaStyle = { width: '100%', height: '100%', objectFit: 'contain' };
const fullPageStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', background: '#000' };