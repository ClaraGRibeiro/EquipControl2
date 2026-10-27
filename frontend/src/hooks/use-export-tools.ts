import { useMemo, useState } from "react";
import { downloadEquipmentsExcel } from "@/lib/excel-export";
import { listProjects, selectByProject } from "@/lib/filters";
import { generateProjectReportPdf } from "@/lib/project-report";
import type { Equipment } from "@/lib/types";

type ExportOptions = {
  items: Equipment[];
  notify: (message: string) => void;
  generating: boolean;
  setGenerating: (busy: boolean) => void;
};

// Exportações: PDF do inventário por projeto e planilha Excel.
export function useExportTools({
  items,
  notify,
  generating,
  setGenerating,
}: ExportOptions) {
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportProject, setReportProject] = useState("__todos__");
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [excelProject, setExcelProject] = useState("__todos__");

  const reportProjects = useMemo(() => listProjects(items), [items]);

  function exportProjectReport() {
    if (!items.length) {
      notify("Não há registros para gerar o relatório.");
      return;
    }

    // Abre a janela para escolher o projeto antes de gerar o PDF.
    setReportProject("__todos__");
    setReportDialogOpen(true);
  }

  async function generateProjectReport() {
    const selectedItems = selectByProject(items, reportProject);

    if (!selectedItems.length) {
      notify("Não há equipamentos para o projeto selecionado.");
      return;
    }

    setGenerating(true);

    try {
      await generateProjectReportPdf({ selectedItems, reportProject });
      setReportDialogOpen(false);
      notify("PDF do inventário gerado.");
    } catch (e) {
      notify(`Não foi possível gerar o PDF: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  function exportExcel() {
    if (!items.length) {
      notify("Não há registros para exportar.");
      return;
    }

    setExcelProject("__todos__");
    setExcelDialogOpen(true);
  }

  function generateExcel() {
    const selectedItems = selectByProject(items, excelProject);

    if (!selectedItems.length) {
      notify("Não há equipamentos para o projeto selecionado.");
      return;
    }

    try {
      downloadEquipmentsExcel({ selectedItems, excelProject });
      setExcelDialogOpen(false);
      notify("Planilha Excel baixada.");
    } catch (e) {
      notify(`Não foi possível gerar o Excel: ${(e as Error).message}`);
    }
  }

  return {
    reportDialogOpen,
    setReportDialogOpen,
    reportProject,
    setReportProject,
    reportProjects,
    exportProjectReport,
    generateProjectReport,
    excelDialogOpen,
    setExcelDialogOpen,
    excelProject,
    setExcelProject,
    exportExcel,
    generateExcel,
  };
}
