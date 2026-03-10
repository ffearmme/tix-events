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
                    <a href="https://www.instagram.com/itspencerholland/" target="_blank" rel="noopener noreferrer" className="footer-link">Instagram</a>
                    <a href="https://open.spotify.com/artist/4dUAs3uoXz2swQ2DcMLIQ1?si=do2ZzmknQV6NqGzzYxSXIA" target="_blank" rel="noopener noreferrer" className="footer-link">Spotify</a>
                    <a href="https://music.apple.com/us/artist/spencer-holland/1766686134" target="_blank" rel="noopener noreferrer" className="footer-link">Apple Music</a>
                    <a href="https://spencerhollandmusic.com" target="_blank" rel="noopener noreferrer" className="footer-link">Website</a>
                </div>

                <div className="footer-copy">
                    <p>&copy; {new Date().getFullYear()} {data.ARTIST_NAME}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
