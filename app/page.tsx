'use client';

import React, { useState } from 'react';

type TierKey = 'bundle_all' | 'notice' | 'warning' | 'waivers' | 'release';

interface FormData {
  claimantName: string;
  claimantAddress: string;
  claimantPhone: string;
  claimantEmail: string;
  directContractorName: string;
  directContractorAddress: string;
  ownerName: string;
  ownerAddress: string;
  constructionLenderName: string;
  constructionLenderAddress: string;
  jobAddress: string;
  workDescription: string;
  estimatedAmount: string;
}

const TIER_DETAILS: Record<
  TierKey,
  { name: string; price: number; buttonLabel: string; badge?: string }
> = {
  bundle_all: {
    name: 'Complete Project Protection Pass (All 4 Legal Forms)',
    price: 100,
    buttonLabel: 'Secure Complete 4-Document Suite ($100)',
    badge: 'Best Value • Save $20',
  },
  notice: {
    name: 'California 20-Day Preliminary Notice Packet',
    price: 29,
    buttonLabel: 'Generate Official 3-Page Preliminary Notice ($29)',
  },
  warning: {
    name: 'Mechanics Lien Warning & 10-Day Formal Demand',
    price: 49,
    buttonLabel: 'Generate Lien Warning Demand Letter ($49)',
  },
  waivers: {
    name: 'California Statutory Lien Waiver 4-Pack',
    price: 19,
    buttonLabel: 'Generate Statutory Lien Waiver 4-Pack ($19)',
  },
  release: {
    name: 'County Recorder Mechanics Lien Release Form',
    price: 23,
    buttonLabel: 'Generate Official Lien Release Form ($23)',
  },
};

