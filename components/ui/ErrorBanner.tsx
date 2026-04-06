import { AlertCircle } from "lucide-react";

interface Props {
  message: string;
  className?: string;
}

export default function ErrorBanner({ message, className = "" }: Props) {
  return (
    <div className={`flex items-start gap-2 bg-red-900/20 border border-red-800/50 rounded-2xl p-4 ${className}`}>
      <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}
