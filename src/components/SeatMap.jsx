import React, { useState, useEffect } from 'react';
import './SeatMap.css';
import CheckoutModal from './CheckoutModal';

// Generate mock seating data
const generateRows = () => {
    const rows = ['A', 'B', 'C', 'D', 'E']; // F and G removed (available to re-add if seating fills up)
    const allSeats = [];

    rows.forEach((row, rowIndex) => {
        const numSeats = 14;
        for (let i = 1; i <= numSeats; i++) {
            let type = 'standard';
            let price = 45;
            let note = 'Standard Seat';

            if (rowIndex === 0) { // Row A
                price = 15;
                note = 'Front Row Segment';
            } else if (rowIndex === 1 || rowIndex === 2) { // Row B, C
                price = 10;
                note = 'Preferred Seating';
            } else if (rowIndex === 3 || rowIndex === 4) { // Row D, E
                price = 5;
            }

            allSeats.push({
                id: `${row}-${i}`,
                row,
                number: i,
                status: 'available',
                type,
                price,
                note
            });
        }
    });

    return allSeats;
};

const initialSeats = generateRows();

function SeatMap() {
    const [isLoading, setIsLoading] = useState(true);
    const [seats, setSeats] = useState(initialSeats);
    const [selectedSeatIds, setSelectedSeatIds] = useState([]);
    const [bleacherCounts, setBleacherCounts] = useState({ BL: 0, BR: 0 });
    const [bleachersSold, setBleachersSold] = useState({ BL: 0, BR: 0 });
    const [vipUpgrades, setVipUpgrades] = useState(0);
    const [vipInfoExpanded, setVipInfoExpanded] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [vipError, setVipError] = useState('');
    const [timeLeft, setTimeLeft] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showVipNudge, setShowVipNudge] = useState(false);
    const [claimEmail, setClaimEmail] = useState('');
    
    const [accessCode, setAccessCode] = useState(() => sessionStorage.getItem('tix_access_code') || '');
    const [promoInput, setPromoInput] = useState('');
    const [promoMessage, setPromoMessage] = useState({ text: '', type: '' });

    const GIVEAWAY_CODE = 'GIVEAWAY2026';
    const isFreeCode = accessCode === GIVEAWAY_CODE;
    const isParentCode = false;
    const isBrotherCode = false;

    const [showClaimModal, setShowClaimModal] = useState(false);
    const [enlargedSection, setEnlargedSection] = useState(null); // 'left' | 'right' | null

    const toggleEnlarge = (section) => {
        if (window.innerWidth >= 768) return; // Only for mobile
        setEnlargedSection(prev => prev === section ? null : section);
    };

    const handleApplyPromo = () => {
        const trimmed = promoInput.trim().toUpperCase();
        const validCodes = ['VIPLIST', 'FAM2026', 'GIVEAWAY2026', 'TESTTICKET', 'TIX20', 'SAVE50'];
        
        if (trimmed === '') {
            sessionStorage.removeItem('tix_access_code');
            setAccessCode('');
            setPromoMessage({ text: 'Promo code removed.', type: 'neutral' });
            return;
        }

        if (validCodes.includes(trimmed)) {
            sessionStorage.setItem('tix_access_code', trimmed);
            setAccessCode(trimmed);
            setPromoMessage({ text: 'Code applied successfully!', type: 'success' });
            setPromoInput('');
        } else {
            setPromoMessage({ text: 'Invalid promo code.', type: 'error' });
        }
        
        // Hide message after 3 seconds
        setTimeout(() => setPromoMessage({ text: '', type: '' }), 3000);
    };

    // Bleachers available starting March 28th, 2026
    const isBleacherAvailable = new Date() >= new Date('2026-03-28');

    useEffect(() => {
        fetch('/api/seats')
            .then(res => res.json())
            .then(data => {
                if (data.soldSeats) {
                    setSeats(prev => prev.map(s =>
                        data.soldSeats.includes(s.id) ? { ...s, status: 'sold' } : s
                    ));
                }
                setBleachersSold({
                    BL: data.bleachersBLSold || 0,
                    BR: data.bleachersBRSold || 0
                });
            })
            .catch(err => console.error("Failed to fetch seat data", err))
            .finally(() => {
                setIsLoading(false);
            });
    }, [isParentCode, isBrotherCode]);

    const handleSeatClick = (seat) => {
        if (seat.status === 'sold') return;

        let newSelected;
        let isAdding = true;
        if (selectedSeatIds.includes(seat.id)) {
            newSelected = selectedSeatIds.filter(id => id !== seat.id);
            isAdding = false;
        } else {
            newSelected = [...selectedSeatIds, seat.id];
        }

        const newStandardCount = newSelected.length;
        const totalCount = newStandardCount + bleacherCounts.BL + bleacherCounts.BR;

        if (isAdding && totalCount > 7) {
            setToastMsg("Maximum of 7 tickets per order allowed.");
            setTimeout(() => setToastMsg(''), 3000);
            return;
        }


        setSelectedSeatIds(newSelected);
        setToastMsg('');
    };

    const updateBleacher = (id, delta) => {
        if (delta > 0) {
            const totalCount = selectedSeatIds.length + bleacherCounts.BL + bleacherCounts.BR;
            if (totalCount >= 7) {
                setToastMsg("Maximum of 7 tickets per order allowed.");
                setTimeout(() => setToastMsg(''), 3000);
                return;
            }
        }

        setBleacherCounts(prev => {
            const sold = bleachersSold[id];
            const newCount = prev[id] + delta;
            if (newCount < 0 || newCount > (25 - sold)) return prev;
            return { ...prev, [id]: newCount };
        });
    };

    const handleVipAdd = () => {
        setVipError("VIP Upgrades are now SOLD OUT. Only Standard Seating remains!");
        setTimeout(() => setVipError(''), 3000);
        return;
    };


    const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
    const bleacherSubtotal = (bleacherCounts.BL + bleacherCounts.BR) * 5;
    const totalSelected = selectedSeats.length + bleacherCounts.BL + bleacherCounts.BR;
    const eligibleForVip = selectedSeats.length;

    useEffect(() => {
        let timerId;
        if (totalSelected > 0 && timeLeft === null) {
            setTimeLeft(300); // 5 minutes
        } else if (totalSelected === 0) {
            setTimeLeft(null);
        }

        if (timeLeft !== null && timeLeft > 0) {
            timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setSelectedSeatIds([]);
            setBleacherCounts({ BL: 0, BR: 0 });
            setVipUpgrades(0);
            setTimeLeft(null);
            setToastMsg("Checkout session expired. Seats released.");
            setTimeout(() => setToastMsg(''), 5000);
        }

        return () => clearInterval(timerId);
    }, [totalSelected, timeLeft]);

    useEffect(() => {
        const maxAllowed = Math.min(2, eligibleForVip);
        if (vipUpgrades > maxAllowed) {
            setVipUpgrades(maxAllowed);
        }
    }, [eligibleForVip, vipUpgrades]);

    const vipSubtotal = vipUpgrades * 25; 
    
    // Calculate seat prices, discounting one if it's a giveaway code
    let discountApplied = false;
    const seatSubtotal = selectedSeats.reduce((sum, s) => {
        if (isParentCode && (s.id === 'B-8' || s.id === 'B-9')) return sum;
        if (isBrotherCode && s.id === 'A-8') return sum;
        
        if (isFreeCode && !discountApplied) {
            discountApplied = true;
            return sum; // One free seat
        }
        
        return sum + s.price;
    }, 0);

    let subtotal = seatSubtotal + bleacherSubtotal + vipSubtotal;
    
    // TIX20 code - 20% off
    if (accessCode === 'TIX20') {
        subtotal *= 0.8;
    }
    
    // SAVE50 code - 50% off
    if (accessCode === 'SAVE50') {
        subtotal *= 0.5;
    }

    // TESTTICKET code override
    if (accessCode === 'TESTTICKET') {
        subtotal = 1;
    }

    const handleCheckout = () => {
        if (totalSelected === 0) return;
        
        proceedToCheckout();
    };

    const proceedToCheckout = () => {
        setShowVipNudge(false);
        if (isFreeCode && subtotal === 0) {
            setShowClaimModal(true);
            return;
        }
        setShowCheckout(true);
    };

    const confirmFreeClaim = () => {
        if (!claimEmail || !claimEmail.includes('@')) {
            setToastMsg("Please enter a valid email address to receive your tickets.");
            return;
        }
        
        setIsLoading(true);
        setToastMsg('');
        
        fetch('/api/claim-free-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selectedSeatIds,
                vipUpgrades,
                accessCode,
                email: claimEmail
            }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = `${window.location.origin}/success?purchaseType=tickets&freeClaim=true`;
            } else {
                setToastMsg(data.error || "Failed to claim free tickets.");
                setShowClaimModal(false);
            }
        })
        .catch(err => {
            console.error("Fetch error during free claim:", err);
            setToastMsg("An error occurred. Please try again.");
            setShowClaimModal(false);
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <section id="tickets-section" className="section-padding seatmap-section">
            {toastMsg && (
                <div className="global-error-toast">
                    {toastMsg}
                </div>
            )}
            <div className="container">
                <h2 className="section-title">Select Your Seats</h2>

                {/* Price Drop Banner */}
                <div className="price-drop-banner selection-notice">
                    <span className="price-drop-tag">Availability Update</span>
                    <div className="price-drop-content">
                        <strong>VIP is SOLD OUT</strong>
                        <span>Standard seating is still available—grab yours before they're gone!</span>
                    </div>
                </div>

                {/* Promo Code Input */}
                <div className="promo-code-section">
                    <div className="promo-input-wrapper">
                        <input
                            type="text"
                            className="promo-input"
                            placeholder="Enter promo code"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        />
                        <button className="promo-apply-btn" onClick={handleApplyPromo}>
                            Apply
                        </button>
                    </div>
                    {promoMessage.text && (
                        <p className={`promo-message-text ${promoMessage.type}`}>
                            {promoMessage.text}
                        </p>
                    )}
                    {accessCode && !promoMessage.text && (
                        <div className="active-promo-badge">
                            Active Code: <strong>{accessCode}</strong>
                            <button className="remove-promo-btn" onClick={() => {
                                sessionStorage.removeItem('tix_access_code');
                                setAccessCode('');
                                setPromoInput('');
                            }}>✕</button>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="seatmap-legend">
                    <div className="legend-item">
                        <div className="seat-circle legend-available"></div>
                        <span>Standard ($5-$15)</span>
                    </div>
                    <div className="legend-item">
                        <div className="seat-circle legend-selected"></div>
                        <span>Selected</span>
                    </div>
                    <div className="legend-item">
                        <div className="seat-circle legend-sold"></div>
                        <span>Sold</span>
                    </div>
                </div>

                {/* Seating Layout */}
                {isLoading ? (
                    <div className="seatmap-loading">
                        <div className="spinner"></div>
                        <p>Loading seat availability...</p>
                    </div>
                ) : (
                    <div className="seatmap-container">
                        <div className="stage">
                            <div className="stage-glow"></div>
                            <span>STAGE</span>
                        </div>

                        <div className="seating-grid-wrapper">
                            {['A', 'B', 'C', 'D', 'E'].map(rowLabel => {
                                if (accessCode === 'FAM2026' && (rowLabel === 'A' || rowLabel === 'B')) {
                                    return null;
                                }

                                const rowSeats = seats.filter(s => s.row === rowLabel);
                                const leftSection = rowSeats.slice(0, 7);
                                const rightSection = rowSeats.slice(7, 14);

                                const renderSeat = (seat) => {
                                    const isSelected = selectedSeatIds.includes(seat.id);
                                    let seatClass = `seat-btn seat-${seat.status} seat-type-${seat.type}`;
                                    if (isSelected) seatClass += ' seat-selected';
                                    return (
                                        <button
                                            key={seat.id}
                                            className={seatClass}
                                            onClick={(e) => {
                                                if (enlargedSection) {
                                                    handleSeatClick(seat);
                                                } else if (window.innerWidth < 768) {
                                                    toggleEnlarge(seat.number <= 7 ? 'left' : 'right');
                                                } else {
                                                    handleSeatClick(seat);
                                                }
                                            }}
                                            disabled={seat.status === 'sold'}
                                            aria-label={`Seat ${seat.id}`}
                                            title={`Row ${seat.row} Seat ${seat.number} - $${seat.price}`}
                                        >
                                            <span className="seat-number">{seat.number}</span>
                                        </button>
                                    );
                                };

                                return (
                                    <div key={rowLabel} className="seating-row">
                                        <div className="row-label">{rowLabel}</div>
                                        <div 
                                            className="row-section left" 
                                            onClick={() => !enlargedSection && toggleEnlarge('left')}
                                        >
                                            {leftSection.map(renderSeat)}
                                        </div>
                                        <div className="aisle-spacer"></div>
                                        <div 
                                            className="row-section right" 
                                            onClick={() => !enlargedSection && toggleEnlarge('right')}
                                        >
                                            {rightSection.map(renderSeat)}
                                        </div>
                                        <div className="row-label">{rowLabel}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bleacher-notice">
                            <div className="notice-text">
                                <p><strong>Elevated bleacher seating</strong> will be officially opened for purchase once the main floor reaches full capacity.</p>
                            </div>
                        </div>

                        {/* Zoom Overlay */}
                        {enlargedSection && (
                            <div className="zoom-overlay" onClick={() => setEnlargedSection(null)}>
                                <div className="zoom-content" onClick={e => e.stopPropagation()}>
                                    <div className="zoom-header">
                                        <h3>{enlargedSection === 'left' ? 'Left' : 'Right'} Section</h3>
                                        <button className="btn-close-zoom" onClick={() => setEnlargedSection(null)}>Close</button>
                                    </div>
                                    
                                    {toastMsg && (
                                        <div className="zoom-error-toast">
                                            {toastMsg}
                                        </div>
                                    )}

                                    <div className="zoom-grid">
                                        {['A', 'B', 'C', 'D', 'E'].map(rowLabel => {
                                             if (accessCode === 'FAM2026' && (rowLabel === 'A' || rowLabel === 'B')) return null;
                                             const rowSeats = seats.filter(s => s.row === rowLabel);
                                             const sectionSeats = enlargedSection === 'left' ? rowSeats.slice(0, 7) : rowSeats.slice(7, 14);
                                             return (
                                                 <div key={rowLabel} className="zoom-row">
                                                     <div className="row-label">{rowLabel}</div>
                                                     <div className="zoom-seats">
                                                         {sectionSeats.map(seat => {
                                                             const isSelected = selectedSeatIds.includes(seat.id);
                                                             let seatClass = `seat-btn zoom-seat seat-${seat.status} seat-type-${seat.type}`;
                                                             if (isSelected) seatClass += ' seat-selected';
                                                             return (
                                                                 <button
                                                                     key={seat.id}
                                                                     className={seatClass}
                                                                     onClick={() => handleSeatClick(seat)}
                                                                     disabled={seat.status === 'sold'}
                                                                 >
                                                                     <span className="seat-number">{seat.number}</span>
                                                                 </button>
                                                             );
                                                         })}
                                                     </div>
                                                 </div>
                                             );
                                        })}
                                    </div>
                                    <p className="zoom-hint">Select your seats, then <strong>close this view</strong> to finalize your purchase with the checkout bar below.</p>
                                </div>
                            </div>
                        )}

                        {/* Bleachers - hidden until main seating fills up. Re-enable by removing the false && condition below */}
                        {false && (
                        <div className="bleachers-wrapper">
                            {['BL', 'BR'].map(bleacherId => {
                                const name = bleacherId === 'BL' ? 'Left Bleachers' : 'Right Bleachers';
                                const count = bleacherCounts[bleacherId];
                                const sold = bleachersSold[bleacherId];
                                return (
                                    <div key={bleacherId} className="bleacher-block">
                                        <h3 className="bleacher-title">{name} ({sold}/25) ($5)</h3>
                                        <p className="bleacher-desc">General Admission</p>
                                        
                                        {isBleacherAvailable ? (
                                            <div className="bleacher-controls">
                                                <button
                                                    className="btn-bleacher-ctrl"
                                                    onClick={() => updateBleacher(bleacherId, -1)}
                                                    disabled={count === 0}
                                                >
                                                    -
                                                </button>
                                                <span className="bleacher-count">{count}</span>
                                                <button
                                                    className="btn-bleacher-ctrl"
                                                    onClick={() => updateBleacher(bleacherId, 1)}
                                                    disabled={count === (25 - sold) || count === 25}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bleacher-coming-soon">Coming Soon</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        )}
                    </div>
                )}
            </div>

            {/* Slide-up Bottom Bar */}
            <div className={`bottom-bar ${totalSelected > 0 ? 'visible' : ''}`}>
                <div className="bottom-bar-content container">
                    <div className="summary-details">
                        <div className="summary-count">
                            {totalSelected} {totalSelected === 1 ? 'Ticket' : 'Tickets'} Selected
                            {timeLeft !== null && (
                                <span className="checkout-timer">
                                    {' • '}Holding seats: {formatTime(timeLeft)}
                                </span>
                            )}
                        </div>

                        {/* VIP Inline Toggle */}
                        <div className="vip-inline-upgrader urgency-glow">
                            <div className="vip-inline-header">
                                <div className="vip-inline-info">
                                    <div className="vip-scarcity-badge sold-out">🚫 SOLD OUT</div>
                                    <span className="vip-inline-title">VIP Upgrades (SOLD OUT)</span>
                                    <span className="vip-inline-desc">
                                        VIP is currently unavailable. Standard seating is still open!
                                        <button className="vip-learn-more" onClick={() => setVipInfoExpanded(!vipInfoExpanded)}>
                                            {vipInfoExpanded ? 'Hide Details' : 'Learn More'}
                                        </button>
                                    </span>
                                </div>
                                <div className="bleacher-controls vip-inline-controls">
                                    <button
                                        className="btn-bleacher-ctrl btn-vip-inline"
                                        onClick={() => setVipUpgrades(Math.max(0, vipUpgrades - 1))}
                                        disabled={vipUpgrades === 0}
                                    >
                                        -
                                    </button>
                                    <span className="bleacher-count vip-inline-count">{vipUpgrades}</span>
                                    <button
                                        className={`btn-bleacher-ctrl btn-vip-inline ${vipUpgrades >= eligibleForVip || vipUpgrades >= 2 ? 'pseudo-disabled' : ''}`}
                                        onClick={handleVipAdd}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            {vipInfoExpanded && (
                                <div className="vip-expanded-details">
                                    <p>The VIP experience is now fully booked. We look forward to seeing our VIP guests at 7:00 PM! Standard ticket holders can still join the main show at 8:00 PM.</p>
                                </div>
                            )}
                            {vipError && (
                                <div className="vip-error-toast">
                                    {vipError}
                                </div>
                            )}
                        </div>

                        <div className="selected-list">
                            {selectedSeats.map(s => (
                                <span key={s.id} className="selected-badge">{s.id}</span>
                            ))}
                            {bleacherCounts.BL > 0 && <span className="selected-badge">Left Bleacher x{bleacherCounts.BL}</span>}
                            {bleacherCounts.BR > 0 && <span className="selected-badge">Right Bleacher x{bleacherCounts.BR}</span>}
                            {vipUpgrades > 0 && <span className="selected-badge badge-vip">VIP Upgrade x{vipUpgrades}</span>}
                        </div>
                    </div>

                    <div className="summary-action">
                        {isFreeCode && subtotal === 0 && (
                            <div className="giveaway-active-badge">
                                Giveaway Applied: 1 Free Ticket
                            </div>
                        )}
                        {accessCode === 'TIX20' && (
                            <div className="giveaway-active-badge">
                                Promo Code Applied: 20% Off
                            </div>
                        )}
                        {accessCode === 'SAVE50' && (
                            <div className="giveaway-active-badge">
                                Promo Code Applied: 50% Off
                            </div>
                        )}
                        {accessCode === 'TESTTICKET' && (
                            <div className="giveaway-active-badge test-badge">
                                Test Code Applied: $1.00 Total
                            </div>
                        )}
                        <div className="summary-total">Total: <span>${subtotal}</span></div>
                        <button className="btn-primary checkout-btn" onClick={handleCheckout}>
                            {isFreeCode && subtotal === 0 ? 'Claim Free Ticket' : (accessCode === 'TESTTICKET' ? 'Proceed to Test Checkout' : 'Continue to Checkout')}
                        </button>
                    </div>
                </div>
            </div>

            {/* VIP Nudge Modal */}
            {showVipNudge && (
                <div className="checkout-modal-overlay">
                    <div className="checkout-modal-content vip-nudge-modal">
                        <div className="checkout-header">
                            <h2 className="checkout-title">Wait! Are you sure?</h2>
                            <button className="modal-close" onClick={() => setShowVipNudge(false)}>&times;</button>
                        </div>
                        
                        <div className="nudge-content">
                            <div className="nudge-icon">✨</div>
                            <div className="vip-scarcity-badge floating">🔥 ONLY 2 LEFT</div>
                            <p className="nudge-message">
                                You're about to checkout without a <strong>VIP Upgrade</strong>.
                            </p>
                            <p className="nudge-subtext">
                                For just $25 more, you get an exclusive acoustic set, a signed poster, and priority entry. Most people choose VIP for the full experience!
                            </p>
                        </div>

                        <div className="claim-actions">
                            <button 
                                className="btn-primary full-width upgrade-btn-nudge" 
                                onClick={() => {
                                    handleVipAdd();
                                    setShowVipNudge(false);
                                    // Scroll to VIP section or just let them see it
                                }}
                            >
                                Upgrade to VIP (+ $25)
                            </button>
                            <button 
                                className="btn-secondary full-width" 
                                onClick={proceedToCheckout}
                            >
                                No thanks, continue to checkout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Free Ticket Pop-up */}
            {showClaimModal && (
                <div className="checkout-modal-overlay">
                    <div className="checkout-modal-content claim-modal">
                        <div className="checkout-header">
                            <h2 className="checkout-title">Claim Your Free Ticket</h2>
                            <button className="modal-close" onClick={() => setShowClaimModal(false)}>&times;</button>
                        </div>
                        
                        <div className="claim-summary">
                            <p>You are claiming <strong>1 Free Seat</strong> using your giveaway code.</p>
                            <div className="claim-details">
                                <div className="claim-item">
                                    <span>Seat:</span>
                                    <span className="gold-text">{selectedSeatIds[0]}</span>
                                </div>
                                <div className="claim-item">
                                    <span>Total:</span>
                                    <span className="gold-text">$0</span>
                                </div>
                            </div>
                        </div>

                        <div className="checkout-email-group">
                            <p className="checkout-email-hint">Please enter your email to receive your digital ticket.</p>
                            <input 
                                type="email" 
                                placeholder="name@example.com" 
                                value={claimEmail}
                                onChange={(e) => setClaimEmail(e.target.value)}
                                className="claim-email-input-field"
                                autoFocus
                            />
                        </div>

                        <div className="claim-actions">
                            <button 
                                className="btn-primary full-width" 
                                onClick={confirmFreeClaim}
                                disabled={isLoading}
                            >
                                {isLoading ? <div className="spinner sm"></div> : 'Confirm & Claim Ticket'}
                            </button>
                            <button 
                                className="btn-secondary full-width" 
                                onClick={() => setShowClaimModal(false)}
                                style={{ marginTop: '10px' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mount the secure Stripe Modal */}
            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                orderData={{
                    selectedSeatIds,
                    bleachersBL: bleacherCounts.BL,
                    bleachersBR: bleacherCounts.BR,
                    vipUpgrades,
                    amount: subtotal,
                    accessCode // Pass accessCode to backend for discount
                }}
            />
        </section>
    );
}

export default SeatMap;
