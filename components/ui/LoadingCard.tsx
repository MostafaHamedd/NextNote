import { Loader2 } from "lucide-react";

interface Props {
  message: string;
  hint?: string;
}

export default function LoadingCard({ message, hint }: Props) {
  return (
    <div className="mt-6 bg-surface-2 rounded-2xl p-6 border border-surface-border text-center">
      <Loader2 size={28} className="animate-spin text-brand-400 mx-auto mb-3" />
      <p className="font-semibold text-gray-200">{message}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
