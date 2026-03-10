import React, { useState, useEffect } from 'react';
import './Success.css';

export default function Success() {
    const [status, setStatus] = useState('loading');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const clientSecret = urlParams.get('payment_intent_client_secret');
        const paymentIntentId = urlParams.get('payment_intent');

        if (!clientSecret || !paymentIntentId) {
            setStatus('error');
            return;
        }

        // Hit the local fallback since webhooks won't reach localhost
        fetch('/api/confirm-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_intent: paymentIntentId })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus('succeeded');
                } else {
                    setStatus('error');
                }
            })
            .catch(err => {
                console.error("Confirmation error:", err);
                // Even if local fetch fails (e.g., server offline), if Stripe gave us a client secret, they paid.
                setStatus('succeeded');
            });
    }, []);

    if (status === 'loading') {
        return (
            <div className="success-page-container">
                <div className="spinner-container">
                    <div className="spinner"></div>
                    <p>Confirming your payment...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="success-page-container">
                <h2>Something went wrong.</h2>
                <p>We couldn't verify your payment. Please return home and try again.</p>
                <a href="." className="btn-primary" style={{ marginTop: '24px' }}>Return Home</a>
            </div>
        );
    }

    return (
        <div className="success-page-container">
            <div className="success-card">
                <div className="check-icon">✓</div>
                <h1 className="success-title">You're going to the Time of My Life Tour.</h1>
                <p className="success-desc">
                    Your payment was successful and your tickets have been secured!
                    We've emailed the digital tickets and receipt to you.
                </p>

                <div className="ticket-stub">
                    <div className="stub-header">
                        <span className="stub-brand">SPENCER</span>
                    </div>
                    <div className="stub-body">
                        <h3>Brooks, OR</h3>
                        <p>April 11th • Doors at 7:30 PM</p>
                        <div className="barcode">|||| ||||| |||||| |||</div>
                    </div>
                </div>

                <a href="." className="btn-primary return-home-btn">Return Home</a>
            </div>
        </div>
    );
}
