import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import './Scanner.css';

export default function Scanner() {
    const [authenticated, setAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [scanMessage, setScanMessage] = useState('');
    const [scanStatus, setScanStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authenticated) return;
        let scanner;
        let isProcessing = false;

        scanner = new Html5QrcodeScanner("reader", {
            qrbox: { width: 250, height: 250 },
            fps: 5
        });

        scanner.render(async (decodedText) => {
            if (isProcessing) return;
            isProcessing = true;

            // Temporary UI update
            setLoading(true);

            try {
                const res = await fetch('/api/validate-ticket', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: decodedText })
                });
                const data = await res.json();

                setScanResult(data.ticket);
                setScanMessage(data.message);
                setScanStatus(data.valid ? 'success' : 'error');
            } catch (error) {
                setScanMessage("Network error validating ticket");
                setScanStatus('error');
            }
            setLoading(false);

            // Auto-clear message after a few seconds so door staff can scan the next
            setTimeout(() => {
                setScanResult(null);
                setScanMessage('');
                setScanStatus('');
                isProcessing = false;
            }, 4000);

        }, (err) => {
            // Ignored, runs every frame it doesn't find a code
        });

        return () => {
            scanner.clear().catch(e => console.error("Failed to clear scanner", e));
        };
    }, [authenticated]);

    if (!authenticated) {
        return (
            <div className="scanner-page">
                <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', background: '#111', borderRadius: '8px', textAlign: 'center' }}>
                    <h2 style={{ color: '#dfa759', marginBottom: '20px' }}>STAFF PORTAL</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (passwordInput === 'doorstaff') {
                            setAuthenticated(true);
                        } else {
                            alert('Incorrect scanner password');
                            setPasswordInput('');
                        }
                    }}>
                        <input
                            type="password"
                            placeholder="Enter Access Password"
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginBottom: '20px',
                                borderRadius: '4px',
                                border: '1px solid #333',
                                background: '#222',
                                color: '#fff',
                                fontFamily: 'inherit'
                            }}
                            autoFocus
                        />
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>UNLOCK SCANNER</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="scanner-page">
            <h1 className="scanner-title">TICKETING DOOR SCANNER</h1>

            <div className="scanner-container">
                <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', background: '#000', borderRadius: '8px', overflow: 'hidden' }}></div>
            </div>

            {loading && <div className="scan-alert loading">Checking database...</div>}

            {scanMessage && !loading && (
                <div className={`scan-alert ${scanStatus}`}>
                    <h2>{scanMessage}</h2>
                    {scanResult && (
                        <div className="scan-ticket-info">
                            <p><strong>Type:</strong> {scanResult.type}</p>
                            <p><strong>Seat:</strong> {scanResult.seatInfo}</p>
                            {scanResult.vip && <p className="vip-badge">★ VIP Access</p>}
                            <p className="scan-email">{scanResult.buyerEmail}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
