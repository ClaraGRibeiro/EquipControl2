import * as XLSX from "xlsx";
import type { Equipment } from "./types";

export function downloadEquipmentsExcel({
  selectedItems,
  excelProject,
}: {
  selectedItems: Equipment[];
  excelProject: string;
}) {
  const rows = selectedItems.map((i) => ({
    Patrimônio: i.patrimonio || "",
    Equipamento: i.name,
    Departamento: i.department,
    "Projeto / fonte do recurso": i.project || "Não informado",
    Responsável: i.responsavel || "",
    "Valor unitário": Number(i.value) || 0,
    Quantidade: Number(i.quantity) || 1,
    Status: i.status,
    PDF: i.term
      ? new URL(i.term, window.location.origin).href
      : "Não anexado",
    Imagem: i.image
      ? new URL(i.image, window.location.origin).href
      : "Sem imagem",
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);

  sheet["!cols"] = [
    { wch: 20 },
    { wch: 32 },
    { wch: 20 },
    { wch: 28 },
    { wch: 25 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 45 },
    { wch: 45 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Equipamentos");

  const date = new Date().toISOString().slice(0, 10);

  const safeProject = excelProject
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const filename =
    excelProject === "__todos__"
      ? `equipamentos-todos-os-projetos-${date}.xlsx`
      : `equipamentos-${safeProject || "projeto"}-${date}.xlsx`;

  XLSX.writeFile(book, filename);
}
