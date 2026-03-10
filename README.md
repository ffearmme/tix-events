# Tix - Event Ticketing Platform

This is the frontend and serverless backend for the Spencer Holland "Time of My Life Tour" ticketing platform.

## Deployment Instructions (Vercel)

This project is configured to be deployed on Vercel. Because it uses Firebase Admin SDK in the serverless functions (`/api/*`), you **must** configure the following Environment Variables in your Vercel project settings before the API will work:

1. **`FIREBASE_PROJECT_ID`**: Your Firebase project ID.
2. **`FIREBASE_CLIENT_EMAIL`**: The client email from your Firebase service account JSON.
3. **`FIREBASE_PRIVATE_KEY`**: The private key from your Firebase service account JSON.
   - *Important*: When pasting the private key into Vercel, make sure you include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts. Vercel will handle the `\n` characters correctly.
4. **`STRIPE_SECRET_KEY`**: Your Stripe secret key for processing payments.
5. **`RESEND_API_KEY`**: Your Resend API key for sending confirmation emails.

## Setting up the "tickets" Subdomain

1. Go to your project settings in Vercel.
2. Navigate to the **Domains** tab.
3. Add `tickets.spencerhollandmusic.com` (or your preferred domain).
4. Follow the instructions provided by Vercel to add the necessary CNAME or A records to your DNS provider.

---

*Note: `.env` files are ignored by git to keep your secrets safe. Do not commit your service account keys!*
