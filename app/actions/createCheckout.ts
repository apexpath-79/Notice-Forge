'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function createCheckoutSession(productType: 'notice' | 'lien' | 'bundle') {
  let unitAmount = 2900;
  let productName = 'ApexPath — California 20-Day Notice Packet';
  let description = 'Instant automated legal compliance document packet.';

  if (productType === 'lien') {
    unitAmount = 3900;
    productName = 'ApexPath — Mechanics Lien & Recording Packet';
  } else if (productType === 'bundle') {
    unitAmount = 6800; // $29 + $39 combined
    productName = 'ApexPath — Complete Contractor Protection Bundle (Notice + Lien)';
    description = 'Includes both the 20-Day Notice Packet and the Mechanics Lien & Recording Packet.';
  }

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: description,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?success=true&product=${productType}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/?canceled=true`,
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error.message || error);
    throw new Error(`Stripe Error: ${error.message || 'Failed to create checkout session.'}`);
  }
}