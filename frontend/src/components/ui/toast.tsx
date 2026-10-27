import { useEffect } from "react";
import { Check, X } from "lucide-react";


export function Toast({
  message,
  onClose,
  onUndo,
}: {
  message: string;
  onClose: () => void;
  onUndo?: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(id);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg">
      <Check className="h-4 w-4 text-emerald-600" />
      <span>{message}</span>
      {onUndo && (
        <button
          className="ml-2 font-semibold text-primary underline"
          onClick={onUndo}
        >
          Desfazer
        </button>
      )}
      <button className="ml-2 text-muted-foreground" onClick={onClose}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
