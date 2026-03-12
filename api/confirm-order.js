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
    console.log("Confirming order for PI:", payment_intent);
    if (!payment_intent) return res.status(400).json({ error: 'Missing payment intent' });

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

        if (paymentIntent.status === 'succeeded') {
            console.log("PI succeeded, processing order...");
            const result = await processOrder(paymentIntent);
            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json({ error: result.error });
            }
        } else {
            res.status(400).json({ error: 'Payment not successful' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function createPrintfulOrder(paymentIntent, merchItems) {
    const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
    if (!PRINTFUL_API_KEY) {
        console.error('Printful API key not configured.');
        return { error: 'Printful API key missing' };
    }

    const shipping = paymentIntent.shipping;
    if (!shipping) {
        console.error('No shipping address found on payment intent.');
        return { error: 'Missing shipping address' };
    }

    const items = merchItems.map(item => ({
        sync_variant_id: item.id, // Frontend passes the real Printful Sync Variant ID
        quantity: 1,
        name: item.name
    }));

    const orderBody = {
        recipient: {
            name: shipping.name,
            address1: shipping.address.line1,
            address2: shipping.address.line2,
            city: shipping.address.city,
            state_code: shipping.address.state,
            country_code: shipping.address.country,
            zip: shipping.address.postal_code,
            email: paymentIntent.receipt_email || paymentIntent.metadata.email
        },
        items: items,
        external_id: paymentIntent.id // Link Printful order to Stripe PaymentIntent
    };

    console.log("Creating Printful order with body:", JSON.stringify(orderBody, null, 2));
    try {
        const response = await fetch('https://api.printful.com/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderBody)
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Printful order created successfully:', data.result.id);
            return { success: true, printfulOrderId: data.result.id };
        } else {
            console.error('Printful API Error:', data);
            return { error: data.error.message };
        }
    } catch (err) {
        console.error('Failed to create Printful order:', err);
        return { error: err.message };
    }
}

async function processOrder(paymentIntent) {
    const { 
        selectedSeatIds, 
        bleachersBL, 
        bleachersBR, 
        vipUpgrades, 
        merchItems,
        email, 
        joinMailingList 
    } = paymentIntent.metadata || {};
    const destEmail = paymentIntent.receipt_email || email;

    // 1. Handle Tickets if present
    let newTickets = [];
    let parsedSeats = [];

    if (selectedSeatIds) {
        const ticketsQuery = await db.collection('tickets').where('orderId', '==', paymentIntent.id).get();
        if (ticketsQuery.empty) {
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

            if (newTickets.length > 0) {
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

                // Send Ticket Email
                await sendTicketEmail(destEmail, newTickets, paymentIntent.id);
            }
        }
    }

    // 2. Handle Merch if present
    if (merchItems) {
        const parsedMerch = JSON.parse(merchItems);
        console.log("Processing merch items:", parsedMerch);
        if (parsedMerch.length > 0) {
            const merchResult = await createPrintfulOrder(paymentIntent, parsedMerch);
            if (merchResult.error) {
                return { success: false, error: `Printful Error: ${merchResult.error}` };
            }
        }
    }

    // 3. Handle Subscription
    if (joinMailingList === 'true' && destEmail) {
        await subscribeToMailchimp(destEmail);
    }

    return { success: true, alreadyProcessed: false };
}

async function sendTicketEmail(destEmail, newTickets, orderId) {
    if (!process.env.RESEND_API_KEY || !destEmail) return;

    const ticketDOM = newTickets.map(t => `
        <div style="background: #222; border-left: 4px solid #dfa759; padding: 24px; margin: 30px 0; border-radius: 4px; text-align: center;">
            <h2 style="margin-top: 0; color: #fff; margin-bottom: 4px;">Spencer Holland</h2>
            <p style="color: #ccc; margin-top: 0;"><strong>Date:</strong> April 11th, 2026</p>
            <p style="color: #ccc;"><strong>Type:</strong> ${t.type}</p>
            <p style="color: #ccc; font-size: 1.2em;"><strong>Seat:</strong> ${t.seatInfo}</p>
            ${t.vip ? '<p style="color: #dfa759; font-weight: bold; font-size: 1.1em; margin-bottom: 0;">★ VIP Access</p><p style="font-size: 0.85em; color: rgba(255,255,255,0.7); margin-top: 4px;">Arrive at 6:30 PM for acoustic set</p>' : ''}
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${t.id}" alt="QR Code" style="margin-top: 20px; border-radius: 8px; border: 4px solid #fff;"/>
        </div>
    `).join('');

    const ticketHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dfa759; text-align: center; text-transform: uppercase;">You're officially going to the Time of My Life Tour!</h1>
            <p style="text-align: center; color: #ccc;">Here are your official digital tickets. Show the QR code(s) below at the door.</p>
            ${ticketDOM}
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">(Order ID: ${orderId})</p>
        </div>
    `;

    try {
        await resend.emails.send({
            from: 'Tickets <tickets@spencerhollandmusic.com>',
            to: destEmail,
            subject: 'Your Time of My Life Tour Tickets',
            html: ticketHTML
        });
    } catch (err) {
        console.error("Failed to send email:", err);
    }
}

async function subscribeToMailchimp(destEmail) {
    try {
        const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
        const MAILCHIMP_LIST_ID = process.env.MAILCHIMP_LIST_ID;
        if (!MAILCHIMP_API_KEY || !MAILCHIMP_LIST_ID) return;

        const MAILCHIMP_DC = MAILCHIMP_API_KEY.split('-').pop();
        const subscriberHash = crypto.createHash('md5').update(destEmail.toLowerCase()).digest('hex');

        await fetch(
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
    } catch (err) {
        console.error('Mailchimp error:', err);
        // We don't necessarily want to fail the whole order if Mailchimp fails,
        // but we'll log it.
    }
}