export default function NoticeForgePage() {
  const [selectedTier, setSelectedTier] = useState<TierKey>('bundle_all');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState<FormData>({
    claimantName: '',
    claimantAddress: '',
    claimantPhone: '',
    claimantEmail: '',
    directContractorName: '',
    directContractorAddress: '',
    ownerName: '',
    ownerAddress: '',
    constructionLenderName: '',
    constructionLenderAddress: '',
    jobAddress: '',
    workDescription: '',
    estimatedAmount: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tier: selectedTier,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initiate checkout session.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 text-center sm:text-left">
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">
            California Civil Code Statutory Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            ApexPath Legal Workflow Solutions
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Instant automated legal compliance and mechanics lien protection documents for contractors, subcontractors, and material suppliers.
          </p>
        </header>

        {/* Product Tier Selection */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
            1. Select Document Protection Package
          </h2>

          <div className="space-y-3">
            {/* Featured Option: The $100 Complete Bundle */}
            <div
              onClick={() => setSelectedTier('bundle_all')}
              className={`p-5 rounded-xl border cursor-pointer transition relative ${
                selectedTier === 'bundle_all'
                  ? 'border-yellow-500 bg-slate-900 shadow-lg shadow-yellow-500/10'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <span className="absolute -top-3 right-4 bg-yellow-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow">
                {TIER_DETAILS.bundle_all.badge}
              </span>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-2">
                <span className="text-base font-bold text-white">
                  Complete Project Protection Pass (All 4 Forms)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-yellow-400">$100</span>
                  <span className="text-xs text-slate-500 line-through">$120</span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Complete project lifecycle coverage: 20-Day Preliminary Notice + Pre-Lien Formal Warning Demand + California Statutory Lien Waiver 4-Pack (CC §§ 8132–8138) + Recorded County Lien Release Form.
              </p>
            </div>

            {/* Standalone Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Standalone 1: Preliminary Notice */}
              <div
                onClick={() => setSelectedTier('notice')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedTier === 'notice'
                    ? 'border-yellow-500 bg-slate-900 shadow-md shadow-yellow-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">
                    20-Day Preliminary Notice
                  </span>
                  <span className="text-base font-bold text-white">$29</span>
                </div>
                <p className="text-xs text-slate-400">
                  Required statutory compliance packet under California Civil Code §§ 8200–8216.
                </p>
              </div>

              {/* Standalone 2: Warning Demand */}
              <div
                onClick={() => setSelectedTier('warning')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedTier === 'warning'
                    ? 'border-yellow-500 bg-slate-900 shadow-md shadow-yellow-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">
                    Mechanics Lien Warning Demand
                  </span>
                  <span className="text-base font-bold text-white">$49</span>
                </div>
                <p className="text-xs text-slate-400">
                  10-Day formal pre-lien demand letter with statutory enforcement warning.
                </p>
              </div>

              {/* Standalone 3: Lien Waiver 4-Pack */}
              <div
                onClick={() => setSelectedTier('waivers')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedTier === 'waivers'
                    ? 'border-yellow-500 bg-slate-900 shadow-md shadow-yellow-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">
                    Statutory Lien Waiver 4-Pack
                  </span>
                  <span className="text-base font-bold text-white">$19</span>
                </div>
                <p className="text-xs text-slate-400">
                  Verbatim statutory conditional & unconditional progress and final waivers (CC §§ 8132–8138).
                </p>
              </div>

              {/* Standalone 4: County Release */}
              <div
                onClick={() => setSelectedTier('release')}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  selectedTier === 'release'
                    ? 'border-yellow-500 bg-slate-900 shadow-md shadow-yellow-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-white">
                    County Lien Release Form
                  </span>
                  <span className="text-base font-bold text-white">$23</span>
                </div>
                <p className="text-xs text-slate-400">
                  Official county recorder title release with California statutory notary acknowledgment block.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Input Details Form */}
        <form onSubmit={handleCheckout} className="space-y-6">
          <h2 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">
            2. Enter Required Statutory Information
          </h2>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-6">
            {/* Claimant Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Claimant Details (Your Business)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Company / Claimant Legal Name *
                  </label>
                  <input
                    type="text"
                    name="claimantName"
                    required
                    value={formData.claimantName}
                    onChange={handleChange}
                    placeholder="e.g. ApexPath Construction LLC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Claimant Email (For Document PDF Delivery) *
                  </label>
                  <input
                    type="email"
                    name="claimantEmail"
                    required
                    value={formData.claimantEmail}
                    onChange={handleChange}
                    placeholder="billing@yourcompany.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Claimant Phone *
                  </label>
                  <input
                    type="tel"
                    name="claimantPhone"
                    required
                    value={formData.claimantPhone}
                    onChange={handleChange}
                    placeholder="(555) 000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Claimant Full Address *
                  </label>
                  <input
                    type="text"
                    name="claimantAddress"
                    required
                    value={formData.claimantAddress}
                    onChange={handleChange}
                    placeholder="Street, City, State, ZIP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Direct Contractor & Property Owner */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Project Parties
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Direct Contractor / General Contractor Name *
                  </label>
                  <input
                    type="text"
                    name="directContractorName"
                    required
                    value={formData.directContractorName}
                    onChange={handleChange}
                    placeholder="General Contractor LLC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Direct Contractor Address *
                  </label>
                  <input
                    type="text"
                    name="directContractorAddress"
                    required
                    value={formData.directContractorAddress}
                    onChange={handleChange}
                    placeholder="Contractor Office Address"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Property Owner Name *
                  </label>
                  <input
                    type="text"
                    name="ownerName"
                    required
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="Recorded Property Owner"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Property Owner Address *
                  </label>
                  <input
                    type="text"
                    name="ownerAddress"
                    required
                    value={formData.ownerAddress}
                    onChange={handleChange}
                    placeholder="Owner Address or Tax Mailing Address"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Construction Lender Name (If Any)
                  </label>
                  <input
                    type="text"
                    name="constructionLenderName"
                    value={formData.constructionLenderName}
                    onChange={handleChange}
                    placeholder="Bank / Lender Name (or None)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Construction Lender Address (If Any)
                  </label>
                  <input
                    type="text"
                    name="constructionLenderAddress"
                    value={formData.constructionLenderAddress}
                    onChange={handleChange}
                    placeholder="Lender Address (or None)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Job Site & Claim Amount */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Jobsite & Work Specifications
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Jobsite Physical Address / Legal Description *
                  </label>
                  <input
                    type="text"
                    name="jobAddress"
                    required
                    value={formData.jobAddress}
                    onChange={handleChange}
                    placeholder="123 Construction Way, Los Angeles, CA 90001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Estimated Contract / Work Value ($) *
                    </label>
                    <input
                      type="text"
                      name="estimatedAmount"
                      required
                      value={formData.estimatedAmount}
                      onChange={handleChange}
                      placeholder="e.g. 24,500.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Description of Labor, Services, or Materials *
                    </label>
                    <textarea
                      name="workDescription"
                      required
                      rows={2}
                      value={formData.workDescription}
                      onChange={handleChange}
                      placeholder="e.g. Rough framing, structural carpentry, and supply of related hardware"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Submission Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-black text-sm uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
          >
            {loading ? 'Processing Checkout...' : TIER_DETAILS[selectedTier].buttonLabel}
          </button>

          <p className="text-center text-xs text-slate-500">
            Secure 256-bit Stripe checkout. Generated documents are delivered via PDF to your inbox immediately upon completion.
          </p>
        </form>
      </div>
    </main>
  );
}