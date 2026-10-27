import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export function UndoDeleteBanner({
  visible,
  onUndo,
  onDismiss,
}: {
  visible: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <>

      <div className="fixed bottom-5 right-5 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg">
        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>Registro excluído.</span>
        <Button size="sm" variant="outline" onClick={onUndo}>
          Desfazer
        </Button>
        <button aria-label="Fechar" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
