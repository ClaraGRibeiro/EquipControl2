import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownToLine, FileText, LoaderCircle } from "lucide-react";
import type { InventoryController } from "@/hooks/use-inventory";

export function ProjectReportDialog({ store }: { store: InventoryController }) {
  const {
    items,
    reportDialogOpen,
    setReportDialogOpen,
    reportProject,
    setReportProject,
    reportProjects,
    generateProjectReport,
    generating,
  } = store;

  return (

    <Dialog
      open={reportDialogOpen}
      onOpenChange={(open) => {
        if (!generating) setReportDialogOpen(open);
      }}
    >
      <DialogContent className="max-w-md">
        <div>
          <DialogTitle className="text-xl font-bold">
            Gerar relatório PDF
          </DialogTitle>

          <DialogDescription className="mt-1">
            Escolha um projeto para gerar o relatório ou selecione todos para
            incluir o inventário completo.
          </DialogDescription>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Projeto / fonte do recurso
          </label>

          <Select
            value={reportProject}
            onValueChange={setReportProject}
            disabled={generating}
          >
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

        <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {reportProject === "__todos__"
              ? "Inventário completo"
              : reportProject}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {
              items.filter(
                (item) =>
                  reportProject === "__todos__" ||
                  ((item.project || "").trim() || "Sem projeto") ===
                    reportProject,
              ).length
            }{" "}
            registro(s) serão incluídos no PDF.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setReportDialogOpen(false)}
            disabled={generating}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => void generateProjectReport()}
            disabled={generating || items.length === 0}
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}

            {generating ? "Gerando PDF..." : "Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
