import React from 'react';
import './Tickets.css';

function TicketCard({ ticket }) {
    return (
        <div className="ticket-card">
            <div className="ticket-info">
                <h3 className="ticket-name">{ticket.name}</h3>
                <p className="ticket-desc">{ticket.description}</p>
            </div>
            <div className="ticket-action">
                <div className="ticket-price">{ticket.price}</div>
                <a href={ticket.link} target="_blank" rel="noopener noreferrer" className="btn-ticket">
                    Select
                </a>
            </div>
        </div>
    );
}

function Tickets({ data }) {
    return (
        <section id="tickets-section" className="section-padding tickets-section">
            <div className="container">
                <h2 className="section-title">Tickets</h2>
                <div className="tickets-grid">
                    {data.TICKETS.map(ticket => (
                        <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Tickets;
