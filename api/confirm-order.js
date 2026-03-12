import Stripe from 'stripe';
import { db } from './firebase.js';
import crypto from 'crypto';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_replace_me');
const resend = new Resend(process.env.RESEND_API_KEY || 're_test_replace_me');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { payment_intent } = req.body;
    if (!payment_intent) return res.status(400).json({ error: 'Missing payment intent' });

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

        if (paymentIntent.status === 'succeeded') {
            const result = await processOrder(paymentIntent);
            res.status(200).json(result);
        } else {
            res.status(400).json({ error: 'Payment not successful' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function processOrder(paymentIntent) {
    const { selectedSeatIds, bleachersBL, bleachersBR, vipUpgrades, email, joinMailingList } = paymentIntent.metadata || {};
    const destEmail = paymentIntent.receipt_email || email;

    const ticketsQuery = await db.collection('tickets').where('orderId', '==', paymentIntent.id).get();
    if (!ticketsQuery.empty) {
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

    // Subscribe to Mailchimp mailing list if opted in
    if (joinMailingList === 'true' && destEmail) {
        try {
            const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
            const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
            const MAILCHIMP_DC = MAILCHIMP_API_KEY ? MAILCHIMP_API_KEY.split('-').pop() : 'us15';

            if (MAILCHIMP_API_KEY && MAILCHIMP_LIST_ID) {
                const subscriberHash = await import('crypto').then(c =>
                    c.createHash('md5').update(destEmail.toLowerCase()).digest('hex')
                );

                const response = await fetch(
                    `https://${MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${MAILCHIMP_LIST_ID}/members/${subscriberHash}`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `apikey ${MAILCHIMP_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email_address: destEmail,
                            status_if_new: 'subscribed',
                            status: 'subscribed'
                        })
                    }
                );

                if (response.ok) {
                    console.log(`Mailchimp: ${destEmail} subscribed successfully.`);
                } else {
                    const errData = await response.json();
                    console.error('Mailchimp subscription error:', errData);
                }
            } else {
                console.log('Mailchimp API key or list ID not configured. Skipping subscription.');
            }
        } catch (err) {
            console.error('Failed to subscribe to Mailchimp:', err);
        }
    }

    return { success: true, alreadyProcessed: false };
}
