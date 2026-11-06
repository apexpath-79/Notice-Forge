import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Your statutory documents have been queued for processing. Check your inbox—your completed PDF packet will arrive shortly.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left text-xs text-slate-400 mb-6 space-y-2">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="text-emerald-400 font-semibold">Payment Verified</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery:</span>
            <span className="text-slate-200">Email Attachment (PDF)</span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-block w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-sm rounded-lg transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}