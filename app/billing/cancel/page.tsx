"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export default function BillingCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-black/40">
        <div className="w-16 h-16 bg-surface-3 border border-surface-border rounded-full flex items-center justify-center mx-auto mb-6">
          <X size={28} className="text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment cancelled</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          No charge was made. You can upgrade anytime when you&apos;re ready.
        </p>
        <button
          onClick={() => router.push("/pricing")}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          View Plans
        </button>
      </div>
    </div>
  );
}
