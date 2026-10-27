import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoaderCircle } from "lucide-react";
import type { InventoryController } from "@/hooks/use-inventory";

export function DeleteConfirmDialog({ store }: { store: InventoryController }) {
  const {
    selected,
    deleteOpen,
    setDeleteOpen,
    saving,
    deleteSelected,
  } = store;

  return (

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-lg">Excluir equipamento(s)?</DialogTitle>
        <DialogDescription>
          Esta ação remove os registros selecionados e envia os arquivos
          associados para a lixeira do servidor. Você pode desfazer em até 3
          segundos; depois disso, os PDFs e imagens são apagados em definitivo.
        </DialogDescription>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteSelected()}
            disabled={saving}
            className="text-white"
          >
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Excluir{" "}
            {selected.length > 1 ? `${selected.length} itens` : "equipamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
