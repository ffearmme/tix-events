import Stripe from 'stripe';
import { db } from './firebase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_replace_me');



export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { 
        selectedSeatIds, 
        bleachersBL, 
        bleachersBR, 
        vipUpgrades, 
        merchItems, 
        email, 
        joinMailingList,
        accessCode,
        amount
    } = req.body;

    const GIVEAWAY_CODE = 'GIVEAWAY2026';
    let discountAmount = 0;

    // Check if giveaway code is used and valid
    if (accessCode === GIVEAWAY_CODE) {
        const usedCodeRef = db.collection('used_codes').doc(accessCode);
        const usedCodeDoc = await usedCodeRef.get();
        if (usedCodeDoc.exists) {
            return res.status(400).json({ 
                error: { message: 'This giveaway code has already been used.' } 
            });
        }

        // We don't need to manually calculate discountAmount here anymore since
        // the client already factored it into the final `amount`.
    }

    // Use the amount from the client (since that's what's shown at checkout)
    let totalInDollars = amount || 0;

    const amountInCents = Math.round(totalInDollars * 100);

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents > 0 ? amountInCents : 100, // min $1
            currency: 'usd',
            receipt_email: email || undefined,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                selectedSeatIds: JSON.stringify(selectedSeatIds || []),
                bleachersBL: bleachersBL || 0,
                bleachersBR: bleachersBR || 0,
                vipUpgrades: vipUpgrades || 0,
                merchItems: JSON.stringify(merchItems || []),
                email: email || '',
                joinMailingList: joinMailingList ? 'true' : 'false',
                accessCode: accessCode || ''
            }
        });


        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (e) {
        console.error("Backend Error: ", e);
        res.status(400).json({
            error: {
                message: e.message,
            },
        });
    }
}
