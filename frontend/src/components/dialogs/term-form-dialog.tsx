import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FilePlus2, FileText, LoaderCircle, X } from "lucide-react";
import { termFields } from "@/lib/constants";
import type { InventoryController } from "@/hooks/use-inventory";

export function TermFormDialog({ store }: { store: InventoryController }) {
  const {
    form,
    termItem,
    setTermItem,
    termValues,
    setTermField,
    generateTerm,
    generating,
  } = store;

  return (

    <Dialog
      open={Boolean(termItem)}
      onOpenChange={(open) => {
        if (!open) setTermItem(null);
      }}
    >
      <DialogContent>
        <div>
          <DialogTitle className="text-xl font-bold">
            Gerar termo de responsabilidade
          </DialogTitle>
          <DialogDescription className="mt-1">
            Todos os campos abaixo são obrigatórios. O PDF gerado será anexado
            ao equipamento: {termItem?.name}.
          </DialogDescription>
          {termItem?.responsavel && (
            <p className="mt-1 text-xs text-muted-foreground">
              Responsável já preenchido a partir do cadastro:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {termItem.responsavel}
              </span>
              .
            </p>
          )}
        </div>
        <form onSubmit={generateTerm} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {termFields.map(([key, label, type]) => (
              <Field key={key} label={label} required>
                <Input
                  type={type}
                  required
                  value={termValues[key]}
                  onChange={(e) => setTermField(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            O termo gerado usa um modelo predefinido como base. Confira os
            dados e o documento antes de coletar assinaturas.
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTermItem(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={generating}>
              {generating && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              <FilePlus2 className="h-4 w-4" /> Gerar PDF
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
