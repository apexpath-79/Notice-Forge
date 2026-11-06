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

  let event: Stripe.Event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};

    try {
      // 1. Build the Statutory Compliance PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Standard Letter
      const { height } = page.getSize();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let y = height - 50;

      // Header Banner
      page.drawRectangle({
        x: 40,
        y: y - 25,
        width: 532,
        height: 35,
        color: rgb(0.08, 0.12, 0.2),
      });

      page.drawText('CALIFORNIA 20-DAY PRELIMINARY NOTICE', {
        x: 55,
        y: y - 14,
        size: 14,
        font: fontBold,
        color: rgb(0.95, 0.75, 0.2),
      });

      y -= 45;

      page.drawText('Pursuant to California Civil Code §§ 8200–8216', {
        x: 55,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });

      y -= 30;

      // Form Field Sections Helper
      const drawSection = (title: string, fields: [string, string][]) => {
        page.drawText(title.toUpperCase(), {
          x: 55,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.25),
        });
        y -= 14;

        for (const [label, val] of fields) {
          page.drawText(`${label}:`, {
            x: 65,
            y,
            size: 9,
            font: fontBold,
            color: rgb(0.3, 0.35, 0.4),
          });
          page.drawText(val || 'N/A', {
            x: 210,
            y,
            size: 9,
            font: fontRegular,
            color: rgb(0.1, 0.1, 0.1),
          });
          y -= 14;
        }
        y -= 8;
      };

      drawSection('1. Claimant (Direct Contractor / Subcontractor)', [
        ['Company Name', meta.claimantName || ''],
        ['Email Address', meta.claimantEmail || ''],
        ['Phone Number', meta.claimantPhone || ''],
        ['Mailing Address', meta.claimantAddress || ''],
      ]);

      drawSection('2. Direct / General Contractor', [
        ['Contractor Name', meta.directContractorName || ''],
        ['Mailing Address', meta.directContractorAddress || ''],
      ]);

      drawSection('3. Property Owner', [
        ['Owner Name', meta.ownerName || ''],
        ['Owner Address', meta.ownerAddress || ''],
      ]);

      if (meta.constructionLenderName) {
        drawSection('4. Construction Lender', [
          ['Lender Name', meta.constructionLenderName || ''],
          ['Lender Address', meta.constructionLenderAddress || ''],
        ]);
      }

      drawSection('5. Jobsite & Work Scope', [
        ['Jobsite Address', meta.jobAddress || ''],
        ['Estimated Contract Value', meta.estimatedAmount ? `$${meta.estimatedAmount}` : 'N/A'],
        ['Description of Labor/Materials', meta.workDescription || ''],
      ]);

      // Statutory Warning Notice Box
      y -= 10;
      page.drawRectangle({
        x: 40,
        y: y - 55,
        width: 532,
        height: 55,
        color: rgb(0.96, 0.96, 0.98),
      });

      page.drawText('STATUTORY REQUIRED NOTICE TO PROPERTY OWNER:', {
        x: 50,
        y: y - 14,
        size: 8,
        font: fontBold,
        color: rgb(0.7, 0.1, 0.1),
      });

      const warningText =
        'Even if you pay your contractor in full, unpaid laborers, subcontractors, and material suppliers may record a mechanics lien against your real property. California law authorizes them to enforce their lien rights through a court foreclosure action.';

      page.drawText(warningText, {
        x: 50,
        y: y - 28,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth: 512,
        lineHeight: 10,
      });

      const pdfBytes = await pdfDoc.save();

      // 2. Send via Resend Email
      const recipient = meta.claimantEmail || session.customer_details?.email;

      if (recipient) {
        await resend.emails.send({
          from: 'ApexPath <onboarding@resend.dev>',
          to: recipient,
          subject: 'Your California Statutory Document Packet — ApexPath',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #0f172a;">Your Compliance Document is Ready</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Attached is your official <strong>California Preliminary 20-Day Notice</strong> for 
                <strong>${meta.jobAddress || 'your project'}</strong>.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;"><strong>Next Legal Steps:</strong></p>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
                  <li>Serve via USPS Certified Mail with Return Receipt Requested.</li>
                  <li>Retain certified mail receipts with this document for statutory proof of service.</li>
                </ol>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">ApexPath Legal Workflow Solutions</p>
            </div>
          `,
          attachments: [
            {
              filename: 'CA-20-Day-Preliminary-Notice.pdf',
              content: Buffer.from(pdfBytes),
            },
          ],
        });
      }
    } catch (err) {
      console.error('Error generating document or sending email:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}