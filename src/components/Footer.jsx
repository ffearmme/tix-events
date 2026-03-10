import React from 'react';
import './Footer.css';

function Footer({ data }) {
    return (
        <footer className="footer section-padding">
            <div className="container footer-container">
                <div className="footer-brand">
                    <h3>{data.ARTIST_NAME}</h3>
                    <p>{data.TOUR_NAME}</p>
                </div>

                <div className="footer-links">
                    <a href="#" className="footer-link">Instagram</a>
                    <a href="#" className="footer-link">Spotify</a>
                    <a href="#" className="footer-link">Apple Music</a>
                    <a href="#" className="footer-link">Contact</a>
                </div>

                <div className="footer-copy">
                    <p>&copy; {new Date().getFullYear()} {data.ARTIST_NAME}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
