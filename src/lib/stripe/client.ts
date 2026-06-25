import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Singleton Stripe.js promise (mon-1.3b). The publishable key is public by design
// (pk_test_… / pk_live_…) and read from NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/** Whether a publishable key is configured (used to hide the buy UI otherwise). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
