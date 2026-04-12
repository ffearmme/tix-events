import React from 'react';
import './TopBanner.css';

function TopBanner() {
    return (
        <div className="top-banner-bar">
            <div className="top-banner-content">
                <span className="banner-badge">TOUR CONCLUDED</span>
                <span className="banner-text">
                    <strong>THANK YOU, BROOKS!</strong> 
                    <span className="banner-divider">|</span>
                    The Time of My Life Tour has officially ended.
                </span>
                <button 
                    className="banner-cta"
                    onClick={() => {
                        const el = document.getElementById('merch-section');
                        if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                    }}
                >
                    SHOP MERCH
                </button>
            </div>
        </div>
    );
}

export default TopBanner;
