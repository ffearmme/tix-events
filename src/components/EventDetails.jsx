import React from 'react';
import './EventDetails.css';

function EventDetails({ data }) {
    return (
        <section id="event-info" className="section-padding event-details-section">
            <div className="container">
                <h2 className="section-title">Event Information</h2>

                <div className="details-grid">
                    <div className="detail-item">
                        <span className="detail-label">Location</span>
                        <span className="detail-value">{data.CITY_STATE}</span>
                    </div>
                    <div className="detail-item full-width">
                        <span className="detail-label">Venue Address</span>
                        <span className="detail-value">{data.VENUE_ADDRESS}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Doors Open</span>
                        <span className="detail-value">{data.DOORS_OPEN}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Show Starts</span>
                        <span className="detail-value">{data.SHOW_START}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">VIP Acoustic & Q&A</span>
                        <span className="detail-value">{data.VIP_SESSION || "7:00-7:30 PM"}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Age Policy</span>
                        <span className="detail-value">{data.AGE_POLICY}</span>
                    </div>
                    <div className="detail-item full-width">
                        <span className="detail-label">Arrival & Parking</span>
                        <span className="detail-value">{data.PARKING}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default EventDetails;
