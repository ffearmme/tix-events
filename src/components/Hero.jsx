import React from 'react';
import './Hero.css';

function Hero({ data }) {
    return (
        <section className="hero">
            <div className="hero-bg">
                <div className="hero-image-overlay"></div>
                <img src={data.POSTER_IMAGE} alt="Tour Poster" className="hero-poster-img" />
            </div>

            <div className="hero-content animate-fade-in">
                <h2 className="hero-tour">{data.ARTIST_NAME}</h2>
                <h1 className="hero-artist">{data.TOUR_NAME}</h1>

                <div className="hero-meta">
                    <p className="hero-date">{data.EVENT_DATE}</p>
                    <div className="hero-separator"></div>
                    <p className="hero-location">{data.CITY_STATE}</p>
                </div>

                <button
                    className="btn-primary hero-btn"
                    onClick={() => {
                        const el = document.getElementById('tickets-section');
                        if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
                    }}
                >
                    Buy Tickets
                </button>
            </div>
        </section>
    );
}

export default Hero;
