import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, AddressElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './CheckoutModal.css';

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe('pk_live_51S0GheGcju86CIy1rcxwFxUvc12WwKvYh1nBHkwpDRH0A5XFnH8HkcKKzsBUGqiewx2ZYJ2dDVzohD9bsYz8l4QQ0095HwPBYl');

const CheckoutForm = ({ clientSecret, onCancel, amount, joinMailingList, setJoinMailingList, orderData }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!stripe) {
            return;
        }

        const clientSecretParam = new URLSearchParams(window.location.search).get(
            'payment_intent_client_secret'
        );

        if (!clientSecretParam) {
            return;
        }

        stripe.retrievePaymentIntent(clientSecretParam).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case 'succeeded':
                    setMessage('Payment succeeded!');
                    break;
                case 'processing':
                    setMessage('Your payment is processing.');
                    break;
                case 'requires_payment_method':
                    setMessage('Your payment was not successful, please try again.');
                    break;
                default:
                    setMessage('Something went wrong.');
                    break;
            }
        });
    }, [stripe]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js hasn't yet loaded.
            return;
        }

        setIsLoading(true);

        const purchaseType = orderData?.merchItems?.length > 0 ? 'merch' : 'tickets';
        
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `${window.location.origin}?purchaseType=${purchaseType}`,
                receipt_email: email,
            },
        });

        // This point will only be reached if there is an immediate error when confirming the payment. Otherwise, your customer will be redirected to your `return_url`.
        if (error.type === 'card_error' || error.type === 'validation_error') {
            setMessage(error.message);
        } else {
            setMessage('An unexpected error occurred.');
        }

        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit} className="stripe-payment-form">
            <div className="checkout-header">
                <h2 className="checkout-title">Complete Your Order</h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lock-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div className="checkout-total">Total: ${amount}</div>

            <div className="order-summary">
                {orderData?.selectedSeatIds?.length > 0 && (
                    <div className="summary-section">
                        <h4>Tickets</h4>
                        <div className="summary-badges">
                            {orderData.selectedSeatIds.map(id => <span key={id} className="summary-badge">{id}</span>)}
                        </div>
                    </div>
                )}
                {orderData?.merchItems?.length > 0 && (
                    <div className="summary-section">
                        <h4>Merch</h4>
                        <div className="summary-badges">
                            {orderData.merchItems.map(item => <span key={item.id} className="summary-badge">{item.name}</span>)}
                        </div>
                    </div>
                )}
            </div>

            <div className="checkout-email-group">
                <p className="checkout-email-hint">Your ticket(s) and receipt will be sent here.</p>
                <LinkAuthenticationElement
                    id="link-authentication-element"
                    onChange={(e) => setEmail(e.value.email)}
                />
                <label className="mailing-list-opt-in" id="mailing-list-checkbox">
                    <input
                        type="checkbox"
                        checked={joinMailingList}
                        onChange={(e) => setJoinMailingList(e.target.checked)}
                    />
                    <span className="custom-checkbox">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </span>
                    <span className="opt-in-text">Keep me updated on future shows & exclusive content</span>
                </label>
            </div>

            {orderData?.merchItems?.length > 0 && (
                <div className="checkout-shipping-group">
                    <p className="checkout-email-hint">Shipping Details</p>
                    <AddressElement options={{ mode: 'shipping' }} />
                </div>
            )}

            <div className="checkout-payment-group">
                <p className="checkout-email-hint">Payment Information</p>
                <PaymentElement id="payment-element" />
            </div>

            <div className="checkout-btn-group">
                <button
                    type="button"
                    className="btn-secondary cancel-btn"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="btn-primary pay-btn"
                >
                    <span id="button-text">
                        {isLoading ? <div className="spinner" id="spinner"></div> : 'Pay Now'}
                    </span>
                </button>
            </div>

            <div className="security-note">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="small-lock"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Your payment information is completely secure. All transactions are encrypted and processed by Stripe. We never see or store your credit card details.
            </div>

            {/* Show any error or success messages */}
            {message && <div id="payment-message" className="payment-msg">{message}</div>}
        </form>
    );
};

export default function CheckoutModal({
    isOpen,
    onClose,
    orderData
}) {
    const [clientSecret, setClientSecret] = useState('');
    const [apiError, setApiError] = useState('');
    const [joinMailingList, setJoinMailingList] = useState(true);

    useEffect(() => {
        if (isOpen && orderData) {
            // Create PaymentIntent as soon as the modal opens
            fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...orderData, joinMailingList }),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData?.error?.message || 'Network response was not ok');
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    } else if (data.error) {
                        setApiError(data.error.message || "Failed to initialize Stripe.");
                    }
                })
                .catch((err) => {
                    console.error("Fetch Error:", err);
                    setApiError(err.message || "Oh no! The backend server is not running or invalid Stripe keys.");
                });
        }
    }, [isOpen, orderData, joinMailingList]);

    if (!isOpen) return null;

    const appearance = {
        theme: 'night',
        variables: {
            fontFamily: 'Outfit, sans-serif',
            colorBackground: '#111111',
            colorText: '#ffffff',
            colorDanger: '#df1b41',
            colorPrimary: '#dfa759', // the gold accent
            spacingUnit: '4px',
            borderRadius: '6px',
        },
    };

    const options = {
        clientSecret,
        appearance,
    };

    return (
        <div className="checkout-modal-overlay">
            <div className="checkout-modal-content">
                {!clientSecret ? (
                    <div className="checkout-loading">
                        {apiError ? (
                            <div className="error-state">
                                <h3>Backend Disconnected</h3>
                                <p>{apiError}</p>
                                <button className="btn-secondary" onClick={onClose}>Go Back</button>
                            </div>
                        ) : (
                            <div className="spinner-container">
                                <div className="spinner"></div>
                                <p>Loading Secure Checkout...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <Elements options={options} stripe={stripePromise}>
                        <CheckoutForm
                            clientSecret={clientSecret}
                            onCancel={onClose}
                            amount={orderData.amount}
                            joinMailingList={joinMailingList}
                            setJoinMailingList={setJoinMailingList}
                            orderData={orderData}
                        />
                    </Elements>
                )}
            </div>
        </div>
    );
}
