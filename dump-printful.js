import fs from 'fs';

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

async function dumpData() {
    const products = [423548916, 423548223];
    const fullData = {};
    for (const id of products) {
        const res = await fetch(`https://api.printful.com/store/products/${id}`, {
            headers: { 'Authorization': `Bearer ${PRINTFUL_API_KEY}` }
        });
        fullData[id] = await res.json();
    }
    fs.writeFileSync('printful_dump.json', JSON.stringify(fullData, null, 2));
}
dumpData();
