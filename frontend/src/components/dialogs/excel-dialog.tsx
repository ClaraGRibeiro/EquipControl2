import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine } from "lucide-react";
import type { InventoryController } from "@/hooks/use-inventory";

export function ExcelDialog({ store }: { store: InventoryController }) {
  const {
    items,
    reportProjects,
    excelDialogOpen,
    setExcelDialogOpen,
    excelProject,
    setExcelProject,
    generateExcel,
  } = store;

  return (

    <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
      <DialogContent className="max-w-md">
        <div>
          <DialogTitle className="text-xl font-bold">
            Exportar dados para Excel
          </DialogTitle>

          <DialogDescription className="mt-1">
            Escolha um projeto específico ou selecione todos para exportar o
            inventário completo.
          </DialogDescription>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700">
            Projeto / fonte do recurso
          </label>

          <Select value={excelProject} onValueChange={setExcelProject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o projeto" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__todos__">Todos os projetos</SelectItem>

              {reportProjects.map((project) => (
                <SelectItem key={project} value={project} textValue={project}>
                  <span
                    className="block max-w-[300px] truncate"
                    title={project}
                  >
                    {project}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            {excelProject === "__todos__"
              ? "Inventário completo"
              : excelProject}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {
              items.filter(
                (item) =>
                  excelProject === "__todos__" ||
                  ((item.project || "").trim() || "Sem projeto") ===
                    excelProject,
              ).length
            }{" "}
            registro(s) serão incluídos na planilha Excel.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExcelDialogOpen(false)}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={generateExcel}
            disabled={items.length === 0}
          >
            <ArrowDownToLine className="h-4 w-4" />
            Gerar Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
