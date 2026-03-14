import dotenv from 'dotenv';
dotenv.config();

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

async function testBasicAuth() {
    try {
        const auth = Buffer.from(PRINTFUL_API_KEY + ':').toString('base64');
        const response = await fetch('https://api.printful.com/store/products', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        const data = await response.json();
        console.log('Basic Auth Result:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testBasicAuth();
