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
        sync_variant_id: Number(item.id),
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
        external_id: paymentIntent.id
    };

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
        if (parsedMerch.length > 0) {
            const merchResult = await createPrintfulOrder(paymentIntent, parsedMerch);
            if (!merchResult.error) {
                // Send Merch Confirmation Email
                await sendMerchEmail(destEmail, parsedMerch, paymentIntent.id);
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
            ${t.vip ? '<p style="color: #dfa759; font-weight: bold; font-size: 1.1em; margin-bottom: 0;">★ VIP Access</p><p style="font-size: 0.85em; color: rgba(255,255,255,0.7); margin-top: 4px;">Arrive at 7:00 PM for acoustic set</p>' : ''}
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

async function sendMerchEmail(destEmail, merchItems, orderId) {
    if (!process.env.RESEND_API_KEY || !destEmail) return;

    const merchRows = merchItems.map(item => `
        <div style="border-bottom: 1px solid #333; padding: 15px 0;">
            <p style="margin: 0; color: #fff;"><strong>${item.name}</strong></p>
            <p style="margin: 5px 0 0; color: #888; font-size: 0.9em;">Price: ${item.price}</p>
        </div>
    `).join('');

    const merchHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111; color: #fff; padding: 40px; border-radius: 8px;">
            <h1 style="color: #dfa759; text-align: center; text-transform: uppercase;">Thanks for supporting Spencer Holland!</h1>
            <p style="text-align: center; color: #ccc;">Your merch order has been received and is being processed.</p>
            
            <div style="background: #222; padding: 25px; margin: 30px 0; border-radius: 4px;">
                <h3 style="margin-top: 0; color: #dfa759; border-bottom: 1px solid #444; padding-bottom: 10px;">Order Summary</h3>
                ${merchRows}
            </div>

            <p style="color: #ccc; line-height: 1.6;">
                <strong>Shipping Update:</strong> Once your items ship, we will send you a separate email with your tracking number. 
                Please allow 3-7 business days for fulfillment as all items are made to order.
            </p>

            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 40px;">(Order ID: ${orderId})</p>
        </div>
    `;

    try {
        await resend.emails.send({
            from: 'Spencer Holland Merch <merch@spencerhollandmusic.com>',
            to: destEmail,
            subject: 'Your Order Confirmation - Spencer Holland',
            html: merchHTML
        });
    } catch (err) {
        console.error("Failed to send merch email:", err);
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
    }
}

