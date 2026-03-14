import React, { useState, useEffect } from 'react';
import './Countdown.css';

const RELEASE_DATE = new Date('2026-03-21T00:00:00-07:00'); // March 21st, Mountain/Pacific

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

function Countdown() {
    const [timeLeft, setTimeLeft] = useState(getTimeLeft());

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!timeLeft) {
        return (
            <div className="countdown-section">
                <div className="countdown-released">
                    <span className="countdown-released-text">Tickets Are Live</span>
                </div>
            </div>
        );
    }

    const units = [
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Minutes', value: timeLeft.minutes },
        { label: 'Seconds', value: timeLeft.seconds },
    ];

    return (
        <section className="countdown-section">
            <div className="countdown-inner">
                <p className="countdown-eyebrow">Tickets Drop</p>
                <h2 className="countdown-headline">March 21st</h2>
                <div className="countdown-divider" />
                <div className="countdown-grid">
                    {units.map(({ label, value }) => (
                        <div className="countdown-unit" key={label}>
                            <div className="countdown-box">
                                <span className="countdown-number">
                                    {String(value).padStart(2, '0')}
                                </span>
                            </div>
                            <span className="countdown-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Countdown;
