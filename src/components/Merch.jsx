import React, { useState } from 'react';
import './Merch.css';
import CheckoutModal from './CheckoutModal';
import { MERCH_PRODUCTS } from '../data/merchData';

function Merch() {
    const [zoomedImage, setZoomedImage] = useState(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    
    // Track selections: { productId: { colorName: string, size: string } }
    const [selections, setSelections] = useState(
        MERCH_PRODUCTS.reduce((acc, p) => ({
            ...acc,
            [p.id]: { color: p.colors[0], size: p.sizes[1], view: 'front' } // Default to 1st color, 2nd size, front view
        }), {})
    );

    const handleBuyNow = (product) => {
        const selection = selections[product.id];
        const variantKey = `${selection.color.name}-${selection.size}`;
        const variantId = product.variants[variantKey];

        setSelectedItem({
            ...product,
            selectedColor: selection.color.name,
            selectedSize: selection.size,
            variantId: variantId,
            // Keep original price and name for Stripe
            stripeName: `${product.name} - ${selection.color.name} / ${selection.size}`
        });
        setShowCheckout(true);
    };

    const handleSelectionChange = (productId, type, value) => {
        setSelections(prev => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [type]: value
            }
        }));
    };

    const handleImageClick = (imageUrl) => {
        setZoomedImage(imageUrl);
    };

    const closeZoom = () => {
        setZoomedImage(null);
    };

    return (
        <section id="merch-section" className="merch-section">
            <div className="container merch-container">
                <div className="merch-header animate-fade-in">
                    <h2 className="merch-title">Tour Drops</h2>
                    <p className="merch-subtitle">Limited Edition Gear for the Time of My Life Tour</p>
                </div>
                <div className="merch-grid">
                    {MERCH_PRODUCTS.map((product) => {
                        const currentSelection = selections[product.id];
                        const displayImage = currentSelection.view === 'front'
                            ? (product.mockupUrls?.[currentSelection.color.name] || product.image)
                            : (product.backMockupUrls?.[currentSelection.color.name] || product.image);

                        return (
                            <div key={product.id} className="merch-card animate-fade-in">
                                {product.tag && <div className="merch-tag">{product.tag}</div>}
                                <div className="merch-image-container">
                                    <div className="merch-image-wrapper" onClick={() => handleImageClick(displayImage)}>
                                        <img src={displayImage} alt={product.name} className="merch-image" />
                                        <div className="image-overlay-hint">Click to enlarge</div>
                                    </div>
                                    
                                    {product.backMockupUrls && (
                                        <div className="view-selector">
                                            <button 
                                                className={`view-btn ${currentSelection.view === 'front' ? 'active' : ''}`}
                                                onClick={() => handleSelectionChange(product.id, 'view', 'front')}
                                            >
                                                Front
                                            </button>
                                            <button 
                                                className={`view-btn ${currentSelection.view === 'back' ? 'active' : ''}`}
                                                onClick={() => handleSelectionChange(product.id, 'view', 'back')}
                                            >
                                                Back
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="merch-info">
                                    <h3 className="merch-item-name">{product.name}</h3>
                                    <p className="merch-item-price">{product.price}</p>
                                    
                                    <div className="merch-selectors">
                                        <div className="selector-group">
                                            <label>Color: {currentSelection.color.name}</label>
                                            <div className="color-swatches">
                                                {product.colors.map(color => (
                                                    <button 
                                                        key={color.name}
                                                        className={`color-swatch ${currentSelection.color.name === color.name ? 'active' : ''}`}
                                                        style={{ backgroundColor: color.value }}
                                                        onClick={() => handleSelectionChange(product.id, 'color', color)}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="selector-group">
                                            <label>Size</label>
                                            <select 
                                                value={currentSelection.size}
                                                onChange={(e) => handleSelectionChange(product.id, 'size', e.target.value)}
                                                className="size-select"
                                            >
                                                {product.sizes.map(size => (
                                                    <option key={size} value={size}>{size}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <button 
                                        className="merch-button"
                                        onClick={() => handleBuyNow(product)}
                                    >
                                        Get Drop
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {zoomedImage && (
                <div className="merch-zoom-overlay" onClick={closeZoom}>
                    <div className="merch-zoom-content animate-fade-in">
                        <img src={zoomedImage} alt="Zoomed Merch" className="zoomed-image" />
                        <button className="close-zoom-btn" onClick={closeZoom}>×</button>
                    </div>
                </div>
            )}

            {selectedItem && (
                <CheckoutModal
                    isOpen={showCheckout}
                    onClose={() => {
                        setShowCheckout(false);
                        setSelectedItem(null);
                    }}
                    orderData={{
                        merchItems: [{
                            id: selectedItem.variantId, // Pass the Printful Sync Variant ID
                            name: selectedItem.stripeName,
                            price: selectedItem.price
                        }],
                        amount: parseFloat(selectedItem.price.replace('$', '')),
                        accessCode: sessionStorage.getItem('tix_access_code')
                    }}
                />
            )}
        </section>
    );
}

export default Merch;
