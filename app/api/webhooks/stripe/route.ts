import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = (session.metadata as Record<string, string>) || {};

    const recipient = 'apexpath.nodes@gmail.com';

    try {
      const fontRegular = StandardFonts.Helvetica;
      const fontBold = StandardFonts.HelveticaBold;

      // -------------------------------------------------------------
      // DOCUMENT 1: California 20-Day Preliminary Notice
      // -------------------------------------------------------------
      const doc1 = await PDFDocument.create();
      const page1 = doc1.addPage([612, 792]);
      const fBold1 = await doc1.embedFont(fontBold);
      const fReg1 = await doc1.embedFont(fontRegular);

      page1.drawRectangle({ x: 40, y: 720, width: 532, height: 35, color: rgb(0.08, 0.12, 0.2) });
      page1.drawText('CALIFORNIA 20-DAY PRELIMINARY NOTICE', { x: 55, y: 732, size: 14, font: fBold1, color: rgb(0.95, 0.75, 0.2) });
      page1.drawText('Pursuant to California Civil Code §§ 8200–8216', { x: 55, y: 700, size: 9, font: fReg1, color: rgb(0.4, 0.45, 0.5) });

      let y = 670;
      const drawFields = (page: any, fBold: any, fReg: any, title: string, fields: [string, string][]) => {
        page.drawText(title.toUpperCase(), { x: 55, y, size: 10, font: fBold, color: rgb(0.1, 0.15, 0.25) });
        y -= 14;
        for (const [k, v] of fields) {
          page.drawText(`${k}:`, { x: 65, y, size: 9, font: fBold, color: rgb(0.3, 0.35, 0.4) });
          page.drawText(v || 'N/A', { x: 210, y, size: 9, font: fReg, color: rgb(0.1, 0.1, 0.1) });
          y -= 14;
        }
        y -= 8;
      };

      drawFields(page1, fBold1, fReg1, '1. Claimant Information', [
        ['Company Name', meta.claimantName || 'ApexPath Client'],
        ['Email', meta.claimantEmail || recipient],
        ['Phone', meta.claimantPhone || 'N/A'],
        ['Address', meta.claimantAddress || 'N/A'],
      ]);

      drawFields(page1, fBold1, fReg1, '2. Direct Contractor', [
        ['Contractor Name', meta.directContractorName || 'N/A'],
        ['Address', meta.directContractorAddress || 'N/A'],
      ]);

      drawFields(page1, fBold1, fReg1, '3. Property Owner', [
        ['Owner Name', meta.ownerName || 'Property Owner'],
        ['Address', meta.ownerAddress || 'N/A'],
      ]);

      drawFields(page1, fBold1, fReg1, '4. Jobsite & Work Scope', [
        ['Jobsite Address', meta.jobAddress || 'Project Location'],
        ['Estimated Amount', meta.estimatedAmount ? `$${meta.estimatedAmount}` : 'N/A'],
        ['Labor / Materials', meta.workDescription || 'Statutory construction services'],
      ]);

      page1.drawRectangle({ x: 40, y: y - 50, width: 532, height: 50, color: rgb(0.96, 0.96, 0.98) });
      page1.drawText('STATUTORY REQUIRED WARNING TO PROPERTY OWNER:', { x: 50, y: y - 14, size: 8, font: fBold1, color: rgb(0.7, 0.1, 0.1) });
      page1.drawText('Even if you pay your contractor in full, unpaid subcontractors and suppliers may place a lien on your property under CA Civil Code.', {
        x: 50, y: y - 28, size: 7.5, font: fReg1, color: rgb(0.2, 0.2, 0.2), maxWidth: 512, lineHeight: 10,
      });

      const pdfBytes1 = await doc1.save();

      // -------------------------------------------------------------
      // DOCUMENT 2: Statutory Proof of Service Declaration
      // -------------------------------------------------------------
      const doc2 = await PDFDocument.create();
      const page2 = doc2.addPage([612, 792]);
      const fBold2 = await doc2.embedFont(fontBold);
      const fReg2 = await doc2.embedFont(fontRegular);

      page2.drawRectangle({ x: 40, y: 720, width: 532, height: 35, color: rgb(0.12, 0.18, 0.28) });
      page2.drawText('PROOF OF SERVICE AFFIDAVIT / DECLARATION', { x: 55, y: 732, size: 14, font: fBold2, color: rgb(1, 1, 1) });
      page2.drawText('California Civil Code § 8118 — Service Verification', { x: 55, y: 700, size: 9, font: fReg2, color: rgb(0.4, 0.45, 0.5) });

      y = 660;
      drawFields(page2, fBold2, fReg2, 'Service Affidavit Details', [
        ['Declarant / Server', meta.claimantName || 'Authorized Representative'],
        ['Served To', meta.ownerName || 'Property Owner'],
        ['Service Address', meta.ownerAddress || meta.jobAddress || 'N/A'],
        ['Method of Service', 'USPS Certified Mail, Return Receipt Requested'],
        ['Date of Mailing', new Date().toLocaleDateString('en-US')],
        ['Tracking Number (Fill in)', '________________________________________'],
      ]);

      page2.drawText('DECLARATION UNDER PENALTY OF PERJURY:', { x: 55, y: y - 20, size: 9, font: fBold2, color: rgb(0.1, 0.1, 0.1) });
      page2.drawText('I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct, and that this declaration was executed on the date stated above.', {
        x: 55, y: y - 35, size: 8.5, font: fReg2, color: rgb(0.3, 0.3, 0.3), maxWidth: 500, lineHeight: 12,
      });
      page2.drawText('Declarant Signature: ____________________________________   Date: ________________', { x: 55, y: y - 80, size: 9, font: fBold2, color: rgb(0.2, 0.2, 0.2) });

      const pdfBytes2 = await doc2.save();

      // -------------------------------------------------------------
      // DOCUMENT 3: Notice of Intent to Record a Mechanics Lien
      // -------------------------------------------------------------
      const doc3 = await PDFDocument.create();
      const page3 = doc3.addPage([612, 792]);
      const fBold3 = await doc3.embedFont(fontBold);
      const fReg3 = await doc3.embedFont(fontRegular);

      page3.drawRectangle({ x: 40, y: 720, width: 532, height: 35, color: rgb(0.4, 0.1, 0.1) });
      page3.drawText('NOTICE OF INTENT TO RECORD A MECHANICS LIEN', { x: 55, y: 732, size: 14, font: fBold3, color: rgb(1, 1, 1) });
      page3.drawText('10-Day Statutory Pre-Lien Demand for Payment', { x: 55, y: 700, size: 9, font: fReg3, color: rgb(0.4, 0.45, 0.5) });

      y = 660;
      drawFields(page3, fBold3, fReg3, 'Payment Demand Summary', [
        ['Demanding Claimant', meta.claimantName || 'ApexPath Client'],
        ['Target Property', meta.jobAddress || 'Project Location'],
        ['Property Owner', meta.ownerName || 'Property Owner'],
        ['Principal Amount Due', meta.estimatedAmount ? `$${meta.estimatedAmount}` : 'Demand Stated on Invoice'],
        ['Demand Period', '10 Days from Service Receipt'],
      ]);

      page3.drawText('DEMAND TERMS:', { x: 55, y: y - 20, size: 9, font: fBold3, color: rgb(0.7, 0.1, 0.1) });
      page3.drawText('Please take notice that unless payment of the full balance is remitted within ten (10) days, claimant will immediately record a verified Mechanics Lien against the subject property in the County Recorder\'s Office and commence civil foreclosure proceedings.', {
        x: 55, y: y - 35, size: 8.5, font: fReg3, color: rgb(0.2, 0.2, 0.2), maxWidth: 500, lineHeight: 12,
      });

      const pdfBytes3 = await doc3.save();

      // -------------------------------------------------------------
      // DOCUMENT 4: California Mechanics Lien Form
      // -------------------------------------------------------------
      const doc4 = await PDFDocument.create();
      const page4 = doc4.addPage([612, 792]);
      const fBold4 = await doc4.embedFont(fontBold);
      const fReg4 = await doc4.embedFont(fontRegular);

      page4.drawRectangle({ x: 40, y: 720, width: 532, height: 35, color: rgb(0.15, 0.15, 0.15) });
      page4.drawText('CLAIM OF MECHANICS LIEN', { x: 55, y: 732, size: 14, font: fBold4, color: rgb(1, 0.8, 0.2) });
      page4.drawText('California Civil Code §§ 8400–8494 — Official County Recording Instrument', { x: 55, y: 700, size: 9, font: fReg4, color: rgb(0.4, 0.45, 0.5) });

      y = 660;
      drawFields(page4, fBold4, fReg4, 'County Recorder Filing Information', [
        ['Lien Claimant', meta.claimantName || 'ApexPath Client'],
        ['Owner of Property', meta.ownerName || 'Property Owner'],
        ['Property / Parcel Address', meta.jobAddress || 'Project Location'],
        ['Total Claim Amount', meta.estimatedAmount ? `$${meta.estimatedAmount}` : 'To be specified upon recording'],
        ['Hiring Entity', meta.directContractorName || 'Owner Direct'],
      ]);

      page4.drawText('VERIFICATION:', { x: 55, y: y - 20, size: 9, font: fBold4, color: rgb(0.1, 0.1, 0.1) });
      page4.drawText('Claimant claims a lien upon the property above described for work and materials furnished. Claimant has given required preliminary notice. Signature below must be signed before a California Notary Public prior to County Recordation.', {
        x: 55, y: y - 35, size: 8.5, font: fReg4, color: rgb(0.2, 0.2, 0.2), maxWidth: 500, lineHeight: 12,
      });
      page4.drawText('Claimant Signature: ____________________________________   (Attach Notary Acknowledgment)', { x: 55, y: y - 80, size: 9, font: fBold4, color: rgb(0.1, 0.1, 0.1) });

      const pdfBytes4 = await doc4.save();

      // -------------------------------------------------------------
      // DISPATCH ALL 4 STATUTORY ATTACHMENTS VIA RESEND
      // -------------------------------------------------------------
      const { data, error } = await resend.emails.send({
        from: 'ApexPath <onboarding@resend.dev>',
        to: recipient,
        subject: 'Complete Contractor Protection Bundle — 4-Piece Statutory Packet',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #0f172a; margin-bottom: 12px;">Your 4-Piece Statutory Document Packet is Ready</h2>
            <p style="font-size: 14px; line-height: 1.6;">
              Attached are the four legal instruments comprising your <strong>Complete California Contractor Protection Bundle</strong> for 
              <strong>${meta.jobAddress || 'your project'}</strong>:
            </p>
            <ol style="margin: 16px 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.8;">
              <li><strong>01-CA-20-Day-Preliminary-Notice.pdf</strong> — Serve via Certified Mail within 20 days of commencing work.</li>
              <li><strong>02-Proof-of-Service-Affidavit.pdf</strong> — Retain with USPS certified mail barcode slips.</li>
              <li><strong>03-Notice-of-Intent-to-Lien.pdf</strong> — 10-day demand notice to issue if invoices go unpaid.</li>
              <li><strong>04-California-Mechanics-Lien-Claim.pdf</strong> — Statutory instrument for county recording with notary jurat.</li>
            </ol>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">ApexPath Legal Workflow Solutions</p>
          </div>
        `,
        attachments: [
          { filename: '01-CA-20-Day-Preliminary-Notice.pdf', content: Buffer.from(pdfBytes1) },
          { filename: '02-Proof-of-Service-Affidavit.pdf', content: Buffer.from(pdfBytes2) },
          { filename: '03-Notice-of-Intent-to-Lien.pdf', content: Buffer.from(pdfBytes3) },
          { filename: '04-California-Mechanics-Lien-Claim.pdf', content: Buffer.from(pdfBytes4) },
        ],
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: 'Email delivery failed', details: error }, { status: 500 });
      }

      console.log('All 4 documents dispatched successfully:', data);
    } catch (err: any) {
      console.error('Document compilation error:', err);
      return NextResponse.json({ error: 'Processing failed', message: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}