import React, { useState } from 'react';
import './FAQ.css';

function FAQ({ data }) {
    const [openIndex, setOpenIndex] = useState(null);

    const toggleOpen = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="section-padding faq-section">
            <div className="container">
                <h2 className="section-title">Common Questions</h2>

                <div className="faq-list">
                    {data.FAQ.map((item, index) => (
                        <div
                            key={index}
                            className={`faq-item ${openIndex === index ? 'open' : ''}`}
                        >
                            <button
                                className="faq-question"
                                onClick={() => toggleOpen(index)}
                                aria-expanded={openIndex === index}
                            >
                                <span>{item.q}</span>
                                <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
                            </button>
                            <div
                                className="faq-answer-wrapper"
                                style={{ maxHeight: openIndex === index ? '200px' : '0' }}
                            >
                                <p className="faq-answer">{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FAQ;
