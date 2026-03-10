import Stripe from 'stripe';
import { Resend } from 'resend';
import { db } from './firebase.js';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_replace_me');
const resend = new Resend(process.env.RESEND_API_KEY || 're_test_replace_me');

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBody = Buffer.concat(chunks);

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook signature failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        await processOrder(paymentIntent);
    }

    res.status(200).json({ received: true });
}

async function processOrder(paymentIntent) {
    const { selectedSeatIds, bleachersBL, bleachersBR, vipUpgrades, email } = paymentIntent.metadata || {};
    const destEmail = paymentIntent.receipt_email || email;

    const ticketsQuery = await db.collection('tickets').where('orderId', '==', paymentIntent.id).get();
    if (!ticketsQuery.empty) {
        console.log("Order already processed:", paymentIntent.id);
        return { alreadyProcessed: true };
    }

    let newTickets = [];
    let parsedSeats = [];

    if (selectedSeatIds) {
        parsedSeats = JSON.parse(selectedSeatIds);
        let vipCount = parseInt(vipUpgrades || 0);

        parsedSeats.forEach(seat => {
            const isVip = vipCount > 0;
            if (isVip) vipCount--;

            newTickets.push({
                id: crypto.randomUUID(),
                orderId: paymentIntent.id,
                type: 'Reserved Seat',
                seatInfo: seat,
                vip: isVip,
                used: false,
                buyerEmail: destEmail || 'No Email'
            });
        });
    }

    const blCount = parseInt(bleachersBL || 0);
    const brCount = parseInt(bleachersBR || 0);

    for (let i = 0; i < blCount; i++) {
        newTickets.push({
            id: crypto.randomUUID(),
            orderId: paymentIntent.id,
            type: 'General Admission',
            seatInfo: 'Bleachers (Left)',
            vip: false,
            used: false,
            buyerEmail: destEmail || 'No Email'
        });
    }
    for (let i = 0; i < brCount; i++) {
        newTickets.push({
            id: crypto.randomUUID(),
            orderId: paymentIntent.id,
            type: 'General Admission',
            seatInfo: 'Bleachers (Right)',
            vip: false,
            used: false,
            buyerEmail: destEmail || 'No Email'
        });
    }

    if (newTickets.length === 0) return { alreadyProcessed: true };

    const batch = db.batch();

    newTickets.forEach(ticket => {
        const ticketRef = db.collection('tickets').doc(ticket.id);
        batch.set(ticketRef, ticket);
    });

    const statsRef = db.collection('stats').doc('event');

    await db.runTransaction(async (t) => {
        const statsDoc = await t.get(statsRef);
        let currentStats = statsDoc.exists ? statsDoc.data() : { soldSeats: [], bleachersBLSold: 0, bleachersBRSold: 0, vipSold: 0 };

        const newSoldSeats = [...new Set([...currentStats.soldSeats, ...parsedSeats])];

        t.set(statsRef, {
            soldSeats: newSoldSeats,
            bleachersBLSold: (currentStats.bleachersBLSold || 0) + blCount,
            bleachersBRSold: (currentStats.bleachersBRSold || 0) + brCount,
            vipSold: (currentStats.vipSold || 0) + parseInt(vipUpgrades || 0)
        }, { merge: true });
    });

    await batch.commit();

    // Build Email Layout
    const ticketDOM = newTickets.map(t => `
        <div style="background: #222; border-left: 4px solid #dfa759; padding: 24px; margin: 30px 0; border-radius: 4px; text-align: center;">
            <h2 style="margin-top: 0; color: #fff; margin-bottom: 4px;">Spencer Holland</h2>
            <p style="color: #ccc; margin-top: 0;"><strong>Date:</strong> April 11th, 2026</p>
            <p style="color: #ccc;"><strong>Type:</strong> ${t.type}</p>
            <p style="color: #ccc; font-size: 1.2em;"><strong>Seat:</strong> ${t.seatInfo}</p>
            ${t.vip ? '<p style="color: #dfa759; font-weight: bold; font-size: 1.1em; margin-bottom: 0;">★ VIP Access</p><p style="font-size: 0.85em; color: rgba(255,255,255,0.7); margin-top: 4px;">Arrive at 6:30 PM for acoustic set</p>' : ''}
            
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.id}" alt="QR Code" style="margin-top: 20px; border-radius: 8px; border: 4px solid #fff;"/>
            <p style="font-size: 10px; color: #666; margin-top: 10px;">Ticket ID: ${t.id}</p>
        </div>
    `).join('');

    const ticketHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dfa759; text-align: center; text-transform: uppercase;">You're officially going to the Time of My Life Tour!</h1>
            <p style="text-align: center; color: #ccc;">Here are your official digital tickets. Show the QR code(s) below at the door.</p>
            ${ticketDOM}
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">(Order ID: ${paymentIntent.id})</p>
        </div>
    `;

    if (process.env.RESEND_API_KEY && destEmail) {
        try {
            await resend.emails.send({
                from: 'Tickets <tickets@spencerhollandmusic.com>',
                to: destEmail,
                subject: 'Your Time of My Life Tour Tickets',
                html: ticketHTML
            });
            console.log("Ticket email sent to " + destEmail);
        } catch (err) {
            console.error("Failed to send email:", err);
        }
    } else {
        console.log("Payment processed manually. No Resend Key found.");
    }

    return { success: true, alreadyProcessed: false };
}
