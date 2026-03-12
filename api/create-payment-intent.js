import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_replace_me');

const getStandardPrice = (rowStr) => {
    switch (rowStr) {
        case 'A': return 25;
        case 'B': case 'C': return 20;
        case 'D': case 'E': return 15;
        case 'F': case 'G': return 10;
        default: return 45;
    }
};

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
        joinMailingList 
    } = req.body;

    let totalInDollars = 0;

    // Calculate Tickets total
    if (Array.isArray(selectedSeatIds)) {
        selectedSeatIds.forEach(id => {
            const rowStr = id.split('-')[0];
            totalInDollars += getStandardPrice(rowStr);
        });
    }

    const bleacherCount = (parseInt(bleachersBL) || 0) + (parseInt(bleachersBR) || 0);
    totalInDollars += (bleacherCount * 5);

    const vipCount = parseInt(vipUpgrades) || 0;
    totalInDollars += (vipCount * 25);

    // Calculate Merch total
    if (Array.isArray(merchItems)) {
        merchItems.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            totalInDollars += price;
        });
    }

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
                joinMailingList: joinMailingList ? 'true' : 'false'
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
