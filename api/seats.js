import { db } from './firebase.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const statsDoc = await db.collection('stats').doc('event').get();
            let data = statsDoc.exists ? statsDoc.data() : { soldSeats: [], bleachersBLSold: 0, bleachersBRSold: 0, vipSold: 0 };
            res.status(200).json(data);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Database fetch failed' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
