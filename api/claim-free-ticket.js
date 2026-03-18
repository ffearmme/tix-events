import { db } from './firebase.js';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_test_replace_me');

// Valid giveaway codes
const GIVEAWAY_CODES = ['GIVEAWAY2026', 'TIMEOFLIFE'];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { selectedSeatIds, vipUpgrades, accessCode, email: userEmail } = req.body;

    if (!GIVEAWAY_CODES.includes(accessCode)) {
        return res.status(403).json({ error: 'Invalid giveaway code' });
    }

    // Check if code has been used
    const usedCodeRef = db.collection('used_codes').doc(accessCode);
    const usedCodeDoc = await usedCodeRef.get();
    if (usedCodeDoc.exists) {
        return res.status(400).json({ error: 'This giveaway code has already been used.' });
    }

    if (!Array.isArray(selectedSeatIds) || selectedSeatIds.length === 0) {
        return res.status(400).json({ error: 'No seats selected' });
    }

    if (selectedSeatIds.length > 1) {
        return res.status(400).json({ error: 'Giveaway codes are only valid for 1 free ticket.' });
    }

    try {
        const orderId = `GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const destEmail = userEmail;
        
        if (!destEmail || !destEmail.includes('@')) {
            return res.status(400).json({ error: 'Valid email is required.' });
        }

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
            
            // Re-check availability during transaction
            const alreadySold = selectedSeatIds.some(id => currentStats.soldSeats.includes(id));
            if (alreadySold) {
                throw new Error("Sorry, that seat was just taken! Please select another one.");
            }

            const newSoldSeats = [...new Set([...currentStats.soldSeats, ...selectedSeatIds])];
            t.set(statsRef, {
                soldSeats: newSoldSeats,
                vipSold: (currentStats.vipSold || 0) + parseInt(vipUpgrades || 0)
            }, { merge: true });
        });
        
        // Mark giveaway code as used
        batch.set(usedCodeRef, {
            usedAt: new Date().toISOString(),
            email: destEmail,
            orderId: orderId,
            type: 'free_claim'
        });

        await batch.commit();

        await sendTicketEmail(destEmail, newTickets, orderId);

        res.status(200).json({ success: true, orderId });
    } catch (e) {
        console.error("Giveaway Claim Error: ", e);
        res.status(500).json({ error: e.message });
    }
}

async function sendTicketEmail(destEmail, newTickets, orderId) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_test_replace_me') {
        console.error("❌ Cannot send email: RESEND_API_KEY is missing or is the placeholder in .env");
        return;
    }

    if (!destEmail) {
        console.error("❌ Cannot send email: destination email is missing");
        return;
    }

    // Use onboarding@resend.dev as fallback if the domain isn't verified or using a test key
    const fromAddress = (apiKey.startsWith('re_') || process.env.NODE_ENV === 'development') 
        ? 'onboarding@resend.dev' 
        : 'Tickets <tickets@spencerhollandmusic.com>';

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
            <h1 style="color: #dfa759; text-align: center; text-transform: uppercase;">You Won! Your Free Ticket is here.</h1>
            <p style="text-align: center; color: #ccc;">Congratulations on winning the giveaway! We've attached your digital ticket below. See you at the show!</p>
            ${ticketDOM}
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">(Reference ID: ${orderId})</p>
        </div>
    `;

    try {
        console.log(`Attempting to send free ticket email to ${destEmail} from ${fromAddress}...`);
        const result = await resend.emails.send({
            from: fromAddress,
            to: destEmail,
            subject: 'Congratulations! Your Free Spencer Holland Ticket',
            html: ticketHTML
        });
        
        if (result.error) {
            console.error("❌ Resend API Error:", JSON.stringify(result.error, null, 2));
        } else {
            console.log("✅ Email sent successfully via Resend:", result.data?.id);
        }
    } catch (err) {
        console.error("❌ Unexpected error sending email:", err);
    }
}
