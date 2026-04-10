import React, { useState, useEffect } from 'react';
import './TopBanner.css';

function TopBanner() {
    return (
        <div className="top-banner vip-urgency-banner">
            <div className="top-banner-content">
                <span className="vip-warning-icon">🔥</span>
                <span className="top-banner-label">URGENT: ONLY 2 VIP UPGRADES REMAINING</span>
                <button 
                    className="top-banner-cta"
                    onClick={() => {
                        const el = document.getElementById('tickets-section');
                        if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                    }}
                >
                    GRAB YOURS NOW
                </button>
            </div>
        </div>
    );
}

export default TopBanner;
