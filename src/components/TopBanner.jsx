import React from 'react';
import './TopBanner.css';

function TopBanner() {
    return (
        <div className="top-banner-bar">
            <div className="top-banner-content">
                <span className="banner-badge">NOTICE</span>
                <span className="banner-text">
                    <strong>VIP EXPERIENCE IS SOLD OUT!</strong> 
                    <span className="banner-divider">|</span>
                    Limited Standard Seating Still Available
                </span>
                <button 
                    className="banner-cta"
                    onClick={() => {
                        const el = document.getElementById('tickets-section');
                        if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                    }}
                >
                    GET TICKETS
                </button>
            </div>
        </div>
    );
}

export default TopBanner;
