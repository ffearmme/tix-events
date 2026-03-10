import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, useStripe, useElements } from '@stripe/react-stripe-js';
import './CheckoutModal.css';

// Make sure to call loadStripe outside of a component's render to avoid recreating the Stripe object on every render.
const stripePromise = loadStripe('pk_test_51S0GhlK3OtAWxQEBkrwMS33vbgugyFtF6obHIYPzUkO1Sacm88kvKVhj4n1SZqOxgWSACdiNMClhoZhsDBOC7dBi00lf5mZVz8');

const CheckoutForm = ({ clientSecret, onCancel, amount }) => {
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

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: window.location.origin,
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
            <h2 className="checkout-title">Complete Your Order</h2>
            <div className="checkout-total">Total: ${amount}</div>

            <div className="checkout-email-group">
                <p className="checkout-email-hint">Your ticket(s) and receipt will be sent here.</p>
                <LinkAuthenticationElement
                    id="link-authentication-element"
                    onChange={(e) => setEmail(e.value.email)}
                />
            </div>

            <PaymentElement id="payment-element" />

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

    useEffect(() => {
        if (isOpen && orderData) {
            // Create PaymentIntent as soon as the modal opens
            fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
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
    }, [isOpen, orderData]);

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
                        />
                    </Elements>
                )}
            </div>
        </div>
    );
}
