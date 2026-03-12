import fs from 'fs';

const data = JSON.parse(fs.readFileSync('printful_dump.json', 'utf8'));

const mapping = {};

for (const productId in data) {
    const product = data[productId].result;
    const name = product.sync_product.name;
    mapping[name] = {};
    
    product.sync_variants.forEach(variant => {
        const color = variant.color;
        // Find the mockup preview_url
        const mockupFile = variant.files.find(f => f.type === 'mockup' || f.type === 'preview');
        if (mockupFile && mockupFile.preview_url && !mapping[name][color]) {
            mapping[name][color] = mockupFile.preview_url;
        }
    });
}

console.log(JSON.stringify(mapping, null, 2));
