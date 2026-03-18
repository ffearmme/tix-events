import React, { useState, useEffect } from 'react';
import './AccessGate.css';

const VIP_CODE = 'VIPLIST';
const FAM_CODE = 'FAM2026';
const PARENT_CODE = 'SPENCERFAM';
const BROTHER_CODE = 'BROTHER2026';
const STORAGE_KEY = 'tix_access_unlocked';
const CODE_KEY = 'tix_access_code';

function AccessGate({ children }) {
    const [unlocked, setUnlocked] = useState(() => {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    });
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();

        if (trimmed === VIP_CODE || trimmed === FAM_CODE || trimmed === PARENT_CODE || trimmed === BROTHER_CODE) {
            sessionStorage.setItem(STORAGE_KEY, 'true');
            sessionStorage.setItem(CODE_KEY, trimmed);
            setUnlocked(true);
            setError('');
        } else {
            setError('Invalid access code. Please try again.');
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
        }
    };

    if (unlocked) {
        return <>{children}</>;
    }

    return (
        <section id="tickets-section" className="access-gate section-padding">
            <div className="access-gate-container">
                {/* Lock Icon */}
                <div className="gate-lock-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="gate-title">Tickets Coming Soon</h2>

                {/* Public release date */}
                <p className="gate-date">
                    General Public On-Sale
                </p>
                <p className="gate-date-value">
                    March 21, 2026
                </p>

                {/* Decorative divider */}
                <div className="gate-divider">
                    <span className="gate-divider-diamond"></span>
                </div>

                {/* Early access form */}
                <p className="gate-early-label">Have an early access code?</p>
                <form className="gate-form" onSubmit={handleSubmit}>
                    <div className={`gate-input-wrapper ${shaking ? 'shake' : ''}`}>
                        <input
                            type="text"
                            className={`gate-input ${error ? 'gate-input-error' : ''}`}
                            placeholder="Enter access code"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value);
                                if (error) setError('');
                            }}
                            autoComplete="off"
                            spellCheck="false"
                        />
                        <button type="submit" className="gate-submit-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </button>
                    </div>
                    {error && <p className="gate-error">{error}</p>}
                </form>
            </div>
        </section>
    );
}

export default AccessGate;
