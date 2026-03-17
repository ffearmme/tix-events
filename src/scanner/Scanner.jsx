import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import './Scanner.css';

export default function Scanner() {
    const [authenticated, setAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [scanMessage, setScanMessage] = useState('');
    const [scanStatus, setScanStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!authenticated || isAdmin) return;
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
    }, [authenticated, isAdmin]);

    useEffect(() => {
        if (!authenticated || !isAdmin) return;
        
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/seats');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [authenticated, isAdmin]);

    if (!authenticated) {
        return (
            <div className="scanner-page">
                <div style={{ maxWidth: '400px', margin: '40px auto', padding: '30px', background: '#111', borderRadius: '8px', textAlign: 'center' }}>
                    <h2 style={{ color: '#dfa759', marginBottom: '20px' }}>STAFF PORTAL</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (passwordInput === 'doorstaff') {
                            setAuthenticated(true);
                            setIsAdmin(false);
                        } else if (passwordInput === 'admin') {
                            setAuthenticated(true);
                            setIsAdmin(true);
                        } else {
                            alert('Incorrect portal password');
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

    if (isAdmin) {
        const totalReservedSold = stats?.soldSeats?.length || 0;
        const totalBleachersSold = (stats?.bleachersBLSold || 0) + (stats?.bleachersBRSold || 0);
        const totalTicketsSold = totalReservedSold + totalBleachersSold;
        const totalVipSold = stats?.vipSold || 0;
        
        const totalCapacity = 98 + 50; // 14-seat rows A-G (98) + 50 bleachers
        const percentFilled = Math.round((totalTicketsSold / totalCapacity) * 100);

        // Revenue Approximation (A=$25, B/C=$20, D/E=$15, F/G=$10, Bleach=$5, VIP=+$25)
        // This is a rough estimate since we'd need to map every sold seat ID
        const reservedRevenue = (stats?.soldSeats || []).reduce((acc, id) => {
            const row = id.split('-')[0];
            if (row === 'A') return acc + 25;
            if (row === 'B' || row === 'C') return acc + 20;
            if (row === 'D' || row === 'E') return acc + 15;
            return acc + 10;
        }, 0);
        const estimatedRevenue = reservedRevenue + (totalBleachersSold * 5) + (totalVipSold * 25);

        return (
            <div className="scanner-page">
                <h1 className="scanner-title">ADMIN DASHBOARD</h1>
                
                {loading ? (
                    <div className="stats-loading">Loading metrics...</div>
                ) : (
                    <div className="admin-stats-container">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>TOTAL TICKETS</h3>
                                <div className="stat-value">{totalTicketsSold}</div>
                                <div className="stat-sub">{totalCapacity} Capacity</div>
                            </div>
                            <div className="stat-card highlight">
                                <h3>GROSS REVENUE</h3>
                                <div className="stat-value">${estimatedRevenue.toLocaleString()}</div>
                                <div className="stat-sub">Tickets + Upgrades</div>
                            </div>
                            <div className="stat-card">
                                <h3>VIP UPGRADES</h3>
                                <div className="stat-value">{totalVipSold}</div>
                                <div className="stat-sub">25 Cap</div>
                            </div>
                            <div className="stat-card">
                                <h3>SALE RATE</h3>
                                <div className="stat-value">{percentFilled}%</div>
                                <div className="stat-sub">Venue Fill</div>
                            </div>
                        </div>

                        <div className="capacity-visualizer">
                            <div className="progress-label">
                                <span>Sales Progress</span>
                                <span>{totalTicketsSold} / {totalCapacity}</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${percentFilled}%` }}></div>
                            </div>
                        </div>

                        <div className="stats-breakdown">
                            <div className="breakdown-item">
                                <span>Reserved Seats:</span>
                                <span>{totalReservedSold}</span>
                            </div>
                            <div className="breakdown-item">
                                <span>Bleacher GA:</span>
                                <span>{totalBleachersSold}</span>
                            </div>
                        </div>

                        <button 
                            className="btn-primary" 
                            style={{ marginTop: '30px', background: '#222', border: '1px solid #333' }}
                            onClick={() => window.location.reload()}
                        >
                            REFRESH DATA
                        </button>
                    </div>
                )}
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
