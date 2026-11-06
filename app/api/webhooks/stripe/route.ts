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
      const fontOblique = StandardFonts.HelveticaOblique;

      // Color Palette
      const cNavy = rgb(0.06, 0.12, 0.22);
      const cCrimson = rgb(0.48, 0.08, 0.08);
      const cCharcoal = rgb(0.15, 0.18, 0.22);
      const cSlate = rgb(0.35, 0.40, 0.48);
      const cDark = rgb(0.12, 0.14, 0.17);
      const cLine = rgb(0.78, 0.82, 0.88);
      const cLightBg = rgb(0.96, 0.97, 0.98);
      const cGold = rgb(0.85, 0.65, 0.13);
      const cWhite = rgb(1, 1, 1);

      // Helper: Draw standardized outer document page border
      const drawDocumentFrame = (page: any, width: number, height: number) => {
        page.drawRectangle({
          x: 25,
          y: 25,
          width: width - 50,
          height: height - 50,
          borderWidth: 1.5,
          borderColor: cCharcoal,
        });
        page.drawRectangle({
          x: 29,
          y: 29,
          width: width - 58,
          height: height - 58,
          borderWidth: 0.5,
          borderColor: cLine,
        });
      };

      // Helper: Draw standard table rows with clear label/value styling
      const drawTableSection = (
        page: any,
        startY: number,
        title: string,
        rows: [string, string][],
        fBold: any,
        fReg: any,
        accentColor = cNavy
      ) => {
        let curY = startY;
        const startX = 40;
        const totalW = 532;
        const labelW = 160;
        const rowH = 18;

        // Section Banner
        page.drawRectangle({
          x: startX,
          y: curY - rowH,
          width: totalW,
          height: rowH,
          color: accentColor,
        });
        page.drawText(title.toUpperCase(), {
          x: startX + 10,
          y: curY - 13,
          size: 8.5,
          font: fBold,
          color: cWhite,
        });
        curY -= rowH;

        // Rows
        for (let i = 0; i < rows.length; i++) {
          const [label, val] = rows[i];
          const bg = i % 2 === 0 ? cLightBg : cWhite;

          page.drawRectangle({
            x: startX,
            y: curY - rowH,
            width: totalW,
            height: rowH,
            color: bg,
            borderWidth: 0.5,
            borderColor: cLine,
          });

          // Label Cell
          page.drawText(label, {
            x: startX + 8,
            y: curY - 13,
            size: 8,
            font: fBold,
            color: cSlate,
          });

          // Vertical divider line
          page.drawLine({
            start: { x: startX + labelW, y: curY },
            end: { x: startX + labelW, y: curY - rowH },
            thickness: 0.5,
            color: cLine,
          });

          // Value Cell
          page.drawText(String(val || 'N/A'), {
            x: startX + labelW + 10,
            y: curY - 13,
            size: 8.5,
            font: fReg,
            color: cDark,
          });

          curY -= rowH;
        }

        return curY - 10;
      };

      // =========================================================================
      // DOCUMENT 1: CALIFORNIA 20-DAY PRELIMINARY NOTICE
      // =========================================================================
      const doc1 = await PDFDocument.create();
      const page1 = doc1.addPage([612, 792]);
      const fBold1 = await doc1.embedFont(fontBold);
      const fReg1 = await doc1.embedFont(fontRegular);
      const fObl1 = await doc1.embedFont(fontOblique);

      drawDocumentFrame(page1, 612, 792);

      // Header Block
      page1.drawRectangle({ x: 40, y: 710, width: 532, height: 42, color: cNavy });
      page1.drawText('CALIFORNIA 20-DAY PRELIMINARY NOTICE', {
        x: 52, y: 728, size: 13, font: fBold1, color: cGold,
      });
      page1.drawText('COMMERCIAL & RESIDENTIAL COMPLIANCE INSTRUMENT', {
        x: 52, y: 716, size: 7.5, font: fReg1, color: cWhite,
      });

      // Statutory Reference
      page1.drawText('Prepared in accordance with California Civil Code §§ 8200–8216 and §§ 9200–9214', {
        x: 40, y: 694, size: 7.5, font: fObl1, color: cSlate,
      });

      let yPos1 = 680;
      yPos1 = drawTableSection(page1, yPos1, '1. Direct Contractor / Claimant Information', [
        ['Claimant Legal Name', meta.claimantName || 'ApexPath Client'],
        ['Authorized Representative', meta.claimantName || 'Founder'],
        ['Mailing Address', meta.claimantAddress || '1144 Portersville Rd'],
        ['Contact Telephone', meta.claimantPhone || '724-602-1863'],
        ['Primary Email', meta.claimantEmail || 'gregorystewart1779@gmail.com'],
      ], fBold1, fReg1, cNavy);

      yPos1 = drawTableSection(page1, yPos1, '2. Hiring Party & Direct Contractor', [
        ['Direct Contractor Name', meta.directContractorName || 'Double G Contracting, LLC'],
        ['Direct Contractor Address', meta.directContractorAddress || '1144 Portersville Rd'],
      ], fBold1, fReg1, cNavy);

      yPos1 = drawTableSection(page1, yPos1, '3. Property Owner & Construction Lender', [
        ['Owner / Reputed Owner', meta.ownerName || 'Western PA Foundation for the Arts'],
        ['Owner Mailing Address', meta.ownerAddress || '930 Beaver Ave, Ellwood City, PA 16117'],
        ['Construction Lender', meta.constructionLenderName || 'None Notified / None Recorded'],
      ], fBold1, fReg1, cNavy);

      yPos1 = drawTableSection(page1, yPos1, '4. Jobsite Description & Estimated Price', [
        ['Jobsite Physical Address', meta.jobAddress || '4806 Myrtle Ave, Sacramento, CA 95841'],
        ['Estimated Contract Value', meta.estimatedAmount ? `$${meta.estimatedAmount}` : '$150,000.00'],
        ['Scope of Labor & Materials', meta.workDescription || 'Stick-framing, structural carpentry, and statutory improvements'],
      ], fBold1, fReg1, cNavy);

      // Statutory Warning Box
      page1.drawRectangle({
        x: 40,
        y: yPos1 - 72,
        width: 532,
        height: 72,
        color: rgb(0.99, 0.95, 0.95),
        borderWidth: 1,
        borderColor: cCrimson,
      });

      page1.drawText('NOTICE TO PROPERTY OWNER — MANDATORY STATUTORY WARNING (CA CIV. CODE § 8202):', {
        x: 48, y: yPos1 - 14, size: 7.5, font: fBold1, color: cCrimson,
      });

      const statutoryText =
        'EVEN IF YOU PAY YOUR CONTRACTOR IN FULL, unpaid subcontractors, suppliers, and laborers who provided labor, materials, or equipment have a constitutional right to record a mechanics lien on your property. Under California Civil Code §§ 8400-8494, this lien attaches to your real property title and may be foreclosed in court to force a sale of the property. You may protect yourself by requesting lien waivers from your general contractor.';

      page1.drawText(statutoryText, {
        x: 48, y: yPos1 - 26, size: 6.8, font: fReg1, color: cDark, maxWidth: 516, lineHeight: 9,
      });

      // Signature Row
      page1.drawText('EXECUTED BY CLAIMANT / AUTHORIZED AGENT:', {
        x: 40, y: yPos1 - 92, size: 7.5, font: fBold1, color: cSlate,
      });
      page1.drawText('Signature: _____________________________________________    Date: ' + new Date().toLocaleDateString('en-US'), {
        x: 40, y: yPos1 - 108, size: 8, font: fBold1, color: cCharcoal,
      });

      const pdfBytes1 = await doc1.save();

      // =========================================================================
      // DOCUMENT 2: STATUTORY PROOF OF SERVICE AFFIDAVIT
      // =========================================================================
      const doc2 = await PDFDocument.create();
      const page2 = doc2.addPage([612, 792]);
      const fBold2 = await doc2.embedFont(fontBold);
      const fReg2 = await doc2.embedFont(fontRegular);
      const fObl2 = await doc2.embedFont(fontOblique);

      drawDocumentFrame(page2, 612, 792);

      page2.drawRectangle({ x: 40, y: 710, width: 532, height: 42, color: cNavy });
      page2.drawText('PROOF OF SERVICE AFFIDAVIT & DECLARATION', {
        x: 52, y: 728, size: 13, font: fBold2, color: cGold,
      });
      page2.drawText('CALIFORNIA CIVIL CODE § 8118 STATUTORY MAILING COMPLIANCE', {
        x: 52, y: 716, size: 7.5, font: fReg2, color: cWhite,
      });

      let yPos2 = 680;
      yPos2 = drawTableSection(page2, yPos2, '1. Declarant & Server Information', [
        ['Declarant Name', meta.claimantName || 'Authorized Process Server'],
        ['Affiliated Organization', 'ApexPath Legal Compliance Automation'],
        ['Server Capacity', 'Authorized Agent / Direct Contractor Designee'],
      ], fBold2, fReg2, cNavy);

      yPos2 = drawTableSection(page2, yPos2, '2. Parties Served & Service Addresses', [
        ['Party Served (Owner)', meta.ownerName || 'Western PA Foundation for the Arts'],
        ['Destination Address', meta.ownerAddress || meta.jobAddress || '4806 Myrtle Ave, Sacramento, CA 95841'],
        ['Party Served (Direct Contractor)', meta.directContractorName || 'Double G Contracting, LLC'],
        ['Destination Address', meta.directContractorAddress || '1144 Portersville Rd'],
      ], fBold2, fReg2, cNavy);

      yPos2 = drawTableSection(page2, yPos2, '3. Method of Service & USPS Registry', [
        ['Service Transmittal Mode', 'USPS Certified Mail, Return Receipt Requested'],
        ['Pre-Paid Envelope Verification', 'Postage and certification fees fully prepaid'],
        ['Date of Transmittal', new Date().toLocaleDateString('en-US')],
        ['USPS Tracking Barcode (Fill in)', '____________________________________________________'],
      ], fBold2, fReg2, cNavy);

      // Perjury Box
      page2.drawRectangle({
        x: 40,
        y: yPos2 - 80,
        width: 532,
        height: 80,
        color: cLightBg,
        borderWidth: 1,
        borderColor: cSlate,
      });

      page2.drawText('DECLARATION UNDER PENALTY OF PERJURY (CALIFORNIA CODE OF CIVIL PROCEDURE § 2015.5):', {
        x: 48, y: yPos2 - 16, size: 7.5, font: fBold2, color: cNavy,
      });

      const perjuryText =
        'I am over the age of 18 years and not a party to the within matter. On the date stated below, I served a true and correct copy of the California 20-Day Preliminary Notice on each of the parties listed above by depositing the sealed envelope into the custody of the United States Postal Service with first-class postage and certified tracking prepaid.\n\nI declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.';

      page2.drawText(perjuryText, {
        x: 48, y: yPos2 - 28, size: 7.2, font: fReg2, color: cDark, maxWidth: 516, lineHeight: 10,
      });

      page2.drawText('Executed at ____________________________________, on ' + new Date().toLocaleDateString('en-US'), {
        x: 48, y: yPos2 - 68, size: 7.5, font: fObl2, color: cCharcoal,
      });

      page2.drawText('Declarant Signature: _____________________________________________', {
        x: 40, y: yPos2 - 105, size: 8.5, font: fBold2, color: cCharcoal,
      });

      const pdfBytes2 = await doc2.save();

      // =========================================================================
      // DOCUMENT 3: NOTICE OF INTENT TO RECORD A MECHANICS LIEN
      // =========================================================================
      const doc3 = await PDFDocument.create();
      const page3 = doc3.addPage([612, 792]);
      const fBold3 = await doc3.embedFont(fontBold);
      const fReg3 = await doc3.embedFont(fontRegular);
      const fObl3 = await doc3.embedFont(fontOblique);

      drawDocumentFrame(page3, 612, 792);

      page3.drawRectangle({ x: 40, y: 710, width: 532, height: 42, color: cCrimson });
      page3.drawText('NOTICE OF INTENT TO RECORD A MECHANICS LIEN', {
        x: 52, y: 728, size: 13, font: fBold3, color: cWhite,
      });
      page3.drawText('FORMAL STATUTORY 10-DAY PRE-FORECLOSURE DEMAND FOR DELINQUENT BALANCE', {
        x: 52, y: 716, size: 7.5, font: fReg3, color: rgb(0.95, 0.85, 0.85),
      });

      let yPos3 = 680;
      yPos3 = drawTableSection(page3, yPos3, '1. Formal Demand Summary', [
        ['Demanding Claimant', meta.claimantName || 'ApexPath Client'],
        ['Subject Property', meta.jobAddress || '4806 Myrtle Ave, Sacramento, CA 95841'],
        ['Property Owner of Record', meta.ownerName || 'Western PA Foundation for the Arts'],
        ['Direct Contractor', meta.directContractorName || 'Double G Contracting, LLC'],
        ['Principal Demand Amount', meta.estimatedAmount ? `$${meta.estimatedAmount}` : '$150,000.00'],
        ['Statutory Response Window', 'TEN (10) CALENDAR DAYS FROM SERVICE RECEIPT'],
      ], fBold3, fReg3, cCrimson);

      page3.drawRectangle({
        x: 40,
        y: yPos3 - 100,
        width: 532,
        height: 100,
        color: rgb(0.99, 0.96, 0.96),
        borderWidth: 1.2,
        borderColor: cCrimson,
      });

      page3.drawText('STATUTORY DEMAND AND NOTICE OF FORTHCOMING LEGAL ACTION:', {
        x: 48, y: yPos3 - 16, size: 8, font: fBold3, color: cCrimson,
      });

      const demandText =
        'PLEASE TAKE NOTICE that the above-named Claimant has completed statutory labor, services, equipment, or materials upon the subject real property. Despite formal invoices and previous demands, the principal balance set forth above remains unpaid.\n\nIF FULL PAYMENT IS NOT REMITTED WITHIN TEN (10) DAYS OF THIS NOTICE, Claimant will immediately file and record a verified Mechanics Lien against the title of the real property in the County Recorder\'s Office under California Civil Code §§ 8400–8494, and subsequently initiate a civil judicial foreclosure lawsuit to compel the public sale of the property.';

      page3.drawText(demandText, {
        x: 48, y: yPos3 - 30, size: 7.2, font: fReg3, color: cDark, maxWidth: 516, lineHeight: 10.5,
      });

      page3.drawText('Date of Demand Notice: ' + new Date().toLocaleDateString('en-US'), {
        x: 40, y: yPos3 - 120, size: 8, font: fBold3, color: cSlate,
      });
      page3.drawText('Authorized Signature: _____________________________________________', {
        x: 40, y: yPos3 - 145, size: 8.5, font: fBold3, color: cCharcoal,
      });

      const pdfBytes3 = await doc3.save();

      // =========================================================================
      // DOCUMENT 4: OFFICIAL CALIFORNIA MECHANICS LIEN CLAIM
      // =========================================================================
      const doc4 = await PDFDocument.create();
      const page4 = doc4.addPage([612, 792]);
      const fBold4 = await doc4.embedFont(fontBold);
      const fReg4 = await doc4.embedFont(fontRegular);
      const fObl4 = await doc4.embedFont(fontOblique);

      drawDocumentFrame(page4, 612, 792);

      // Official County Recorder Recording Top-Right Box (3" x 3")
      page4.drawRectangle({
        x: 350,
        y: 645,
        width: 222,
        height: 107,
        borderWidth: 1,
        borderColor: cSlate,
        color: cWhite,
      });
      page4.drawText('RECORDING REQUESTED BY & WHEN RECORDED MAIL TO:', {
        x: 45, y: 742, size: 6.5, font: fBold4, color: cSlate,
      });
      page4.drawText(`${meta.claimantName || 'ApexPath Client'}\n1144 Portersville Rd\ngregorystewart1779@gmail.com`, {
        x: 45, y: 728, size: 7.5, font: fReg4, color: cDark, lineHeight: 11,
      });

      page4.drawText('SPACE ABOVE THIS LINE RESERVED FOR\nCOUNTY RECORDER\'S USE ONLY', {
        x: 360, y: 700, size: 7, font: fBold4, color: cSlate, lineHeight: 10,
      });

      // Instrument Title
      page4.drawRectangle({ x: 40, y: 615, width: 532, height: 26, color: cNavy });
      page4.drawText('CLAIM OF MECHANICS LIEN', {
        x: 200, y: 624, size: 12, font: fBold4, color: cGold,
      });

      let yPos4 = 595;
      yPos4 = drawTableSection(page4, yPos4, 'Verified Instrument Details', [
        ['Lien Claimant Legal Entity', meta.claimantName || 'ApexPath Client'],
        ['Hiring Entity / Direct Contractor', meta.directContractorName || 'Double G Contracting, LLC'],
        ['Property Owner of Record', meta.ownerName || 'Western PA Foundation for the Arts'],
        ['Subject Property Legal / Parcel Address', meta.jobAddress || '4806 Myrtle Ave, Sacramento, CA 95841'],
        ['Total Balance Claimed Due', meta.estimatedAmount ? `$${meta.estimatedAmount}` : '$150,000.00'],
      ], fBold4, fReg4, cNavy);

      // Verification Box
      page4.drawText('CLAIMANT STATUTORY VERIFICATION:', {
        x: 40, y: yPos4 - 10, size: 8, font: fBold4, color: cNavy,
      });
      const verifClaim =
        'Claimant claims a mechanics lien upon the real property described above pursuant to California Civil Code §§ 8400-8494 for the value of labor, services, equipment, and materials furnished. Claimant has served all required statutory preliminary notices.';
      page4.drawText(verifClaim, {
        x: 40, y: yPos4 - 22, size: 7.2, font: fReg4, color: cDark, maxWidth: 532, lineHeight: 9.5,
      });

      page4.drawText('Claimant Signature: _____________________________________________    Date: ' + new Date().toLocaleDateString('en-US'), {
        x: 40, y: yPos4 - 54, size: 8, font: fBold4, color: cCharcoal,
      });

      // California Statutory Notary Jurat Box (Civ. Code § 1189)
      const juratY = yPos4 - 70;
      page4.drawRectangle({
        x: 40,
        y: juratY - 95,
        width: 532,
        height: 95,
        borderWidth: 1,
        borderColor: cLine,
        color: cLightBg,
      });

      page4.drawText('CALIFORNIA NOTARY ACKNOWLEDGMENT (CALIFORNIA CIVIL CODE § 1189):', {
        x: 48, y: juratY - 14, size: 7.2, font: fBold4, color: cNavy,
      });

      const notaryDisclaimer =
        'A notary public or other officer completing this certificate verifies only the identity of the individual who signed the document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that document.';
      page4.drawText(notaryDisclaimer, {
        x: 48, y: juratY - 26, size: 6.2, font: fObl4, color: cSlate, maxWidth: 516, lineHeight: 8.5,
      });

      const juratBody =
        'State of California, County of ____________________\nOn ________________________ before me, ______________________________________, Notary Public, personally appeared ________________________________________, who proved to me on the basis of satisfactory evidence to be the person whose name is subscribed to the within instrument.';
      page4.drawText(juratBody, {
        x: 48, y: juratY - 50, size: 7, font: fReg4, color: cDark, maxWidth: 360, lineHeight: 10,
      });

      // Stamp area box
      page4.drawRectangle({
        x: 425,
        y: juratY - 88,
        width: 140,
        height: 55,
        borderWidth: 0.5,
        borderColor: cSlate,
      });
      page4.drawText('[PLACE OFFICIAL NOTARY SEAL HERE]', {
        x: 433, y: juratY - 60, size: 6.5, font: fBold4, color: cSlate,
      });

      const pdfBytes4 = await doc4.save();

      // =========================================================================
      // DISPATCH ALL 4 HIGH-CONVERSION DOCUMENTS VIA RESEND
      // =========================================================================
      const { data, error } = await resend.emails.send({
        from: 'ApexPath <onboarding@resend.dev>',
        to: recipient,
        subject: 'Your Official California Statutory Notice Packet — ApexPath',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Your Official Statutory Compliance Documents</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">ApexPath California Construction Lien Compliance Engine</p>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
              Attached are the four formal legal instruments prepared for <strong>${meta.jobAddress || 'your project'}</strong>:
            </p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1e293b; line-height: 1.8;">
                <li><strong>01-CA-20-Day-Preliminary-Notice.pdf</strong> — Serve via Certified Mail within 20 days of commencing work.</li>
                <li><strong>02-Proof-of-Service-Affidavit.pdf</strong> — Fill with USPS Certified Mail tracking numbers and retain.</li>
                <li><strong>03-Notice-of-Intent-to-Lien.pdf</strong> — Statutory 10-day payment demand notice.</li>
                <li><strong>04-California-Mechanics-Lien-Claim.pdf</strong> — Recorder-compliant instrument with statutory Notary Jurat.</li>
              </ul>
            </div>

            <p style="font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              ApexPath Legal Workflow Solutions · Generated under California Civil Code Compliance Guidelines
            </p>
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
        console.error('Resend delivery failed with error:', error);
        return NextResponse.json({ error: 'Email delivery failed', details: error }, { status: 500 });
      }

      console.log('High-fidelity document bundle dispatched successfully:', data);
    } catch (err: any) {
      console.error('Document compilation error:', err);
      return NextResponse.json({ error: 'Processing failed', message: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}