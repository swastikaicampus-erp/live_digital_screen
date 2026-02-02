import React from 'react';

const layouts = [
    { id: 'FULL_SCREEN', name: 'Full Screen', description: 'Single Media Playback', icon: '📺' },
    { id: 'SPLIT_SCREEN', name: 'Split Screen', description: 'Two Media Side-by-Side', icon: '🌓' },
    { id: 'MARQUEE_LAYOUT', name: 'Marquee Text', description: 'Media + Scrolling Text', icon: '🗞️' }
];

function LayoutSelector({ selected, onSelect }) {
    return (
        <div className="layout-grid-container">
            <label className="section-label">Select Screen Layout</label>
            <div className="layout-visual-grid">
                {layouts.map((layout) => (
                    <div 
                        key={layout.id} 
                        className={`layout-card ${selected === layout.id ? 'active' : ''}`}
                        onClick={() => onSelect(layout.id)}
                    >
                        <div className="layout-preview">
                            {/* Visual Representation */}
                            {layout.id === 'FULL_SCREEN' && <div className="preview-box full">Zone 1</div>}
                            {layout.id === 'SPLIT_SCREEN' && (
                                <div className="preview-box split">
                                    <div className="z1">Zone 1</div>
                                    <div className="z2">Zone 2</div>
                                </div>
                            )}
                            {layout.id === 'MARQUEE_LAYOUT' && (
                                <div className="preview-box marquee">
                                    <div className="z-top">Zone 1</div>
                                    <div className="z-bot">Scrolling Text...</div>
                                </div>
                            )}
                        </div>
                        <h4>{layout.name}</h4>
                        <p>{layout.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LayoutSelector;