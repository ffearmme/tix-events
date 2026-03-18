import { db } from './firebase.js';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_replace_me');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { selectedSeatIds, vipUpgrades, accessCode, email: userEmail } = req.body;

    if (accessCode !== 'SPENCERFAM' && accessCode !== 'BROTHER2026') {
        return res.status(403).json({ error: 'Invalid access code' });
    }

    if (!Array.isArray(selectedSeatIds) || selectedSeatIds.length === 0) {
        return res.status(400).json({ error: 'No seats selected' });
    }

    // Security check: ensure only the corrected seats are being claimed for free
    if (accessCode === 'SPENCERFAM') {
        const isOnlyParentSeats = selectedSeatIds.every(id => id === 'B-8' || id === 'B-9');
        if (!isOnlyParentSeats) {
            return res.status(403).json({ error: 'Only seats B8 and B9 can be claimed for free with this code.' });
        }
    } else if (accessCode === 'BROTHER2026') {
        const isOnlyBrotherSeats = selectedSeatIds.every(id => id === 'A-8');
        if (!isOnlyBrotherSeats) {
            return res.status(403).json({ error: 'Only seat A8 can be claimed for free with this code.' });
        }
    }

    try {
        const orderId = `FREE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const defaultEmail = accessCode === 'SPENCERFAM' 
            ? 'parents@spencerhollandmusic.com' 
            : 'brother@spencerhollandmusic.com'; 
        const destEmail = userEmail || defaultEmail;
        let newTickets = [];
        let vipCount = parseInt(vipUpgrades || 0);

        selectedSeatIds.forEach(seat => {
            const isVip = vipCount > 0;
            if (isVip) vipCount--;

            newTickets.push({
                id: crypto.randomUUID(),
                orderId: orderId,
                type: 'Reserved Seat',
                seatInfo: seat,
                vip: isVip,
                used: false,
                buyerEmail: destEmail
            });
        });

        const batch = db.batch();
        newTickets.forEach(ticket => {
            const ticketRef = db.collection('tickets').doc(ticket.id);
            batch.set(ticketRef, ticket);
        });

        const statsRef = db.collection('stats').doc('event');
        await db.runTransaction(async (t) => {
            const statsDoc = await t.get(statsRef);
            let currentStats = statsDoc.exists ? statsDoc.data() : { soldSeats: [], bleachersBLSold: 0, bleachersBRSold: 0, vipSold: 0 };
            const newSoldSeats = [...new Set([...currentStats.soldSeats, ...selectedSeatIds])];
            t.set(statsRef, {
                soldSeats: newSoldSeats,
                vipSold: (currentStats.vipSold || 0) + parseInt(vipUpgrades || 0)
            }, { merge: true });
        });
        
        await batch.commit();

        // Send Ticket Email (Reuse logic from confirm-order.js if possible, but here we inline it for the specific endpoint)
        await sendTicketEmail(destEmail, newTickets, orderId);

        res.status(200).json({ success: true, orderId });
    } catch (e) {
        console.error("Free Claim Error: ", e);
        res.status(500).json({ error: e.message });
    }
}

async function sendTicketEmail(destEmail, newTickets, orderId) {
    if (!process.env.RESEND_API_KEY || !destEmail) return;

    const ticketDOM = newTickets.map(t => `
        <div style="background: #222; border-left: 4px solid #dfa759; padding: 24px; margin: 30px 0; border-radius: 4px; text-align: center;">
            <h2 style="margin-top: 0; color: #fff; margin-bottom: 4px;">Spencer Holland</h2>
            <p style="color: #ccc; margin-top: 0;"><strong>Date:</strong> April 11th, 2026</p>
            <p style="color: #ccc;"><strong>Type:</strong> ${t.type}</p>
            <p style="color: #ccc; font-size: 1.2em;"><strong>Seat:</strong> ${t.seatInfo}</p>
            ${t.vip ? '<p style="color: #dfa759; font-weight: bold; font-size: 1.1em; margin-bottom: 0;">★ VIP Access</p><p style="font-size: 0.85em; color: rgba(255,255,255,0.7); margin-top: 4px;">Arrive at 7:00 PM for acoustic set</p>' : ''}
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.id}" alt="QR Code" style="margin-top: 20px; border-radius: 8px; border: 4px solid #fff;"/>
        </div>
    `).join('');

    const ticketHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dfa759; text-align: center; text-transform: uppercase;">Gift from Spencer: Your Free Tickets!</h1>
            <p style="text-align: center; color: #ccc;">Here are your official digital tickets for the Time of My Life Tour. See you there!</p>
            ${ticketDOM}
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">(Order ID: ${orderId})</p>
        </div>
    `;

    try {
        await resend.emails.send({
            from: 'Tickets <tickets@spencerhollandmusic.com>',
            to: destEmail,
            subject: 'Your Free Spencer Holland Tickets',
            html: ticketHTML
        });
    } catch (err) {
        console.error("Failed to send email:", err);
    }
}
