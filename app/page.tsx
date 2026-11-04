'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { jsPDF } from 'jspdf';
import { createCheckoutSession } from '@/app/actions/createCheckout';
import { saveOrderToSupabase } from '@/app/actions/saveOrder';
import { useSearchParams } from 'next/navigation';

function NoticeGenerator() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  const [formData, setFormData] = useState({
    subcontractorName: '',
    subcontractorEmail: '',
    subcontractorPhone: '',
    subcontractorAddress: '',
    ownerName: '',
    ownerAddress: '',
    generalContractorName: '',
    generalContractorAddress: '',
    lenderName: '',
    lenderAddress: '',
    jobAddress: '',
    workDescription: '',
    contractAmount: '',
    unpaidAmount: '',
    firstFurnishedDate: '',
    completionDate: '',
    serviceMethod: 'Certified Mail with Return Receipt',
  });

  const [deadline, setDeadline] = useState<string | null>(null);
  const orderRecorded = useRef(false);

  // Check if user just returned from Stripe successfully
  useEffect(() => {
    const success = searchParams.get('success');
    const product = searchParams.get('product');

    if (success === 'true' && !orderRecorded.current) {
      orderRecorded.current = true;

      // Retrieve stored form data from session so typed details survive redirect
      const savedForm = sessionStorage.getItem('apexpath_form');
      const parsedData = savedForm ? JSON.parse(savedForm) : formData;

      // Save the order to Supabase using actual user input
      const recordOrder = async () => {
        let amount = 2900;
        let productName = 'California 20-Day Notice Packet';
        if (product === 'lien') {
          amount = 3900;
          productName = 'Mechanics Lien & Recording Packet';
        } else if (product === 'bundle') {
          amount = 6800;
          productName = 'Complete Contractor Protection Bundle';
        }

        await saveOrderToSupabase({
          customerEmail: parsedData.subcontractorEmail || 'customer@apexpath.com',
          customerName: parsedData.subcontractorName || 'ApexPath Customer',
          customerPhone: parsedData.subcontractorPhone || null,
          productType: productName,
          amountPaid: amount,
          stripeSessionId: 'stripe_success_redirect',
        });
      };

      recordOrder();

      if (product === 'notice') {
        generateNoticePDF();
      } else if (product === 'lien') {
        generateLienPDF();
      } else if (product === 'bundle') {
        generateNoticePDF();
        setTimeout(() => {
          generateLienPDF();
        }, 1000);
      }

      // Clean up URL and session storage
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem('apexpath_form');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === 'firstFurnishedDate' && e.target.value) {
      const date = new Date(e.target.value);
      date.setDate(date.getDate() + 20);
      setDeadline(date.toLocaleDateString());
    }
  };

  const handleCheckout = async (productType: 'notice' | 'lien' | 'bundle') => {
    setLoading(true);
    try {
      // Save form data into session storage before Stripe redirect
      sessionStorage.setItem('apexpath_form', JSON.stringify(formData));

      const { url } = await createCheckoutSession(productType);
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error(error);
      alert('Error initiating checkout. Please check your Stripe keys.');
      setLoading(false);
    }
  };

  const generateNoticePDF = () => {
    const doc = new jsPDF();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    // Page 1: Clean Legal Instrument with Statutory Warning
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("CALIFORNIA 20-DAY PRELIMINARY NOTICE", 20, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Statutory Notice Pursuant to California Civil Code §§ 8200–8216", 20, 28);

    doc.setLineWidth(0.3);
    doc.line(20, 33, 190, 33);

    let y = 40;
    const addSection = (title: string, fields: { label: string; value: string }[]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 20, y);
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      fields.forEach((field) => {
        doc.text(`${field.label}: ${field.value || 'N/A'}`, 25, y);
        y += 3.5;
      });
      y += 1.5;
    };

    addSection("1. CLAIMANT (Subcontractor / Material Supplier):", [
      { label: "Company Name", value: formData.subcontractorName },
      { label: "Email", value: formData.subcontractorEmail },
      { label: "Phone", value: formData.subcontractorPhone },
      { label: "Address", value: formData.subcontractorAddress },
    ]);

    addSection("2. PROPERTY OWNER / REPUTED OWNER:", [
      { label: "Owner Name", value: formData.ownerName },
      { label: "Address", value: formData.ownerAddress },
    ]);

    addSection("3. DIRECT CONTRACTOR (General Contractor):", [
      { label: "Contractor Name", value: formData.generalContractorName },
      { label: "Address", value: formData.generalContractorAddress },
    ]);

    addSection("4. CONSTRUCTION LENDER / SURETY (if applicable):", [
      { label: "Lender Name", value: formData.lenderName },
      { label: "Address", value: formData.lenderAddress },
    ]);

    addSection("5. JOB SITE & WORK DESCRIPTION:", [
      { label: "Site Address", value: formData.jobAddress },
      { label: "Description of Labor/Materials", value: formData.workDescription },
      { label: "Estimated Contract Amount", value: formData.contractAmount ? `$${formData.contractAmount}` : '' },
      { label: "Date First Furnished", value: formData.firstFurnishedDate },
      { label: "Intended Service Method", value: formData.serviceMethod },
    ]);

    // Mandatory Statutory Warning Box (CA Civil Code § 8200(e))
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y, 170, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("NOTICE TO PROPERTY OWNER:", 24, y + 4.5);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Even though you have paid your contractor in full, if the person or firm that has given you this notice", 24, y + 9);
    doc.text("is not paid in full for labor, service, equipment, or material provided or to be provided to your property,", 24, y + 13);
    doc.text("a lien may be placed on your property. Foreclosure of the lien may lead to all or part of your property", 24, y + 17);
    doc.text("being sold even though you have paid your contractor in full. To protect yourself, you may wish", 24, y + 21);
    doc.text("to require your contractor to provide you with a lien release from the person or firm that has given you this notice.", 24, y + 25);
    
    y += 31;

    if (deadline) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`Statutory 20-Day Notice Service Deadline: ${deadline}`, 20, y);
      y += 5;
    }

    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Page 1 of 3 — Official Notice Document", 20, 270);

    // Page 2: Proof of Service Affidavit
    doc.addPage();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("PROOF OF SERVICE AFFIDAVIT", 20, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text("California Civil Code § 8110 — Declaration of Service", 20, 28);

    doc.setLineWidth(0.3);
    doc.line(20, 33, 190, 33);

    let yAff = 44;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const affidavitText = [
      "I, the undersigned, declare:",
      "1. I am a citizen of the United States, over the age of 18 years, and not a party to the within-entitled action.",
      "2. My business/residence address is:",
      "    __________________________________________________________________",
      "3. On ________________________, I served a copy of the attached California 20-Day Preliminary Notice on:",
      `    Property Owner: ${formData.ownerName || '____________________________________'}`,
      `    General Contractor: ${formData.generalContractorName || '____________________________________'}`,
      `    Job Site Address: ${formData.jobAddress || '____________________________________'}`,
      "",
      "4. Manner of Service (Check corresponding box used):",
      "    [   ] By Certified Mail (Return Receipt Requested) — Attached USPS Tracking Receipt #:",
      "        __________________________________________________________________",
      "    [   ] By Personal Delivery (Hand-delivered to recipient or authorized agent)",
      "    [   ] By Registered Mail",
      "",
      "I declare under penalty of perjury under the laws of the State of California that the foregoing",
      "is true and correct.",
      "",
      "Executed on ________________________ at ________________________, California.",
      "",
      "",
      "Signature: ____________________________________________________",
      "Printed Name: __________________________________________________"
    ];

    affidavitText.forEach((line) => {
      doc.text(line, 25, yAff);
      yAff += 6;
    });

    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Page 2 of 3 — Proof of Service Affidavit", 20, 270);

    // Page 3: Compliance & Mailing Guide
    doc.addPage();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(217, 119, 6);
    doc.text("APEXPATH LEGAL WORKFLOW SOLUTIONS", 20, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("STATUTORY COMPLIANCE & MAILING GUIDE", 20, 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Important Checklist to Preserve Your California Mechanics Lien Rights", 20, 33);

    doc.setLineWidth(0.3);
    doc.line(20, 37, 190, 37);

    let yInst = 48;
    const instructions = [
      "CRITICAL INSTRUCTIONS FOR SUBCONTRACTORS & SUPPLIERS:",
      "",
      "1. TIMING IS EVERYTHING (CA Civil Code § 8204):",
      "   This notice must be served no later than 20 days after you first furnish labor, service, equipment,",
      "   or materials to the job site. If served late, your lien rights only cover work done 20 days prior",
      "   to service onward.",
      "",
      "2. HOW TO EXECUTE CERTIFIED MAIL:",
      "   • Take the completed Notice package to your local USPS post office.",
      "   • Send copies via Certified Mail with Return Receipt Requested to both the Property Owner",
      "     and the Direct Contractor.",
      "   • Staple the green return receipt card and USPS tracking receipt directly to your Proof of Service",
      "     Affidavit (Page 2 of this packet) and store it safely in your project folder.",
      "",
      "3. COUNTY RECORDER OPTION:",
      "   While optional in California, many contractors also file a copy with the County Recorder's Office",
      "   in the county where the property is located to ensure public record notification.",
      "",
      "4. RETAIN FOR YOUR RECORDS:",
      "   Keep this complete 3-page packet along with all signed delivery receipts for at least the duration",
      "   of the project and the statutory window to file a mechanics lien."
    ];

    instructions.forEach((line) => {
      doc.text(line, 25, yInst);
      yInst += 5.5;
    });

    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Page 3 of 3 — Compliance & Mailing Guide | Powered by ApexPath", 20, 269);

    doc.save("California-20-Day-Notice-ApexPath-Packet.pdf");
  };

  const generateLienPDF = () => {
    const doc = new jsPDF();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    // Page 1: Claim of Mechanics Lien
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("CLAIM OF MECHANICS LIEN", 20, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Statutory Claim Pursuant to California Civil Code §§ 8400–8494", 20, 28);

    doc.setLineWidth(0.3);
    doc.line(20, 33, 190, 33);

    let yLien = 42;
    const addLienSection = (title: string, fields: { label: string; value: string }[]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(title, 20, yLien);
      yLien += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      fields.forEach((field) => {
        doc.text(`${field.label}: ${field.value || 'N/A'}`, 25, yLien);
        yLien += 4;
      });
      yLien += 2;
    };

    addLienSection("1. CLAIMANT (The Unpaid Party):", [
      { label: "Company / Claimant Name", value: formData.subcontractorName },
      { label: "Email", value: formData.subcontractorEmail },
      { label: "Phone", value: formData.subcontractorPhone },
      { label: "Address", value: formData.subcontractorAddress },
    ]);

    addLienSection("2. PROPERTY OWNER / REPUTED OWNER:", [
      { label: "Owner Name", value: formData.ownerName },
      { label: "Address", value: formData.ownerAddress },
    ]);

    addLienSection("3. JOB SITE & LEGAL DESCRIPTION:", [
      { label: "Site Address", value: formData.jobAddress },
    ]);

    addLienSection("4. AMOUNT OF CLAIM (Unpaid Balance):", [
      { label: "Total Unpaid Principal Due", value: formData.unpaidAmount ? `$${formData.unpaidAmount}` : '' },
      { label: "Date Work Completed / Stopped", value: formData.completionDate },
    ]);

    addLienSection("5. DESCRIPTION OF LABOR, SERVICES, OR MATERIALS:", [
      { label: "Scope of Furnished Work", value: formData.workDescription },
    ]);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text("NOTICE: This document must be signed, notarized, and recorded with the County Recorder within statutory timeframes.", 20, 265);
    doc.text("Page 1 of 3 — Claim of Mechanics Lien Document", 20, 270);

    // Page 2: Notarized Verification Affidavit
    doc.addPage();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("VERIFICATION & ACKNOWLEDGMENT", 20, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text("California Civil Code § 8040 — Mandatory Sworn Statement", 20, 28);

    doc.setLineWidth(0.3);
    doc.line(20, 33, 190, 33);

    let yAffLien = 44;
    const lienAffidavit = [
      "I, the undersigned, state:",
      "1. I am the claimant, or an authorized agent, officer, or director of the claimant named in the",
      "    foregoing Claim of Mechanics Lien.",
      "2. I have read the foregoing Claim of Mechanics Lien and know the contents thereof.",
      "3. The same is true of my own knowledge.",
      "",
      "I declare under penalty of perjury under the laws of the State of California that the foregoing",
      "is true and correct.",
      "",
      "Executed on ________________________ at ________________________, California.",
      "",
      "",
      "Signature: ____________________________________________________",
      "Printed Name & Title: __________________________________________",
      "",
      "--------------------------------------------------------------------------------------------------",
      "NOTARY ACKNOWLEDGMENT (California All-Purpose Acknowledgment)",
      "--------------------------------------------------------------------------------------------------",
      "State of California, County of ________________________",
      "",
      "On ________________________ before me, ____________________________________, Notary Public,",
      "personally appeared ____________________________________, who proved to me on the basis",
      "of satisfactory evidence to be the person(s) whose name(s) is/are subscribed to the within instrument",
      "and acknowledged to me that he/she/they executed the same in his/her/their authorized capacity(ies).",
      "",
      "Notary Signature: __________________________________   [ SEAL ]"
    ];

    lienAffidavit.forEach((line) => {
      doc.text(line, 25, yAffLien);
      yAffLien += 5.5;
    });

    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Page 2 of 3 — Verification & Notary Acknowledgment", 20, 270);

    // Page 3: Recording & County Filing Guide
    doc.addPage();
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(217, 119, 6);
    doc.text("APEXPATH LEGAL WORKFLOW SOLUTIONS", 20, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("COUNTY RECORDING & SERVICE GUIDE", 20, 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Steps to Properly Record and Enforce Your Mechanics Lien", 20, 33);

    doc.setLineWidth(0.3);
    doc.line(20, 37, 190, 37);

    let yInstLien = 48;
    const lienInstructions = [
      "CRITICAL STEPS FOR RECORDING A MECHANICS LIEN IN CALIFORNIA:",
      "",
      "1. STRICT DEADLINES (CA Civil Code §§ 8412–8414):",
      "   You must record this lien in the County Recorder's Office within 90 days of completing the",
      "   work, OR within 30 days if the owner records a Notice of Completion/Cessation.",
      "",
      "2. NOTARIZATION REQUIREMENT (Page 2):",
      "   The Claim of Mechanics Lien and Verification must be signed in front of a licensed California",
      "   Notary Public before submission to the county.",
      "",
      "3. COUNTY RECORDER SUBMISSION:",
      "   Take or mail the notarized original to the County Recorder's Office where the property is located,",
      "   along with the appropriate recording fees and a self-addressed stamped envelope.",
      "",
      "4. MANDATORY SERVICE ON OWNER (CA Civil Code § 8416):",
      "   Within 10 days of recording the lien with the county, you MUST serve a copy of the recorded lien",
      "   by certified mail with return receipt requested to the property owner.",
      "",
      "5. ENFORCEMENT TIMELINE:",
      "   A mechanics lien expires 90 days after recording unless you file a formal lawsuit in court",
      "   to foreclose on the property."
    ];

    lienInstructions.forEach((line) => {
      doc.text(line, 25, yInstLien);
      yInstLien += 5.5;
    });

    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Page 3 of 3 — Recording & County Filing Guide | Powered by ApexPath", 20, 269);

    doc.save("California-Mechanics-Lien-ApexPath-Packet.pdf");
  };

  return (
    <main className="min-h-screen bg-black text-slate-100 p-6 md:p-12 relative">
      <div className="max-w-3xl mx-auto bg-slate-900 p-8 rounded-xl shadow-2xl border border-slate-800">
        
        {/* Header Section with ApexPath Branding */}
        <div className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-start">
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">ApexPath Workflow Solution</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">California 20-Day Notice Generator</h1>
            <p className="text-slate-400 text-sm mt-1">
              Compliant with California Civil Code §§ 8200–8216. Protect your lien rights upfront.
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-6">
          
          {/* Subcontractor Section */}
          <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">1. Claimant (Subcontractor) Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                name="subcontractorName" 
                placeholder="Company / Claimant Name" 
                value={formData.subcontractorName}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="email" 
                name="subcontractorEmail" 
                placeholder="Email Address" 
                value={formData.subcontractorEmail}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="text" 
                name="subcontractorPhone" 
                placeholder="Phone Number" 
                value={formData.subcontractorPhone}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="text" 
                name="subcontractorAddress" 
                placeholder="Street Address, City, State, ZIP" 
                value={formData.subcontractorAddress}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white md:col-span-2"
              />
            </div>
          </div>

          {/* Property Owner Section */}
          <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">2. Property Owner Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                name="ownerName" 
                placeholder="Property Owner Name" 
                value={formData.ownerName}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="text" 
                name="ownerAddress" 
                placeholder="Owner Address, City, State, ZIP" 
                value={formData.ownerAddress}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
            </div>
          </div>

          {/* Direct Contractor Section */}
          <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">3. Direct Contractor Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                name="generalContractorName" 
                placeholder="General Contractor Name" 
                value={formData.generalContractorName}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="text" 
                name="generalContractorAddress" 
                placeholder="Contractor Address, City, State, ZIP" 
                value={formData.generalContractorAddress}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
            </div>
          </div>

          {/* Construction Lender Section */}
          <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">4. Construction Lender Info (Optional)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                name="lenderName" 
                placeholder="Construction Lender / Bank Name" 
                value={formData.lenderName}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <input 
                type="text" 
                name="lenderAddress" 
                placeholder="Lender Address, City, State, ZIP" 
                value={formData.lenderAddress}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
            </div>
          </div>

          {/* Job Details Section */}
          <div className="bg-slate-950/50 p-5 rounded-lg border border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3">5. Job Site & Work Details</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                name="jobAddress" 
                placeholder="Job Site Address" 
                value={formData.jobAddress}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />
              <textarea 
                name="workDescription" 
                placeholder="General description of labor, services, equipment or materials furnished" 
                value={formData.workDescription}
                onChange={handleChange}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contract Amount ($)</label>
                  <input 
                    type="number" 
                    name="contractAmount" 
                    placeholder="e.g. 15000" 
                    value={formData.contractAmount}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date First Furnished</label>
                  <input 
                    type="date" 
                    name="firstFurnishedDate" 
                    value={formData.firstFurnishedDate}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Service Method</label>
                  <select
                    name="serviceMethod"
                    value={formData.serviceMethod}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-amber-400 text-white"
                  >
                    <option value="Certified Mail with Return Receipt">Certified Mail w/ Return Receipt</option>
                    <option value="Personal Delivery">Personal Delivery</option>
                    <option value="Registered Mail">Registered Mail</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Statutory Deadline Box */}
          {deadline && (
            <div className="bg-amber-950/40 border border-amber-600/50 p-4 rounded-lg">
              <h3 className="text-amber-400 font-semibold text-sm">Statutory 20-Day Notice Deadline:</h3>
              <p className="text-xl font-bold text-white mt-1">{deadline}</p>
              <p className="text-xs text-amber-200/70 mt-1">
                Under CA Civil Code § 8200, this notice must be served within 20 days of first furnishing labor or materials.
              </p>
            </div>
          )}

          {/* Action Button - Triggers Upsell Modal immediately */}
          <button 
            onClick={() => setShowUpsellModal(true)}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-4 rounded-lg transition-colors cursor-pointer mt-4 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Secure & Generate Official 3-Page Notice Packet ($29)'}
          </button>

        </div>
      </div>

      {/* Upsell Modal Popup */}
      {showUpsellModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl max-w-lg w-full p-6 shadow-2xl text-center relative">
            <span className="text-xs uppercase tracking-widest text-amber-500 font-bold">One-Time Special Offer</span>
            <h2 className="text-2xl font-bold text-white mt-2">Protect Your Project All the Way Through</h2>
            <p className="text-slate-300 text-sm mt-3">
              Your 20-Day Notice packet is ready ($29). Would you also like to add the Mechanics Lien & Recording Packet for your project backup?
            </p>
            
            <div className="bg-amber-950/40 border border-amber-600/50 p-4 rounded-lg my-6 text-left">
              <div className="text-amber-400 font-bold text-sm">Phase 2: Mechanics Lien & Recording Packet</div>
              <div className="text-xs text-slate-300 mt-1">Includes pre-filled Claim of Mechanics Lien, Sworn Verification Oath, Notary Acknowledgment, and County Recording Guide.</div>
              <div className="text-amber-400 font-bold text-base mt-2">Add for just <span className="text-white underline">$39 more</span> ($68 Total Bundle)</div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleCheckout('bundle')}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-3 rounded-lg transition-colors cursor-pointer shadow-md text-sm"
              >
                {loading ? 'Processing...' : 'Yes, Add Mechanics Lien Packet ($68 Total Bundle)'}
              </button>
              
              <button
                onClick={() => handleCheckout('notice')}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium p-3 rounded-lg transition-colors cursor-pointer text-sm"
              >
                {loading ? 'Processing...' : "No thanks, just the $29 Notice Packet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-12 text-center">Loading ApexPath...</div>}>
      <NoticeGenerator />
    </Suspense>
  );
}