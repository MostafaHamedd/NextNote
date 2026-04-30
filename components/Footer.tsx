import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-1 px-6 py-8 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={11} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">NextNote</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
          <Link href="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
        </div>

        {/* Watermark */}
        <p className="text-xs text-gray-600">
          Developed by{" "}
          <span className="text-gray-400 font-medium">Mostafa Hamed</span>
        </p>
      </div>
    </footer>
  );
}
