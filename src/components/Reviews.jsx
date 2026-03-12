import React from 'react';
import './Reviews.css';

const REVIEWS = [
    {
        id: 1,
        text: "10/10, way more hype than I expected!!!",
        rating: 5
    },
    {
        id: 2,
        text: "The concert was so hype. Loved hearing all the songs Spencer was singing.",
        rating: 5
    },
    {
        id: 3,
        text: "Had a great time getting to see some fresh music performed live, highly recommend!",
        rating: 5
    }
];

function Reviews() {
    return (
        <section className="reviews-section">
            <div className="container reviews-container">
                <div className="reviews-header animate-fade-in">
                    <h2 className="reviews-title">Voices from the Tour</h2>
                    <p className="reviews-subtitle">Recent guest experiences from our last performance</p>
                </div>
                <div className="reviews-grid">
                    {REVIEWS.map((review) => (
                        <div key={review.id} className="review-card animate-fade-in">
                            <div className="review-stars">
                                {[...Array(review.rating)].map((_, i) => (
                                    <span key={i} className="star">★</span>
                                ))}
                            </div>
                            <p className="review-text">{review.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Reviews;
