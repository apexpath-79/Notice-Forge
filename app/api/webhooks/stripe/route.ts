import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    const data = {
      claimantName: metadata.claimantName || 'ApexPath Systems',
      claimantAddress: metadata.claimantAddress || 'Standard Business Address',
      ownerName: metadata.ownerName || 'Property Owner',
      ownerAddress: metadata.ownerAddress || 'Owner Address on Record',
      directContractorName: metadata.directContractorName || 'Prime Contractor',
      directContractorAddress: metadata.directContractorAddress || 'Contractor Address',
      constructionLender: metadata.constructionLender || 'None Specified',
      jobAddress: metadata.jobAddress || 'California Project Location',
      workDescription: metadata.workDescription || 'Labor, services, equipment, and materials furnished.',
      estimatedAmount: metadata.estimatedAmount || '0.00',
      amountDue: metadata.amountDue || metadata.estimatedAmount || '0.00',
      dateWorkStarted: metadata.dateWorkStarted || new Date().toISOString().split('T')[0],
      hiringParty: metadata.hiringParty || 'Hiring Entity',
    };

    // -------------------------------------------------------------------------
    // PDF 1: California 20-Day Preliminary Notice (Civil Code § 8200)
    // -------------------------------------------------------------------------
    const doc1 = new jsPDF();
    doc1.setFont('helvetica', 'bold');
    doc1.setFontSize(16);
    doc1.text('CALIFORNIA 20-DAY PRELIMINARY NOTICE', 105, 20, { align: 'center' });

    doc1.setFontSize(10);
    doc1.setFont('helvetica', 'normal');
    doc1.text('PURSUANT TO CALIFORNIA CIVIL CODE SECTIONS 8200-8216 & 9300-9306', 105, 27, { align: 'center' });

    doc1.setFillColor(240, 240, 240);
    doc1.rect(14, 34, 182, 38, 'F');
    doc1.setFont('helvetica', 'bold');
    doc1.setFontSize(9);
    doc1.text('STATUTORY NOTICE TO PROPERTY OWNER:', 18, 41);
    doc1.setFont('helvetica', 'normal');
    doc1.setFontSize(8);
    const noticeText = 'EVEN THOUGH YOU HAVE PAID YOUR CONTRACTOR IN FULL, if the person or firm that has given you this notice is not paid in full for labor, service, equipment, or material provided or to be provided to your construction project, a lien may be placed on your property. Foreclosure of the lien may lead to loss of all or part of your property. You may wish to protect yourself against this consequence by (1) requiring your contractor to provide a signed release by the person or firm that has given you this notice before you pay your contractor, or (2) any other method or device that is appropriate under the circumstances.';
    doc1.text(doc1.splitTextToSize(noticeText, 174), 18, 47);

    doc1.setFontSize(10);
    doc1.setFont('helvetica', 'bold');
    doc1.text('1. CLAIMANT (Party Furnishing Labor, Services, Equipment, or Materials):', 14, 82);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Name: ${data.claimantName}`, 20, 88);
    doc1.text(`Address: ${data.claimantAddress}`, 20, 94);

    doc1.setFont('helvetica', 'bold');
    doc1.text('2. PROPERTY OWNER (or Reputed Owner):', 14, 104);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Name: ${data.ownerName}`, 20, 110);
    doc1.text(`Address: ${data.ownerAddress}`, 20, 116);

    doc1.setFont('helvetica', 'bold');
    doc1.text('3. DIRECT / PRIME CONTRACTOR:', 14, 126);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Name: ${data.directContractorName}`, 20, 132);
    doc1.text(`Address: ${data.directContractorAddress}`, 20, 138);

    doc1.setFont('helvetica', 'bold');
    doc1.text('4. CONSTRUCTION LENDER (or Reputed Lender):', 14, 148);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Lender / Entity: ${data.constructionLender}`, 20, 154);

    doc1.setFont('helvetica', 'bold');
    doc1.text('5. DESCRIPTION OF WORK & ESTIMATED VALUE:', 14, 166);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Job Site Address: ${data.jobAddress}`, 20, 172);
    doc1.text(`Work/Materials: ${data.workDescription}`, 20, 178);
    doc1.text(`Estimated Total Price: $${data.estimatedAmount}`, 20, 184);

    doc1.setFont('helvetica', 'bold');
    doc1.text('DECLARATION / SIGNATURE:', 14, 202);
    doc1.setFont('helvetica', 'normal');
    doc1.text(`Date: ${new Date().toLocaleDateString('en-US')}`, 20, 210);
    doc1.text(`Authorized Agent for ${data.claimantName}: _____________________________________`, 20, 222);

    const pdf1Base64 = Buffer.from(doc1.output('arraybuffer')).toString('base64');

    // -------------------------------------------------------------------------
    // PDF 2: Proof of Service Affidavit & Declaration (Civil Code § 8118)
    // -------------------------------------------------------------------------
    const doc2 = new jsPDF();
    doc2.setFont('helvetica', 'bold');
    doc2.setFontSize(16);
    doc2.text('PROOF OF SERVICE AFFIDAVIT & DECLARATION', 105, 20, { align: 'center' });

    doc2.setFontSize(10);
    doc2.setFont('helvetica', 'normal');
    doc2.text('CALIFORNIA CIVIL CODE SECTION 8118', 105, 27, { align: 'center' });

    doc2.setFontSize(10);
    doc2.text(`I, the undersigned, declare under penalty of perjury under the laws of the State of California:`, 14, 45);
    doc2.text(`1. That I served copies of the attached California 20-Day Preliminary Notice on the following parties:`, 14, 55);

    doc2.setFont('helvetica', 'bold');
    doc2.text('A. OWNER / REPUTED OWNER:', 20, 67);
    doc2.setFont('helvetica', 'normal');
    doc2.text(`Party: ${data.ownerName} at ${data.ownerAddress}`, 25, 73);
    doc2.text(`Manner of Service: Registered Mail / Certified Mail / Express Mail / Overnight Delivery`, 25, 79);
    doc2.text(`Tracking Number / Barcode: __________________________________________________`, 25, 85);

    doc2.setFont('helvetica', 'bold');
    doc2.text('B. DIRECT CONTRACTOR:', 20, 99);
    doc2.setFont('helvetica', 'normal');
    doc2.text(`Party: ${data.directContractorName} at ${data.directContractorAddress}`, 25, 105);
    doc2.text(`Manner of Service: Registered Mail / Certified Mail / Express Mail / Overnight Delivery`, 25, 111);
    doc2.text(`Tracking Number / Barcode: __________________________________________________`, 25, 117);

    doc2.setFont('helvetica', 'bold');
    doc2.text('2. DATE AND PLACE OF DISPATCH:', 14, 133);
    doc2.setFont('helvetica', 'normal');
    doc2.text(`Dispatched on (Date): ________________________ at (City/State): ________________________`, 20, 141);

    doc2.text('I declare under penalty of perjury under the laws of the State of California that the foregoing', 14, 165);
    doc2.text('is true and correct.', 14, 172);

    doc2.setFont('helvetica', 'bold');
    doc2.text('Executed this _____ day of __________________, 20____', 14, 190);
    doc2.text('Declarant Signature: ____________________________________________________', 14, 204);

    const pdf2Base64 = Buffer.from(doc2.output('arraybuffer')).toString('base64');

    // -------------------------------------------------------------------------
    // PDF