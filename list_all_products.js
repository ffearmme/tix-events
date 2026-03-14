import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
console.log('Using API Key (masked):', PRINTFUL_API_KEY ? PRINTFUL_API_KEY.substring(0, 4) + '...' + PRINTFUL_API_KEY.substring(PRINTFUL_API_KEY.length - 4) : 'MISSING');

async function listProducts() {
    try {
        const response = await fetch('https://api.printful.com/store/products', {
            headers: {
                'Authorization': `Bearer ${PRINTFUL_API_KEY}`
            }
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

listProducts();
