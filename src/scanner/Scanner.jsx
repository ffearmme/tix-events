import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import './Scanner.css';

export default function Scanner() {
    const [scanResult, setScanResult] = useState(null);
    const [scanMessage, setScanMessage] = useState('');
    const [scanStatus, setScanStatus] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
                const res = await fetch(`/api/scan/${decodedText}`, {
                    method: 'POST'
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
    }, []);

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
