import admin from 'firebase-admin';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files from root
dotenv.config({ path: path.resolve(__dirname, '../.env.development.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

if (!admin.apps.length) {
    if (process.env.FIREBASE_PROJECT_ID) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTicketEmail(destEmail, newTickets, orderId) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_test_replace_me') {
        console.error("❌ Cannot send email: RESEND_API_KEY is missing or placeholder");
        return;
    }
    if (!destEmail) return;

    const fromAddress = (apiKey.includes('replace_me')) 
        ? 'onboarding@resend.dev' 
        : 'Tickets <tickets@spencerhollandmusic.com>';

    const ticketDOM = newTickets.map(t => `
        <div style="background: #222; border-left: 4px solid #dfa759; padding: 24px; margin: 30px 0; border-radius: 4px; text-align: center;">
            <h2 style="margin-top: 0; color: #fff; margin-bottom: 4px;">Spencer Holland</h2>
            <p style="color: #ccc; margin-top: 0;"><strong>Date:</strong> April 11th, 2026</p>
            <p style="color: #ccc; margin-top: 4px;"><strong>Venue:</strong> 9075 Pueblo Ave NE Brooks, OR 97305</p>
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
        console.log(`Sending ticket email to ${destEmail} from ${fromAddress}...`);
        const result = await resend.emails.send({
            from: fromAddress,
            to: destEmail,
            subject: 'Your Time of My Life Tour Tickets',
            html: ticketHTML
        });
        if (result.error) {
            console.error("❌ Resend API Error:", JSON.stringify(result.error, null, 2));
        } else {
            console.log("✅ Ticket email sent:", result.data?.id);
        }
    } catch (err) {
        console.error("❌ Unexpected error sending ticket email:", err);
    }
}

async function resendByOrderId(orderId) {
    console.log(`Searching for tickets with Order ID: ${orderId}...`);
    const snapshot = await db.collection('tickets').where('orderId', '==', orderId).get();
    
    if (snapshot.empty) {
        console.error(`No tickets found for Order ID: ${orderId}`);
        return;
    }

    const tickets = [];
    let email = '';
    snapshot.forEach(doc => {
        const ticket = doc.data();
        tickets.push({
            id: doc.id,
            type: ticket.type,
            seatInfo: ticket.seatInfo,
            vip: ticket.vip
        });
        if (!email) email = ticket.buyerEmail;
    });

    if (!email || email === 'No Email') {
        console.error(`No valid email found for Order ID: ${orderId}`);
        return;
    }

    console.log(`Found ${tickets.length} tickets for ${email}. Resending email...`);
    await sendTicketEmail(email, tickets, orderId);
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Usage: node scripts/resend-tickets.js <orderId1> <orderId2> ...");
} else {
    for (const orderId of args) {
        await resendByOrderId(orderId);
    }
}
