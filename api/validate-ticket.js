import { db } from './firebase.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ valid: false, message: 'NO ID PROVIDED' });
    }

    try {
        const ticketRef = db.collection('tickets').doc(id);
        const ticketDoc = await ticketRef.get();

        if (!ticketDoc.exists) {
            return res.status(200).json({ valid: false, message: 'INVALID QR CODE: TICKET NOT FOUND' });
        }

        const ticket = ticketDoc.data();

        if (ticket.used) {
            return res.status(200).json({ valid: false, message: 'ALREADY SCANNED!', ticket });
        }

        // Mark as used
        await ticketRef.update({ used: true });
        ticket.used = true;

        return res.status(200).json({ valid: true, message: 'SUCCESS! TICKET VALID.', ticket });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to verify ticket' });
    }
}
