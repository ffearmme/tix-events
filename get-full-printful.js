const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const productIds = [423709805, 423548223];

async function getFullProductData() {
    for (const id of productIds) {
        try {
            const response = await fetch(`https://api.printful.com/store/products/${id}`, {
                headers: {
                    'Authorization': `Bearer ${PRINTFUL_API_KEY}`
                }
            });
            const data = await response.json();
            console.log(`\n\n=== PRODUCT: ${data.result.sync_product.name} ===`);
            data.result.sync_variants.forEach(variant => {
                console.log(`\nVariant: ${variant.name}`);
                variant.files.forEach(file => {
                    console.log(`- ${file.type}: ${file.url}`);
                });
            });
        } catch (err) {
            console.error(err);
        }
    }
}

getFullProductData();
