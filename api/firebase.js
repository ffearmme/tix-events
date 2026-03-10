import admin from 'firebase-admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

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

export const db = admin.firestore();
