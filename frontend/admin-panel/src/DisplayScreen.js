import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FaArrowRotateRight, FaPlay, FaPause, FaEyeSlash } from "react-icons/fa6"; // FaEyeSlash add kiya
import { RxTrackNext } from "react-icons/rx";

const BACKEND_URL = 'http://76.13.192.122:5000';
const socket = io(BACKEND_URL);
const HIDE_TIMEOUT_MS = 5000;

export default function DisplayScreen() {
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

  // --- 🟢 FULLSCREEN LOGIC ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error enabling full-screen: ${e.message}`);
      });
    }
  };

  // 1. 🎛️ UI CONTROLS HIDER LOGIC
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, HIDE_TIMEOUT_MS);
    }
  }, [isPlaying]);

  // NEW: Manual Hide Function (For Button Click)
  const manualHideUI = (e) => {
    e.stopPropagation(); // Taaki handleUserActivity trigger na ho jaye
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

  useEffect(() => {
    if (!ads.length || !isPlaying) return;
    const currentAd = ads[currentAdIndex];
    if (currentAd?.type === 'image') {
      const timer = setTimeout(() => {
        goToNextAd();
      }, (currentAd.duration || 10) * 1000);
      return () => clearTimeout(timer);
    }
  }, [currentAdIndex, ads, isPlaying, goToNextAd]);

  const toggleSound = () => {
    if (videoRef.current) {
      const newMute = !isMuted;
      videoRef.current.muted = newMute;
      videoRef.current.volume = 1;
      setIsMuted(newMute);
    }
    resetHideTimer();
  };

  const togglePlayPause = useCallback(() => {
    setIsPlaying(p => !p);
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('userId');
    if (!id) return;

    const fetchAds = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/playlists/active?userId=${id}`);
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
    };

    fetchAds();
    socket.on(`active-playlist-updated-${id}`, fetchAds);
    socket.on('admin_command', (data) => {
      if (data.payload?.userId !== id) return;
      const action = data.payload.action;
      if (action === 'NEXT') { goToNextAd(); resetHideTimer(); }
      if (action === 'PLAY_PAUSE') togglePlayPause();
      if (action === 'ROTATE_RIGHT') { setRotationDegree(d => (d + 90) % 360); resetHideTimer(); }
      if (action === 'ROTATE_LEFT') { setRotationDegree(d => (d - 90 + 360) % 360); resetHideTimer(); }
      if (action === 'SOUND_TOGGLE') toggleSound();
    });

    return () => {
      socket.off(`active-playlist-updated-${id}`);
      socket.off('admin_command');
    };
  }, [goToNextAd, togglePlayPause, resetHideTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.play().catch(() => { });
    else video.pause();
  }, [isPlaying, currentAdIndex]);

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
        .control-btn.hide-btn { background: rgba(255,50,50,0.2); } /* Hide button thoda red highlight */
        
        .playlist-info { color: white; flex: 1; text-align: center; padding: 0 20px; }
        .playlist-name { font-size: 18px; font-weight: bold; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-count { font-size: 13px; opacity: 0.6; }
      `}</style>

      {/* MEDIA CONTAINER */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) rotate(${rotationDegree}deg)`,
          width: isRotated ? '100vh' : '100vw',
          height: isRotated ? '100vw' : '100vh',
          transition: 'transform 0.5s ease',
          zIndex: 1
        }}
      >
        {currentAd?.type === 'video' ? (
          <video
            key={currentAd.url}
            ref={videoRef}
            src={currentAd.url}
            autoPlay={true}
            muted={isMuted}
            playsInline={true}
            loop={false}
            style={mediaStyle}
            onEnded={goToNextAd}
            onLoadedMetadata={(e) => {
              if(isPlaying) e.target.play().catch(err => console.log(err));
            }}
          />
        ) : (
          <img
            key={currentAd?.url}
            src={currentAd?.url}
            style={mediaStyle}
            alt="Ad Content"
          />
        )}
      </div>

      {/* UI CONTROLS BAR */}
      <div className="ui-bar" onClick={(e) => e.stopPropagation()}>
        {/* Play/Pause */}
        <button className="control-btn" onClick={togglePlayPause}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        <div className="playlist-info">
          <p className="playlist-name">{playlistName}</p>
          <span className="ad-count">Ad {currentAdIndex + 1} of {ads.length}</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Sound Toggle */}
          <button className="control-btn" onClick={toggleSound}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          
          {/* Rotate Toggle */}
          <button className="control-btn" onClick={() => { setRotationDegree(d => (d + 90) % 360); resetHideTimer(); }}>
            <FaArrowRotateRight />
          </button>
          
          {/* Next Ad */}
          <button className="control-btn" onClick={() => { goToNextAd(); resetHideTimer(); }}>
            <RxTrackNext />
          </button>

          {/* 🔴 NEW: QUICK HIDE BUTTON 🔴 */}
          <button 
            className="control-btn hide-btn" 
            onClick={manualHideUI}
            title="Hide Controls"
          >
            <FaEyeSlash />
          </button>
        </div>
      </div>
    </div>
  );
}

const containerStyle = { width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' };
const mediaStyle = { width: '100%', height: '100%', objectFit: 'contain' };
const fullPageStyle = { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', background: '#000' };