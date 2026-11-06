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
      claimantName: metadata.claimantName || metadata.customer_name || 'ApexPath Systems',
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
      productType: metadata.product_type || 'Complete Contractor Protection Bundle',
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
    // PDF 3: Notice of Intent to File a Mechanics Lien
    // -------------------------------------------------------------------------
    const doc3 = new jsPDF();
    doc3.setFont('helvetica', 'bold');
    doc3.setFontSize(16);
    doc3.text('NOTICE OF INTENT TO RECORD A MECHANICS LIEN', 105, 20, { align: 'center' });

    doc3.setFontSize(10);
    doc3.setFont('helvetica', 'normal');
    doc3.text('FORMAL PRE-LIEN PAYMENT DEMAND', 105, 27, { align: 'center' });

    doc3.setFontSize(10);
    doc3.text(`DATE: ${new Date().toLocaleDateString('en-US')}`, 14, 45);
    doc3.text(`TO OWNER: ${data.ownerName}`, 14, 53);
    doc3.text(`ADDRESS: ${data.ownerAddress}`, 14, 61);

    doc3.setFont('helvetica', 'bold');
    doc3.text('NOTICE AND WARNING:', 14, 77);
    doc3.setFont('helvetica', 'normal');
    const intentBody = `Please take notice that ${data.claimantName} furnished labor, materials, services, and/or equipment for the improvement of the real property commonly known as:`;
    doc3.text(doc3.splitTextToSize(intentBody, 180), 14, 85);

    doc3.setFont('helvetica', 'bold');
    doc3.text(`JOB SITE ADDRESS: ${data.jobAddress}`, 20, 99);
    doc3.text(`TOTAL DELINQUENT AMOUNT DUE: $${data.amountDue}`, 20, 107);

    doc3.setFont('helvetica', 'normal');
    const warningBody = `Unless full payment of the amount stated above is remitted within ten (10) days from receipt of this notice, a formal Claim of Mechanics Lien will be recorded immediately in the County Recorder's Office where the property is located. Recording a lien places an official encumbrance upon the title of your property and will negatively impact the owner's ability to sell, refinance, or convey clear title.`;
    doc3.text(doc3.splitTextToSize(warningBody, 180), 14, 121);

    doc3.text('PLEASE GOVERN YOURSELF ACCORDINGLY.', 14, 155);

    doc3.setFont('helvetica', 'bold');
    doc3.text(`Signed: _____________________________________________`, 14, 185);
    doc3.text(`Authorized Agent for ${data.claimantName}`, 14, 193);

    const pdf3Base64 = Buffer.from(doc3.output('arraybuffer')).toString('base64');

    // -------------------------------------------------------------------------
    // PDF 4: California Mechanics Lien Claim (Civil Code §§ 8400-8424)
    // -------------------------------------------------------------------------
    const doc4 = new jsPDF();

    // 2-inch top margin on right side for County Recorder Official Recording Stamp
    doc4.setDrawColor(180, 180, 180);
    doc4.rect(110, 10, 90, 45);
    doc4.setFontSize(8);
    doc4.setFont('helvetica', 'normal');
    doc4.text('SPACE ABOVE FOR RECORDER\'S USE ONLY', 155, 33, { align: 'center' });

    doc4.setFontSize(8);
    doc4.text('RECORDING REQUESTED BY & WHEN RECORDED MAIL TO:', 14, 15);
    doc4.setFont('helvetica', 'bold');
    doc4.text(data.claimantName, 14, 21);
    doc4.setFont('helvetica', 'normal');
    doc4.text(data.claimantAddress, 14, 27);

    doc4.setFont('helvetica', 'bold');
    doc4.setFontSize(14);
    doc4.text('CLAIM OF MECHANICS LIEN', 14, 65);
    doc4.setFontSize(9);
    doc4.setFont('helvetica', 'normal');
    doc4.text('California Civil Code Sections 8400 - 8424', 14, 71);

    doc4.setFontSize(9);
    doc4.text(`Claimant: ${data.claimantName}`, 14, 83);
    doc4.text(`Claimant Address: ${data.claimantAddress}`, 14, 89);
    doc4.text(`Owner / Reputed Owner: ${data.ownerName}`, 14, 95);
    doc4.text(`Property Location: ${data.jobAddress}`, 14, 101);
    doc4.text(`Hiring Entity: ${data.hiringParty}`, 14, 107);

    doc4.setFont('helvetica', 'bold');
    doc4.text(`TOTAL AMOUNT OF LIEN CLAIMED: $${data.amountDue}`, 14, 117);

    doc4.setFont('helvetica', 'normal');
    const claimBody = `Claimant claims a mechanics lien upon the real property described above for labor, services, equipment, or materials furnished for the construction, alteration, or repair of the project. The claimant furnished the following: ${data.workDescription}. The amount remaining unpaid after deducting all just credits and offsets is the total amount claimed above.`;
    doc4.text(doc4.splitTextToSize(claimBody, 182), 14, 125);

    // Statutory Notice of Mechanics Lien Warning Block
    doc4.setFillColor(245, 245, 245);
    doc4.rect(14, 145, 182, 32, 'F');
    doc4.setFont('helvetica', 'bold');
    doc4.setFontSize(8);
    doc4.text('NOTICE OF MECHANICS LIEN WARNING (CALIFORNIA CIVIL CODE § 8416):', 18, 151);
    doc4.setFont('helvetica', 'normal');
    doc4.setFontSize(7.5);
    const statutoryNoticeText = 'YOU ARE RECEIVING THIS NOTICE BECAUSE A MECHANICS LIEN HAS BEEN RECORDED AGAINST YOUR PROPERTY. UPON THE RECORDING OF THIS MECHANICS LIEN, YOUR PROPERTY MAY BE SUBJECT TO FORECLOSURE TO PAY FOR WORK, SERVICES, EQUIPMENT, OR MATERIALS FURNISHED TO IMPROVE YOUR PROPERTY. SEE THE REVERSE SIDE OR ATTACHED SHEET FOR COMPLETE STATUTORY ADVISORIES.';
    doc4.text(doc4.splitTextToSize(statutoryNoticeText, 174), 18, 157);

    // Statutory California Notary Jurat
    doc4.setFont('helvetica', 'bold');
    doc4.setFontSize(8.5);
    doc4.text('CALIFORNIA ALL-PURPOSE CERTIFICATE OF ACKNOWLEDGMENT', 14, 186);
    doc4.setFont('helvetica', 'normal');
    doc4.setFontSize(7.5);
    const juratDisclaimer = 'A notary public or other officer completing this certificate verifies only the identity of the individual who signed the document to which this certificate is attached, and not the truthfulness, accuracy, or validity of that document.';
    doc4.rect(14, 189, 182, 12);
    doc4.text(doc4.splitTextToSize(juratDisclaimer, 178), 16, 193);

    doc4.setFontSize(8);
    doc4.text('State of California  )', 14, 208);
    doc4.text('County of _______________ )', 14, 214);
    doc4.text('Subscribed and sworn to (or affirmed) before me on this _____ day of __________________, 20____,', 14, 222);
    doc4.text('by _____________________________________, proved to me on the basis of satisfactory evidence to be', 14, 228);
    doc4.text('the person(s) who appeared before me.', 14, 234);

    doc4.setFont('helvetica', 'bold');
    doc4.text('Signature: _____________________________________________ (Seal)', 14, 248);

    const pdf4Base64 = Buffer.from(doc4.output('arraybuffer')).toString('base64');

    // -------------------------------------------------------------------------
    // Record Audit Trail in Supabase "orders" Table
    // -------------------------------------------------------------------------
    const customerEmail = session.customer_details?.email || 'apexpath.nodes@gmail.com';
    const customerName = session.customer_details?.name || data.claimantName;
    const amountPaid = session.amount_total || 0;

    const { error: dbError } = await supabase.from('orders').insert({
      customer_email: customerEmail,
      customer_name: customerName,
      product_type: data.productType,
      amount_paid: amountPaid,
    });

    if (dbError) {
      console.error('Supabase orders insert failed:', dbError);
    }

    // -------------------------------------------------------------------------
    // Dispatch Compliance Packet to Customer via Resend
    // -------------------------------------------------------------------------
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'ApexPath Compliance <notices@apexpathsystems.com>',
      to: customerEmail,
      subject: `Your California Statutory Compliance Documents — ${data.jobAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <h2 style="color: #0f172a; margin-bottom: 4px;">Your Official Statutory Compliance Documents</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">ApexPath California Construction Lien Compliance Engine</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          
          <p>Attached are the four formal legal instruments prepared for <strong>${data.jobAddress}</strong>:</p>
          
          <ul style="padding-left: 20px; font-size: 14px;">
            <li style="margin-bottom: 8px;"><strong>01-CA-20-Day-Preliminary-Notice.pdf</strong> — Serve via Certified Mail within 20 days of commencing work.</li>
            <li style="margin-bottom: 8px;"><strong>02-Proof-of-Service-Affidavit.pdf</strong> — Fill with USPS Certified Mail tracking numbers and retain.</li>
            <li style="margin-bottom: 8px;"><strong>03-Notice-of-Intent-to-Lien.pdf</strong> — Statutory 10-day payment demand notice.</li>
            <li style="margin-bottom: 8px;"><strong>04-California-Mechanics-Lien-Claim.pdf</strong> — Recorder-compliant instrument with statutory Notary Jurat.</li>
          </ul>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">ApexPath Legal Workflow Solutions · Generated under California Civil Code Compliance Guidelines</p>
        </div>
      `,
      attachments: [
        {
          filename: '01-CA-20-Day-Preliminary-Notice.pdf',
          content: pdf1Base64,
        },
        {
          filename: '02-Proof-of-Service-Affidavit.pdf',
          content: pdf2Base64,
        },
        {
          filename: '03-Notice-of-Intent-to-Lien.pdf',
          content: pdf3Base64,
        },
        {
          filename: '04-California-Mechanics-Lien-Claim.pdf',
          content: pdf4Base64,
        },
      ],
    });

    if (emailError) {
      console.error('Failed to dispatch compliance documents via Resend:', emailError);
      return NextResponse.json({ error: 'Email delivery failed', details: emailError }, { status: 500 });
    }

    return NextResponse.json({ received: true, emailId: emailData?.id });
  }

  return NextResponse.json({ received: true });
}