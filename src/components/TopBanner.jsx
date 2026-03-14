import React, { useState, useEffect } from 'react';
import './TopBanner.css';

const RELEASE_DATE = new Date('2026-03-21T00:00:00-07:00');

function getTimeLeft() {
    const now = new Date();
    const diff = RELEASE_DATE - now;
    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
}

function TopBanner() {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) return null;

    return (
        <div className="top-banner">
            <div className="top-banner-content">
                <span className="top-banner-label">Tickets Drop March 21st</span>
                <div className="top-banner-timer">
                    <div className="top-banner-unit">
                        <span className="top-banner-value">{String(timeLeft.days).padStart(2, '0')}</span>
                        <span className="top-banner-suffix">d</span>
                    </div>
                    <div className="top-banner-unit">
                        <span className="top-banner-value">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="top-banner-suffix">h</span>
                    </div>
                    <div className="top-banner-unit">
                        <span className="top-banner-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="top-banner-suffix">m</span>
                    </div>
                    <div className="top-banner-unit">
                        <span className="top-banner-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="top-banner-suffix">s</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TopBanner;
