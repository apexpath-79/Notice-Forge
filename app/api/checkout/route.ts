import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

const PRODUCTS_MAP = {
  bundle_all: {
    amount: 10000,
    name: 'ApexPath — Complete Project Protection Pass (All 4 Forms)',
    description: 'Notice + Warning Demand + Statutory Waiver 4-Pack + County Lien Release (Save $20)',
  },
  notice: {
    amount: 2900,
    name: 'ApexPath — CA 20-Day Preliminary Notice Packet',
    description: 'California Civil Code §§ 8200–8216 statutory compliance document',
  },
  warning: {
    amount: 4900,
    name: 'ApexPath — Mechanics Lien Warning & Demand',
    description: '10-Day formal demand letter with statutory lien enforcement warning',
  },
  waivers: {
    amount: 1900,
    name: 'ApexPath — Statutory Lien Waiver 4-Pack',
    description: 'California Civil Code §§ 8132–8138 conditional and unconditional waivers',
  },
  release: {
    amount: 2300,
    name: 'ApexPath — County Mechanics Lien Release Form',
    description: 'Official county recorder title release with notary acknowledgment',
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const tierKey = (body.tier as keyof typeof PRODUCTS_MAP) || 'bundle_all';
    const itemConfig = PRODUCTS_MAP[tierKey] || PRODUCTS_MAP.bundle_all;

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get('origin') ||
      'https://notice-forge-rsv9.vercel.app';

    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: itemConfig.amount,
            product_data: {
              name: itemConfig.name,
              description: itemConfig.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier: tierKey,
        claimantName: body.claimantName || '',
        claimantEmail: body.claimantEmail || '',
        claimantPhone: body.claimantPhone || '',
        claimantAddress: body.claimantAddress || '',
        directContractorName: body.directContractorName || '',
        directContractorAddress: body.directContractorAddress || '',
        ownerName: body.ownerName || '',
        ownerAddress: body.ownerAddress || '',
        constructionLenderName: body.constructionLenderName || '',
        constructionLenderAddress: body.constructionLenderAddress || '',
        jobAddress: body.jobAddress || '',
        workDescription: body.workDescription || '',
        estimatedAmount: body.estimatedAmount || '',
      },
      customer_email: body.claimantEmail || undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize checkout session' },
      { status: 500 }
    );
  }
}